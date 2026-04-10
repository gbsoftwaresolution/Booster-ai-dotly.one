import { Module } from '@nestjs/common'
import { WinstonModule } from 'nest-winston'
import * as winston from 'winston'

/**
 * Log drain configuration:
 * In production (Railway), set the LOG_DRAIN_URL environment variable or configure
 * a Railway log drain integration to ship logs to your aggregator:
 *   - Datadog:    Add a Datadog log drain in Railway project settings, or ship via
 *                 DATADOG_API_KEY + the datadog-agent sidecar.
 *   - Loki:       Point the Railway log drain to your Grafana Loki push endpoint.
 *   - CloudWatch: Use the AWS CloudWatch transport for winston if needed.
 * The JSON format used in production is structured for easy parsing by all of the
 * above systems. Do not change `format.json()` to `format.simple()` in production.
 *
 * L-04: Recursively redact known PII field names from log metadata so that
 * email addresses, names, Supabase UUIDs, and tokens never appear in
 * production log aggregators (Datadog, Loki, CloudWatch, etc.).
 *
 * We redact at the logger level rather than at each call-site because:
 *   1. It is easy to miss a field at the call-site as code grows.
 *   2. Third-party libraries (NestJS internals, Passport, Bull) may log
 *      passthrough objects that include PII without our control.
 *
 * The redaction is applied ONLY in production so that local development
 * retains full log output for debugging.
 */
const PII_FIELDS = new Set([
  'email',
  'name',
  'supabaseId',
  'pushToken',
  'walletAddress',
  'password',
  'token',
  'accessToken',
  'refreshToken',
  'apiKey',
  'authorization',
  'cookie',
  'set-cookie',
])

function redactPii(obj: unknown, depth = 0): unknown {
  // Limit recursion depth to avoid stack overflow on deeply nested objects
  if (depth > 8 || obj === null || typeof obj !== 'object') return obj
  if (Array.isArray(obj)) return obj.map((item) => redactPii(item, depth + 1))
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    result[key] = PII_FIELDS.has(key.toLowerCase()) ? '[REDACTED]' : redactPii(value, depth + 1)
  }
  return result
}

const piiRedactFormat = winston.format((info) => {
  if (process.env.NODE_ENV !== 'production') return info
  // Redact known PII fields from the metadata portion of the log entry
  const { level, message, timestamp, ...meta } = info
  const redacted = redactPii(meta) as Record<string, unknown>
  return Object.assign({}, { level, message, timestamp }, redacted)
})

@Module({
  imports: [
    WinstonModule.forRoot({
      transports: [
        new winston.transports.Console({
          format:
            process.env.NODE_ENV === 'production'
              ? winston.format.combine(piiRedactFormat(), winston.format.json())
              : winston.format.combine(
                  winston.format.colorize(),
                  winston.format.timestamp(),
                  winston.format.printf(
                    ({ timestamp, level, message, ...meta }) =>
                      `${timestamp} [${level}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`,
                  ),
                ),
        }),
      ],
    }),
  ],
  exports: [WinstonModule],
})
export class LoggerModule {}
