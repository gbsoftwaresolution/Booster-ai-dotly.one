import { Processor, Process } from '@nestjs/bull'
import { Logger } from '@nestjs/common'
import { Job } from 'bull'
import { PrismaService } from '../prisma/prisma.service'
import { AiService } from './ai.service'
import { WebhooksService } from '../webhooks/webhooks.service'

interface EnrichmentJobData {
  contactId: string
}

@Processor('contact-enrichment')
export class ContactEnrichmentProcessor {
  private readonly logger = new Logger(ContactEnrichmentProcessor.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
    private readonly webhooksService: WebhooksService,
  ) {}

  @Process('enrich')
  async handleEnrichment(job: Job<EnrichmentJobData>) {
    const { contactId } = job.data
    this.logger.log(`Enriching contact ${contactId}`)

    const contact = await this.prisma.contact.findUnique({ where: { id: contactId } })
    if (!contact) {
      this.logger.warn(`Contact ${contactId} not found — skipping enrichment`)
      return
    }

    const result = await this.aiService.enrichContact({
      name: contact.name,
      email: contact.email,
      company: contact.company,
      title: contact.title,
      notes: contact.notes,
    })

    await this.prisma.contact.update({
      where: { id: contactId },
      data: {
        inferredIndustry: result.inferredIndustry,
        inferredCompanySize: result.inferredCompanySize,
        inferredSeniority: result.inferredSeniority,
        // M-06: Only store a LinkedIn URL if it starts with the canonical
        // linkedin.com prefix. GPT can hallucinate arbitrary URLs; storing
        // them could enable open redirects or stored XSS via the UI.
        inferredLinkedIn: result.inferredLinkedIn?.startsWith('https://www.linkedin.com/')
          ? result.inferredLinkedIn
          : null,
        enrichmentScore: result.enrichmentScore,
        enrichmentSummary: result.summary,
        enrichedAt: new Date(),
      },
    })

    this.logger.log(`Contact ${contactId} enriched (score: ${result.enrichmentScore})`)

    // Fire-and-forget webhook fan-out for contact.enriched
    void this.webhooksService
      .fanOut(contact.ownerUserId, 'contact.enriched', {
        contactId,
        name: contact.name,
        email: contact.email ?? null,
        enrichmentScore: result.enrichmentScore,
        inferredIndustry: result.inferredIndustry ?? null,
        inferredSeniority: result.inferredSeniority ?? null,
      })
      .catch((err: unknown) => this.logger.warn('Webhook fan-out failed (contact.enriched)', err))
  }
}
