import { request } from 'node:http'
import { request as httpsRequest } from 'node:https'

const DEFAULT_BASE_URL = 'http://127.0.0.1:3001'
const REQUIRED_METRICS = [
  'dotly_api_http_requests_total',
  'dotly_api_http_request_duration_seconds',
  'dotly_api_sales_link_views_total',
  'dotly_api_sales_link_leads_created_total',
  'dotly_api_sales_link_bookings_created_total',
  'dotly_api_sales_link_payments_total',
  'dotly_api_upgrade_checkout_started_total',
  'dotly_api_upgrade_checkout_completed_total',
  'dotly_api_webhook_events_total',
  'dotly_api_queue_backlog_jobs',
]

function fetchText(urlString: string): Promise<string> {
  const url = new URL(urlString)
  const transport = url.protocol === 'https:' ? httpsRequest : request

  return new Promise((resolve, reject) => {
    const req = transport(url, (res) => {
      const chunks: Buffer[] = []
      res.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)))
      res.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf8')
        if ((res.statusCode ?? 500) >= 400) {
          reject(new Error(`Metrics request failed with ${res.statusCode}: ${body}`))
          return
        }
        resolve(body)
      })
    })

    req.on('error', reject)
    req.end()
  })
}

async function main() {
  const baseUrl = process.env.METRICS_BASE_URL ?? DEFAULT_BASE_URL
  const body = await fetchText(`${baseUrl.replace(/\/$/, '')}/metrics`)

  const missing = REQUIRED_METRICS.filter((metric) => !body.includes(metric))
  if (missing.length > 0) {
    throw new Error(`Missing required metrics: ${missing.join(', ')}`)
  }

  console.log(`Metrics verification passed against ${baseUrl}`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
