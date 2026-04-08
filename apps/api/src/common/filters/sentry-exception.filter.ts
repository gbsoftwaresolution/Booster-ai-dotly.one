import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common'
import * as Sentry from '@sentry/node'
import { Request, Response } from 'express'

@Catch()
export class SentryExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    const request = ctx.getRequest<Request>()

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR

    // Capture 4xx auth errors in Sentry too — repeated 401/403s can indicate
    // credential stuffing, token theft, or misconfigured clients and should be
    // observable in the error dashboard alongside 5xx failures.
    if (status >= 400) {
      Sentry.captureException(exception)
    }

    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : undefined

    let message = 'Internal server error'
    if (exception instanceof HttpException) {
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse
      } else if (
        exceptionResponse &&
        typeof exceptionResponse === 'object' &&
        'message' in exceptionResponse
      ) {
        const responseMessage = (exceptionResponse as { message?: unknown }).message
        if (Array.isArray(responseMessage)) {
          message = responseMessage.join(', ')
        } else if (typeof responseMessage === 'string') {
          message = responseMessage
        } else {
          message = exception.message
        }
      } else {
        message = exception.message
      }
    }

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      // F-22: Use request.path instead of request.url so query string
      // parameters (which may contain sensitive tokens or PII) are not
      // reflected back in error responses. request.path is just the
      // pathname portion (e.g. "/cards/123") without query string.
      path: request.path,
      message,
    })
  }
}
