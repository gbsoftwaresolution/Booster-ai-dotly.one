import { Injectable, Logger } from '@nestjs/common'
import { Counter, Gauge, Histogram, Registry, collectDefaultMetrics } from 'prom-client'

type CoreFlowMetricName =
  | 'sales_link_views_total'
  | 'sales_link_leads_created_total'
  | 'sales_link_bookings_created_total'
  | 'sales_link_payments_total'
  | 'upgrade_checkout_started_total'
  | 'upgrade_checkout_completed_total'
  | 'webhook_events_total'

type CoreFlowLabelValues = Record<string, string>

@Injectable()
export class ObservabilityService {
  private readonly logger = new Logger(ObservabilityService.name)
  private readonly registry = new Registry()
  private readonly coreFlowCounters: Record<CoreFlowMetricName, Counter<string>>
  private readonly httpRequestDuration: Histogram<string>
  private readonly httpRequestsTotal: Counter<string>
  private readonly queueBacklog: Gauge<string>
  private readonly requestLogsTotal: Counter<string>
  private readonly errorEventsTotal: Counter<string>

  constructor() {
    collectDefaultMetrics({ register: this.registry, prefix: 'dotly_api_' })

    this.httpRequestDuration = new Histogram({
      name: 'dotly_api_http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'route', 'status_code'] as const,
      buckets: [0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10],
      registers: [this.registry],
    })

    this.httpRequestsTotal = new Counter({
      name: 'dotly_api_http_requests_total',
      help: 'HTTP requests served',
      labelNames: ['method', 'route', 'status_code'] as const,
      registers: [this.registry],
    })

    this.requestLogsTotal = new Counter({
      name: 'dotly_api_request_logs_total',
      help: 'Structured request log events emitted',
      labelNames: ['kind', 'route'] as const,
      registers: [this.registry],
    })

    this.errorEventsTotal = new Counter({
      name: 'dotly_api_error_events_total',
      help: 'Application errors by route and code',
      labelNames: ['route', 'status_code', 'code'] as const,
      registers: [this.registry],
    })

    this.queueBacklog = new Gauge({
      name: 'dotly_api_queue_backlog_jobs',
      help: 'Current backlog size per queue and state',
      labelNames: ['queue', 'state'] as const,
      registers: [this.registry],
    })

    this.coreFlowCounters = {
      sales_link_views_total: new Counter({
        name: 'dotly_api_sales_link_views_total',
        help: 'Sales link views recorded',
        labelNames: ['username'] as const,
        registers: [this.registry],
      }),
      sales_link_leads_created_total: new Counter({
        name: 'dotly_api_sales_link_leads_created_total',
        help: 'Sales link leads created',
        labelNames: ['username', 'plan'] as const,
        registers: [this.registry],
      }),
      sales_link_bookings_created_total: new Counter({
        name: 'dotly_api_sales_link_bookings_created_total',
        help: 'Sales link bookings created',
        labelNames: ['username', 'plan'] as const,
        registers: [this.registry],
      }),
      sales_link_payments_total: new Counter({
        name: 'dotly_api_sales_link_payments_total',
        help: 'Sales link payments by outcome',
        labelNames: ['username', 'provider', 'status'] as const,
        registers: [this.registry],
      }),
      upgrade_checkout_started_total: new Counter({
        name: 'dotly_api_upgrade_checkout_started_total',
        help: 'Upgrade checkout sessions started',
        labelNames: ['plan', 'provider'] as const,
        registers: [this.registry],
      }),
      upgrade_checkout_completed_total: new Counter({
        name: 'dotly_api_upgrade_checkout_completed_total',
        help: 'Upgrade checkout sessions completed',
        labelNames: ['plan', 'provider', 'status'] as const,
        registers: [this.registry],
      }),
      webhook_events_total: new Counter({
        name: 'dotly_api_webhook_events_total',
        help: 'Webhook events processed',
        labelNames: ['source', 'event_type', 'status'] as const,
        registers: [this.registry],
      }),
    }
  }

  getMetrics(): Promise<string> {
    return this.registry.metrics()
  }

  getContentType(): string {
    return this.registry.contentType
  }

  recordHttpRequest(params: {
    method: string
    route: string
    statusCode: number
    durationSeconds: number
  }): void {
    const labels = {
      method: params.method,
      route: params.route,
      status_code: String(params.statusCode),
    }
    this.httpRequestsTotal.inc(labels)
    this.httpRequestDuration.observe(labels, params.durationSeconds)
  }

  recordRequestLog(kind: 'request_started' | 'request_completed', route: string): void {
    this.requestLogsTotal.inc({ kind, route })
  }

  recordErrorEvent(route: string, statusCode: number, code: string): void {
    this.errorEventsTotal.inc({
      route,
      status_code: String(statusCode),
      code,
    })
  }

  incrementCoreFlowCounter(name: CoreFlowMetricName, labels: CoreFlowLabelValues): void {
    this.coreFlowCounters[name].inc(labels)
  }

  observeWebhookLatency(source: string, eventType: string, durationSeconds: number): void {
    const metricName = 'dotly_api_webhook_duration_seconds'
    let histogram = this.registry.getSingleMetric(metricName) as Histogram<string> | undefined

    if (!histogram) {
      histogram = new Histogram({
        name: metricName,
        help: 'Webhook handling latency in seconds',
        labelNames: ['source', 'event_type'] as const,
        buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10],
        registers: [this.registry],
      })
    }

    histogram.observe({ source, event_type: eventType }, durationSeconds)
  }

  setQueueBacklog(queue: string, state: string, value: number): void {
    this.queueBacklog.set({ queue, state }, value)
  }

  logOperationalEvent(
    message: string,
    metadata: Record<string, unknown>,
    level: 'log' | 'warn' | 'error' = 'log',
  ): void {
    const payload = JSON.stringify(metadata)
    if (level === 'warn') {
      this.logger.warn(`${message} ${payload}`)
      return
    }
    if (level === 'error') {
      this.logger.error(`${message} ${payload}`)
      return
    }
    this.logger.log(`${message} ${payload}`)
  }
}
