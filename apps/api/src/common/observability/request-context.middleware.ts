import { Injectable, NestMiddleware } from '@nestjs/common'
import type { NextFunction, Request, Response } from 'express'
import { randomUUID } from 'crypto'
import { runWithRequestContext } from './request-context'

function getHeaderValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0]
  return value
}

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const requestId = getHeaderValue(req.headers['x-request-id'])?.trim() || randomUUID()

    res.setHeader('x-request-id', requestId)

    runWithRequestContext(
      {
        requestId,
        method: req.method,
        route: req.route?.path,
      },
      () => next(),
    )
  }
}
