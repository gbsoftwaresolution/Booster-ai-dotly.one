import { Injectable } from '@nestjs/common'
import { ThrottlerGuard } from '@nestjs/throttler'
import type { ExecutionContext } from '@nestjs/common'

/**
 * UserIdThrottlerGuard
 *
 * Keys the throttle bucket by the authenticated user's database ID instead of
 * the client IP address.  This is important for AI/expensive endpoints where:
 *   1. The API runs behind a load balancer — req.ip would be the LB's IP,
 *      collapsing all users into a single bucket (even with trust proxy set).
 *   2. A user behind a corporate NAT could share an IP with many others and
 *      hit the limit for work unrelated to them.
 *
 * Falls back to the default IP-based key when the request is not yet
 * authenticated (e.g. during the JWT validation phase).
 */
@Injectable()
export class UserIdThrottlerGuard extends ThrottlerGuard {
  protected override async getTracker(req: Record<string, unknown>): Promise<string> {
    const user = req['user'] as { id?: string } | undefined
    if (user?.id) {
      return `user:${user.id}`
    }
    // Fallback: use IP (inherited behaviour)
    return super.getTracker(req)
  }

  protected override getRequestResponse(context: ExecutionContext) {
    const http = context.switchToHttp()
    return { req: http.getRequest<Record<string, unknown>>(), res: http.getResponse() }
  }
}
