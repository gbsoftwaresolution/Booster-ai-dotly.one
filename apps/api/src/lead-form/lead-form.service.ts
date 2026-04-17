import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { Prisma } from '@dotly/database'

export interface LeadFieldInput {
  label: string
  fieldType: 'TEXT' | 'EMAIL' | 'PHONE' | 'URL' | 'TEXTAREA' | 'SELECT'
  placeholder?: string
  required?: boolean
  displayOrder?: number
  options?: string[]
}

export interface UpsertLeadFormDto {
  title?: string
  description?: string
  buttonText?: string
  fields?: LeadFieldInput[]
}

@Injectable()
export class LeadFormService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Ownership guard ─────────────────────────────────────────────────────────

  private async assertCardOwner(cardId: string, userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true } })
    if (!user) throw new ForbiddenException('User not found')

    const card = await this.prisma.card.findUnique({
      where: { id: cardId },
      select: { userId: true },
    })
    if (!card) throw new NotFoundException('Card not found')
    if (card.userId !== user.id) throw new ForbiddenException('Access denied')
  }

  // ─── Public: get form schema for a card (called from public card page) ───────

  async getPublicForm(cardId: string) {
    const form = await this.prisma.leadForm.findUnique({
      where: { cardId },
      include: { fields: { orderBy: { displayOrder: 'asc' } } },
    })
    // If no custom form configured, return the default 3-field schema
    if (!form) return this.defaultForm()
    return form
  }

  async getPublicFormByHandle(handle: string) {
    const card = await this.prisma.card.findUnique({
      where: { handle, isActive: true },
      select: { id: true },
    })
    if (!card) throw new NotFoundException('Card not found')
    return this.getPublicForm(card.id)
  }

  private defaultForm() {
    return {
      id: null,
      cardId: null,
      title: 'Connect with me',
      description: "Leave your details and they'll be in touch.",
      buttonText: 'Connect',
      fields: [
        {
          id: 'default-name',
          label: 'Name',
          fieldType: 'TEXT',
          placeholder: 'Your full name',
          required: true,
          displayOrder: 0,
          options: [],
        },
        {
          id: 'default-email',
          label: 'Email',
          fieldType: 'EMAIL',
          placeholder: 'your@email.com',
          required: false,
          displayOrder: 1,
          options: [],
        },
        {
          id: 'default-phone',
          label: 'Phone',
          fieldType: 'PHONE',
          placeholder: '+1 (555) 000-0000',
          required: false,
          displayOrder: 2,
          options: [],
        },
      ],
    }
  }

  // ─── Authenticated: get/upsert form for card owner ───────────────────────────

  async getForm(cardId: string, userId: string) {
    await this.assertCardOwner(cardId, userId)
    const form = await this.prisma.leadForm.findUnique({
      where: { cardId },
      include: { fields: { orderBy: { displayOrder: 'asc' } } },
    })
    return form ?? this.defaultForm()
  }

  async upsertForm(cardId: string, userId: string, dto: UpsertLeadFormDto) {
    await this.assertCardOwner(cardId, userId)

    if (dto.fields !== undefined) {
      if (dto.fields.length > 20) {
        throw new BadRequestException('A lead form may have at most 20 fields')
      }
      for (const f of dto.fields) {
        if (!f.label?.trim())
          throw new BadRequestException('Each field must have a non-empty label')
        if (f.fieldType === 'SELECT' && (!f.options || f.options.length === 0)) {
          throw new BadRequestException(`SELECT field "${f.label}" must have at least one option`)
        }
      }
    }

    // Upsert the LeadForm header
    const form = await this.prisma.leadForm.upsert({
      where: { cardId },
      create: {
        cardId,
        title: dto.title ?? 'Connect with me',
        description: dto.description ?? "Leave your details and they'll be in touch.",
        buttonText: dto.buttonText ?? 'Connect',
      },
      update: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.buttonText !== undefined && { buttonText: dto.buttonText }),
      },
    })

    // If fields were provided, replace them atomically
    if (dto.fields !== undefined) {
      await this.prisma.$transaction(async (tx) => {
        await tx.leadField.deleteMany({ where: { leadFormId: form.id } })
        if (dto.fields!.length > 0) {
          await tx.leadField.createMany({
            data: dto.fields!.map((f, i) => ({
              leadFormId: form.id,
              label: f.label,
              fieldType: f.fieldType,
              placeholder: f.placeholder ?? null,
              required: f.required ?? false,
              displayOrder: f.displayOrder ?? i,
              options: (f.options ?? []) as Prisma.InputJsonValue,
            })),
          })
        }
      })
    }

    return this.prisma.leadForm.findUnique({
      where: { cardId },
      include: { fields: { orderBy: { displayOrder: 'asc' } } },
    })
  }

  async resetForm(cardId: string, userId: string) {
    await this.assertCardOwner(cardId, userId)
    const existing = await this.prisma.leadForm.findUnique({ where: { cardId } })
    if (existing) {
      await this.prisma.leadForm.delete({ where: { cardId } })
    }
    return this.defaultForm()
  }
}
