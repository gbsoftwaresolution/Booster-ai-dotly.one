import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common'
import { Observable } from 'rxjs'
import { tap } from 'rxjs/operators'
import type { Request, Response } from 'express'
import { getRequestContext, updateRequestContext } from './request-context'
import { ObservabilityService } from './observability.service'

type RequestWithUser = Request & {
  user?: {
    sub?: string
    id?: string
  }
}

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RequestLoggingInterceptor.name)

  constructor(private readonly observability: ObservabilityService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const startedAt = process.hrtime.bigint()
    const request = context.switchToHttp().getRequest<RequestWithUser>()
    const response = context.switchToHttp().getResponse<Response>()
    const route = request.route?.path ?? request.path
    const userId = request.user?.sub ?? request.user?.id ?? null
    const requestId = getRequestContext()?.requestId ?? response.getHeader('x-request-id')

    updateRequestContext({ route, userId })
    this.observability.recordRequestLog('request_started', route)
    this.logger.log(
      JSON.stringify({
        event: 'request_started',
        requestId,
        method: request.method,
        route,
        userId,
      }),
    )

    return next.handle().pipe(
      tap({
        next: () => {
          this.finishRequest(request, response, startedAt, route, userId, requestId)
        },
        error: (error) => {
          this.finishRequest(request, response, startedAt, route, userId, requestId, error)
        },
      }),
    )
  }

  private finishRequest(
    request: Request,
    response: Response,
    startedAt: bigint,
    route: string,
    userId: string | null,
    requestId: string | number | string[] | undefined,
    error?: unknown,
  ): void {
    const durationSeconds = Number(process.hrtime.bigint() - startedAt) / 1_000_000_000
    const statusCode = response.statusCode || (error ? 500 : 200)
    this.observability.recordHttpRequest({
      method: request.method,
      route,
      statusCode,
      durationSeconds,
    })
    this.observability.recordRequestLog('request_completed', route)

    const payload = {
      event: 'request_completed',
      requestId,
      method: request.method,
      route,
      statusCode,
      durationMs: Math.round(durationSeconds * 1000),
      userId,
      errorName: error instanceof Error ? error.name : undefined,
    }

    if (statusCode >= 500) {
      this.logger.error(JSON.stringify(payload))
      return
    }

    if (statusCode >= 400) {
      this.logger.warn(JSON.stringify(payload))
      return
    }

    this.logger.log(JSON.stringify(payload))
  }
}
