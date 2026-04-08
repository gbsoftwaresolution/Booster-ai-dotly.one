import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import Expo from 'expo-server-sdk'

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name)
  private expo: Expo

  constructor(private readonly config: ConfigService) {
    // F-24: Initialise the Expo SDK with an accessToken when available.
    // Without the token, push notification requests are unauthenticated and
    // Expo may throttle or reject them at higher volumes.  The token is
    // optional (Expo works without it in development) so we log a warning
    // rather than failing hard when it's absent.
    const accessToken = this.config.get<string>('EXPO_ACCESS_TOKEN')
    if (!accessToken) {
      this.logger.warn('EXPO_ACCESS_TOKEN not set — push notifications will be unauthenticated')
    }
    this.expo = new Expo({ accessToken })
    // NOTE (F-24): Push tokens are stored as plaintext in the `user.pushToken`
    // DB column. This is standard practice for Expo push tokens because they
    // are non-secret bearer tokens issued per device-app pair. They should
    // NOT be treated like passwords (no hashing needed), but access to the
    // column should be restricted at the DB level (row-level security or
    // dedicated service account) to limit blast radius if the DB is breached.
  }

  async sendPushNotification(
    pushToken: string,
    title: string,
    body: string,
    data?: Record<string, unknown>,
  ): Promise<void> {
    if (!Expo.isExpoPushToken(pushToken)) return

    const messages = [
      {
        to: pushToken,
        sound: 'default' as const,
        title,
        body,
        data: data ?? {},
      },
    ]

    const chunks = this.expo.chunkPushNotifications(messages)
    for (const chunk of chunks) {
      try {
        // M-8: Inspect the returned ticket array for error tickets.
        // sendPushNotificationsAsync returns PushTicket[] — a successful HTTP
        // round-trip does NOT mean the notification was delivered.  Each ticket
        // has status 'ok' or 'error'.  We log error tickets so operators can
        // detect invalid/expired tokens and revocation events.
        const tickets = await this.expo.sendPushNotificationsAsync(chunk)
        for (const ticket of tickets) {
          if (ticket.status === 'error') {
            this.logger.error(
              `Push notification ticket error: ${ticket.message ?? 'unknown'}`,
              ticket.details,
            )
          }
        }
      } catch (error) {
        this.logger.error('Push notification error', error)
      }
    }
  }
}
