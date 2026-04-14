type ExpoPushMessage = {
  to: string
  sound?: 'default'
  title?: string
  body?: string
  data?: Record<string, unknown>
}

type ExpoPushTicket = {
  status: 'ok' | 'error'
  message?: string
  details?: Record<string, unknown>
}

export default class Expo {
  constructor(_options?: { accessToken?: string }) {}

  static isExpoPushToken(pushToken: string): boolean {
    return pushToken.startsWith('ExponentPushToken[')
  }

  chunkPushNotifications(messages: ExpoPushMessage[]): ExpoPushMessage[][] {
    return [messages]
  }

  async sendPushNotificationsAsync(
    chunk: ExpoPushMessage[],
  ): Promise<ExpoPushTicket[]> {
    return chunk.map(() => ({ status: 'ok' }))
  }
}