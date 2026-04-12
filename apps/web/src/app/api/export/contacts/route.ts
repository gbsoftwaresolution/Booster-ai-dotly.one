import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getServerApiUrl } from '@/lib/server-api'
import type { BillingSummaryResponse, PaginatedResponse } from '@dotly/types'

interface Contact {
  id: string
  name: string
  email?: string | null
  phone?: string | null
  company?: string | null
  createdAt: string
  crmPipeline?: { stage: string } | null
  sourceCard?: { handle: string } | null
}

const CSV_EXPORT_PLANS = new Set(['PRO', 'BUSINESS', 'ENTERPRISE'])
const PAGE_LIMIT = 200
const MAX_EXPORT_ROWS = 2000

export async function GET(): Promise<NextResponse> {
  const supabase = await createClient()
  // Use getUser() — it re-validates the JWT with Supabase's servers.
  // getSession() only reads the cookie and can be spoofed.
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // We still need the session's access_token to call the API on behalf of the user.
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const apiUrl = getServerApiUrl()

  try {
    // C-1: Fail closed — if the billing service is unavailable or returns a
    // non-2xx response, deny the export rather than allowing it.  Previously
    // the gate was only applied on billingRes.ok, meaning a billing outage
    // silently granted every user unrestricted export access.
    const billingRes = await fetch(`${apiUrl}/billing`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
      cache: 'no-store',
    })
    if (!billingRes.ok) {
      return NextResponse.json(
        { error: 'Unable to verify plan. Please try again.' },
        { status: 403 },
      )
    }
    const billing = (await billingRes.json()) as BillingSummaryResponse
    const plan = billing?.plan ?? 'FREE'
    if (!CSV_EXPORT_PLANS.has(plan)) {
      return NextResponse.json({ error: 'CSV export is available on Pro.' }, { status: 403 })
    }

    // Paginate through all contacts using the API's max page size (200).
    // This avoids the validation error that occurred when requesting limit=1000.
    const allContacts: Contact[] = []
    let page = 1

    while (allContacts.length < MAX_EXPORT_ROWS) {
      const res = await fetch(`${apiUrl}/contacts?page=${page}&limit=${PAGE_LIMIT}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: 'no-store',
      })

      if (!res.ok) {
        return NextResponse.json({ error: 'Failed to fetch contacts' }, { status: res.status })
      }

      const data = (await res.json()) as PaginatedResponse<Contact>
      const batch = data.items ?? []
      allContacts.push(...batch)

      // Stop if this is the last page
      if (batch.length < PAGE_LIMIT || allContacts.length >= data.total) break
      page++
    }

    // Build CSV
    const header = ['Name', 'Email', 'Phone', 'Company', 'Stage', 'Source Card', 'Date Added']
    const rows = allContacts.map((c) => [
      csvEscape(c.name),
      csvEscape(c.email ?? ''),
      csvEscape(c.phone ?? ''),
      csvEscape(c.company ?? ''),
      csvEscape(c.crmPipeline?.stage ?? 'NEW'),
      csvEscape(c.sourceCard ? `/${c.sourceCard.handle}` : ''),
      csvEscape(new Date(c.createdAt).toISOString().split('T')[0] ?? ''),
    ])

    const csv = [header, ...rows].map((row) => row.join(',')).join('\n')
    const today = new Date().toISOString().split('T')[0]

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="leads-${today}.csv"`,
      },
    })
  } catch {
    // MED-13: Do NOT return err.message to the client — it can contain internal
    // stack traces, file paths, or API error details that leak server internals.
    return NextResponse.json({ error: 'Export failed. Please try again.' }, { status: 500 })
  }
}

function csvEscape(value: string): string {
  // Prevent CSV formula injection: spreadsheet apps (Excel, Google Sheets)
  // interpret cells that start with =, +, -, @, \t, or \r as formulas.
  // Prefix such values with a single-quote so they are treated as plain text.
  // The single-quote is the universally accepted spreadsheet "force text" prefix.
  const sanitized = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value

  if (sanitized.includes(',') || sanitized.includes('"') || sanitized.includes('\n')) {
    return `"${sanitized.replace(/"/g, '""')}"`
  }
  return sanitized
}
