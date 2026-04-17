import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class SalesLinkService {
  constructor(private readonly prisma: PrismaService) {}

  async getPublicProfile(username: string) {
    return this.prisma.user.findUnique({
      where: { username },
      select: {
        name: true,
        pitch: true,
        phone: true,
      },
    })
  }

  async trackClick(action: 'whatsapp' | 'booking' | 'payment') {
    return this.prisma.clickEvent.create({
      data: { action },
    })
  }
}
