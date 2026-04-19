import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common'
import * as Sentry from '@sentry/node'
import { Request, Response } from 'express'
import { getRequestContext } from '../observability/request-context'
import { ObservabilityService } from '../observability/observability.service'

function getErrorCode(status: number): string {
  switch (status) {
    case HttpStatus.BAD_REQUEST:
      return 'bad_request'
    case HttpStatus.UNAUTHORIZED:
      return 'unauthorized'
    case HttpStatus.FORBIDDEN:
      return 'forbidden'
    case HttpStatus.NOT_FOUND:
      return 'not_found'
    case HttpStatus.CONFLICT:
      return 'conflict'
    case HttpStatus.UNPROCESSABLE_ENTITY:
      return 'validation_error'
    default:
      return status >= 500 ? 'internal_error' : 'request_error'
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

@Catch()
export class SentryExceptionFilter implements ExceptionFilter {
  constructor(private readonly observability: ObservabilityService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    const request = ctx.getRequest<Request>()

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR

    if (status >= 500) {
      const requestContext = getRequestContext()
      Sentry.withScope((scope) => {
        scope.setTag('request_id', requestContext?.requestId ?? 'unknown')
        scope.setContext('request', {
          method: request.method,
          path: request.path,
          requestId: requestContext?.requestId,
          userId: requestContext?.userId,
        })
        Sentry.captureException(exception)
      })
    }

    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : undefined

    let message = 'Internal server error'
    let details: unknown = undefined
    let code = getErrorCode(status)
    if (exception instanceof HttpException) {
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse
      } else if (isRecord(exceptionResponse)) {
        if (typeof exceptionResponse.code === 'string') {
          code = exceptionResponse.code
        }

        const responseMessage = exceptionResponse.message
        if (Array.isArray(responseMessage)) {
          message = responseMessage.join(', ')
          details = responseMessage
        } else if (typeof responseMessage === 'string') {
          message = responseMessage
        } else {
          message = exception.message
        }

        if ('details' in exceptionResponse) {
          details = exceptionResponse.details
        } else {
          const extraEntries = Object.entries(exceptionResponse).filter(
            ([key]) => !['statusCode', 'message', 'error', 'code'].includes(key),
          )
          if (extraEntries.length > 0) {
            details = Object.fromEntries(extraEntries)
          }
        }
      } else {
        message = exception.message
      }
    }

    this.observability.recordErrorEvent(request.route?.path ?? request.path, status, code)

    response.status(status).json({
      statusCode: status,
      code,
      timestamp: new Date().toISOString(),
      // F-22: Use request.path instead of request.url so query string
      // parameters (which may contain sensitive tokens or PII) are not
      // reflected back in error responses. request.path is just the
      // pathname portion (e.g. "/cards/123") without query string.
      path: request.path,
      message: Array.isArray(details) ? 'Validation failed' : message,
      ...(details !== undefined ? { details } : {}),
    })
  }
}
