import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../prisma/prisma.service'
import { createHmac, randomBytes, timingSafeEqual } from 'crypto'

interface GoogleOAuthStatePayload {
  userId: string
  nonce: string
  exp: number
}

interface GoogleTokenResponse {
  access_token: string
  refresh_token?: string
  expires_in: number
  token_type: string
  scope: string
}

interface GoogleCalendarEvent {
  summary: string
  description?: string
  location?: string
  start: { dateTime: string; timeZone: string }
  end: { dateTime: string; timeZone: string }
  attendees?: { email: string; displayName?: string }[]
}

interface GoogleFreeBusyResponse {
  calendars: Record<string, { busy: { start: string; end: string }[] }>
}

@Injectable()
export class GoogleCalendarService {
  private readonly logger = new Logger(GoogleCalendarService.name)
  private readonly stateSecret: string | null

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.stateSecret = this.config.get<string>('GOOGLE_OAUTH_STATE_SECRET') ?? null
  }

  private getStateSecret(): string {
    if (!this.stateSecret) {
      throw new BadRequestException('Google Calendar integration is not configured on this server')
    }
    return this.stateSecret
  }

  private async fetchWithTimeout(
    input: string,
    init: RequestInit,
    timeoutMs = 10_000,
  ): Promise<Response> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), timeoutMs)
    try {
      return await fetch(input, { ...init, signal: controller.signal })
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new BadRequestException('Google request timed out')
      }
      throw error
    } finally {
      clearTimeout(timeout)
    }
  }

  private get clientId(): string {
    return this.config.getOrThrow<string>('GOOGLE_OAUTH_CLIENT_ID')
  }

  private get clientSecret(): string {
    return this.config.getOrThrow<string>('GOOGLE_OAUTH_CLIENT_SECRET')
  }

  private get redirectUri(): string {
    const apiUrl = this.config.getOrThrow<string>('API_URL')
    return `${apiUrl}/scheduling/google/callback`
  }

  /** Build the Google OAuth2 authorization URL */
  getAuthUrl(userId: string): string {
    this.getStateSecret()
    const payload: GoogleOAuthStatePayload = {
      userId,
      nonce: randomBytes(16).toString('hex'),
      exp: Date.now() + 10 * 60 * 1000,
    }
    const state = this.signState(payload)
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: [
        'https://www.googleapis.com/auth/calendar.events',
        'https://www.googleapis.com/auth/calendar.freebusy',
        'email',
        'profile',
      ].join(' '),
      access_type: 'offline',
      prompt: 'consent',
      state,
    })
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  }

  private signState(payload: GoogleOAuthStatePayload): string {
    const secret = this.getStateSecret()
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
    const sig = createHmac('sha256', secret).update(body).digest('base64url')
    return `${body}.${sig}`
  }

  verifyState(state: string): string {
    const secret = this.getStateSecret()
    const [body, sig] = state.split('.')
    if (!body || !sig) throw new BadRequestException('Invalid Google OAuth state')

    const expectedSig = createHmac('sha256', secret).update(body).digest('base64url')
    const sigBuf = Buffer.from(sig)
    const expectedSigBuf = Buffer.from(expectedSig)
    if (sigBuf.length !== expectedSigBuf.length) {
      throw new BadRequestException('Invalid Google OAuth state')
    }
    if (!timingSafeEqual(sigBuf, expectedSigBuf)) {
      throw new BadRequestException('Invalid Google OAuth state')
    }

    const payload = JSON.parse(Buffer.from(body, 'base64url').toString()) as GoogleOAuthStatePayload
    if (!payload.userId || payload.exp < Date.now()) {
      throw new BadRequestException('Google OAuth state has expired')
    }

    return payload.userId
  }

  /** Exchange authorization code for tokens */
  async exchangeCode(code: string): Promise<GoogleTokenResponse> {
    const resp = await this.fetchWithTimeout('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: this.redirectUri,
        grant_type: 'authorization_code',
      }).toString(),
    })
    if (!resp.ok) {
      const err = await resp.text()
      this.logger.error(`Token exchange failed: ${err}`)
      throw new BadRequestException('Failed to exchange Google authorization code')
    }
    return resp.json() as Promise<GoogleTokenResponse>
  }

  /** Get Google account email from access token */
  async getGoogleEmail(accessToken: string): Promise<string> {
    const resp = await this.fetchWithTimeout('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!resp.ok) throw new BadRequestException('Failed to fetch Google user info')
    const info = (await resp.json()) as { email: string }
    return info.email
  }

  /** Store or update the user's Google Calendar connection */
  async saveConnection(
    userId: string,
    tokens: GoogleTokenResponse,
    googleEmail: string,
  ): Promise<void> {
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000)
    const existing = await this.prisma.googleCalendarConnection.findUnique({
      where: { userId },
    })
    if (existing) {
      await this.prisma.googleCalendarConnection.update({
        where: { userId },
        data: {
          googleEmail,
          accessToken: tokens.access_token,
          ...(tokens.refresh_token && { refreshToken: tokens.refresh_token }),
          expiresAt,
        },
      })
    } else {
      if (!tokens.refresh_token) {
        throw new BadRequestException('No refresh token received. Please disconnect and reconnect.')
      }
      await this.prisma.googleCalendarConnection.create({
        data: {
          userId,
          googleEmail,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          expiresAt,
        },
      })
    }
  }

  /** Disconnect Google Calendar for a user */
  async disconnect(userId: string): Promise<void> {
    await this.prisma.googleCalendarConnection.deleteMany({ where: { userId } })
  }

  /** Get connection status for a user (no tokens exposed) */
  async getConnectionStatus(userId: string): Promise<{ connected: boolean; googleEmail?: string }> {
    const conn = await this.prisma.googleCalendarConnection.findUnique({
      where: { userId },
      select: { googleEmail: true },
    })
    return conn ? { connected: true, googleEmail: conn.googleEmail } : { connected: false }
  }

  /** Refresh access token using stored refresh token */
  private async refreshAccessToken(userId: string): Promise<string> {
    const conn = await this.prisma.googleCalendarConnection.findUnique({ where: { userId } })
    if (!conn) throw new NotFoundException('No Google Calendar connection found')

    const resp = await this.fetchWithTimeout('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: conn.refreshToken,
        grant_type: 'refresh_token',
      }).toString(),
    })
    if (!resp.ok) {
      this.logger.error(`Token refresh failed for user ${userId}`)
      throw new BadRequestException('Failed to refresh Google access token. Please reconnect.')
    }
    const tokens = (await resp.json()) as GoogleTokenResponse
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000)
    await this.prisma.googleCalendarConnection.update({
      where: { userId },
      data: { accessToken: tokens.access_token, expiresAt },
    })
    return tokens.access_token
  }

  /** Get a valid access token, refreshing if needed */
  private async getValidAccessToken(userId: string): Promise<string> {
    const conn = await this.prisma.googleCalendarConnection.findUnique({ where: { userId } })
    if (!conn) throw new NotFoundException('No Google Calendar connection found')

    // Refresh 2 minutes before expiry to avoid race conditions
    const bufferMs = 2 * 60 * 1000
    if (conn.expiresAt.getTime() - Date.now() < bufferMs) {
      return this.refreshAccessToken(userId)
    }
    return conn.accessToken
  }

  /**
   * Create a Google Calendar event for a booking.
   * Returns the event ID to be stored with the booking.
   */
  async createEvent(userId: string, event: GoogleCalendarEvent): Promise<string | null> {
    try {
      const conn = await this.prisma.googleCalendarConnection.findUnique({ where: { userId } })
      if (!conn) return null

      const accessToken = await this.getValidAccessToken(userId)
      const calendarId = encodeURIComponent(conn.calendarId)

      const resp = await this.fetchWithTimeout(
        `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...event,
            reminders: { useDefault: true },
          }),
        },
      )
      if (!resp.ok) {
        const err = await resp.text()
        this.logger.error(`Create event failed for user ${userId}: ${err}`)
        return null
      }
      const created = (await resp.json()) as { id: string }
      return created.id
    } catch (err) {
      this.logger.error(
        `createEvent error for user ${userId}: ${err instanceof Error ? err.message : String(err)}`,
      )
      return null
    }
  }

  /**
   * Delete a Google Calendar event (on booking cancellation).
   * Silently ignores errors — calendar deletion is best-effort.
   */
  async deleteEvent(userId: string, eventId: string): Promise<void> {
    try {
      const conn = await this.prisma.googleCalendarConnection.findUnique({ where: { userId } })
      if (!conn) return

      const accessToken = await this.getValidAccessToken(userId)
      const calendarId = encodeURIComponent(conn.calendarId)

      await this.fetchWithTimeout(
        `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${eventId}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      )
    } catch (err) {
      this.logger.error(`deleteEvent error: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  /**
   * Update a Google Calendar event (on booking reschedule).
   */
  async updateEvent(
    userId: string,
    eventId: string,
    event: Partial<GoogleCalendarEvent>,
  ): Promise<void> {
    try {
      const conn = await this.prisma.googleCalendarConnection.findUnique({ where: { userId } })
      if (!conn) return

      const accessToken = await this.getValidAccessToken(userId)
      const calendarId = encodeURIComponent(conn.calendarId)

      await this.fetchWithTimeout(
        `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${eventId}`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(event),
        },
      )
    } catch (err) {
      this.logger.error(`updateEvent error: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  /**
   * Fetch busy time blocks from Google Calendar for a given time range.
   * Used to block slots that conflict with existing Google Calendar events.
   */
  async getBusyTimes(
    userId: string,
    timeMin: Date,
    timeMax: Date,
  ): Promise<{ start: Date; end: Date }[]> {
    try {
      const conn = await this.prisma.googleCalendarConnection.findUnique({ where: { userId } })
      if (!conn) return []

      const accessToken = await this.getValidAccessToken(userId)

      const resp = await this.fetchWithTimeout('https://www.googleapis.com/calendar/v3/freeBusy', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          timeMin: timeMin.toISOString(),
          timeMax: timeMax.toISOString(),
          items: [{ id: conn.calendarId }],
        }),
      })

      if (!resp.ok) {
        this.logger.error(`freeBusy failed for user ${userId}: ${await resp.text()}`)
        return []
      }

      const data = (await resp.json()) as GoogleFreeBusyResponse
      const calBusy = data.calendars[conn.calendarId]?.busy ?? []
      return calBusy.map((b) => ({ start: new Date(b.start), end: new Date(b.end) }))
    } catch (err) {
      this.logger.error(`getBusyTimes error: ${err instanceof Error ? err.message : String(err)}`)
      return []
    }
  }
}
