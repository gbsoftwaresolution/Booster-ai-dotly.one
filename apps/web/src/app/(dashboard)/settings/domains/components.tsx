'use client'

import type { FormEvent, JSX } from 'react'
import { useRef } from 'react'

import { SelectField } from '@/components/ui/SelectField'
import { StatusNotice } from '@/components/ui/StatusNotice'
import { useDialogFocusTrap } from '@/hooks/useDialogFocusTrap'
import { AlertTriangle, Globe, Plus } from 'lucide-react'

import { DOMAIN_INPUT_ID, STATUS_STYLES } from './helpers'
import type { CardOption, CustomDomain } from './types'

export function DomainsHero({
  loading,
  domainsCount,
  activeDomains,
  assignedDomains,
  pendingDomains,
  focusMessage,
}: {
  loading: boolean
  domainsCount: number
  activeDomains: number
  assignedDomains: number
  pendingDomains: number
  focusMessage: string
}): JSX.Element {
  const metrics = [
    { label: 'Domains', value: loading ? '—' : domainsCount },
    { label: 'Active', value: loading ? '—' : activeDomains },
    { label: 'Assigned', value: loading ? '—' : assignedDomains },
    { label: 'Pending', value: loading ? '—' : pendingDomains },
  ]

  return (
    <div className="app-panel relative overflow-hidden rounded-[28px] px-6 py-6 sm:px-8 sm:py-7">
      <div
        className="absolute inset-0 opacity-90"
        aria-hidden="true"
        style={{
          background:
            'radial-gradient(circle at top left, rgba(14,165,233,0.12), transparent 34%), radial-gradient(circle at right center, rgba(99,102,241,0.10), transparent 28%), linear-gradient(135deg, rgba(255,255,255,0.94), rgba(248,250,252,0.98))',
        }}
      />
      <div className="relative space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 sm:text-[2rem]">Custom domains</h1>
          <p className="mt-2 max-w-2xl text-sm text-gray-600 sm:text-[15px]">
            Verify branded domains, attach them to cards, and keep routing status clear.
          </p>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:max-w-3xl sm:grid-cols-4">
            {metrics.map(({ label, value }) => (
              <div
                key={label}
                className="rounded-2xl border border-white/80 bg-white/88 px-3 py-3 shadow-[0_20px_40px_-34px_rgba(15,23,42,0.16)]"
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                  {label}
                </p>
                <p className="mt-1 text-sm font-bold text-gray-900 sm:text-base">{value}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 flex max-w-full items-start gap-3 rounded-2xl border border-white/80 bg-white/88 px-4 py-3 text-sm text-gray-700 shadow-[0_20px_40px_-34px_rgba(15,23,42,0.18)]">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-50 text-sky-600">
              <Globe className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="font-medium text-gray-900">Routing focus</p>
              <p className="mt-1 text-sm text-gray-600">{focusMessage}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function AddDomainForm({
  domainInput,
  domainFieldError,
  adding,
  onChange,
  onSubmit,
}: {
  domainInput: string
  domainFieldError: string
  adding: boolean
  onChange: (value: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}): JSX.Element {
  return (
    <div className="app-panel rounded-[28px] p-6 sm:p-7">
      <h2 className="mb-4 text-base font-semibold text-gray-900">Add a Domain</h2>
      <form onSubmit={onSubmit} className="flex flex-col gap-3 sm:flex-row">
        <label htmlFor={DOMAIN_INPUT_ID} className="sr-only">
          Domain hostname
        </label>
        <input
          id={DOMAIN_INPUT_ID}
          type="text"
          value={domainInput}
          onChange={(event) => onChange(event.target.value)}
          placeholder="card.yourcompany.com"
          inputMode="url"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          aria-invalid={domainFieldError ? 'true' : 'false'}
          aria-describedby={domainFieldError ? 'domain-input-error' : 'domain-input-help'}
          className={`flex-1 rounded-lg border px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 ${domainFieldError ? 'border-red-300 focus:border-red-500 focus:ring-red-100' : 'border-gray-300'}`}
        />
        <button
          type="submit"
          disabled={adding || !domainInput.trim()}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
        >
          <Plus className="h-4 w-4" />
          {adding ? 'Adding...' : 'Add Domain'}
        </button>
      </form>
      <div className="mt-2 min-h-5 text-xs">
        {domainFieldError ? (
          <p id="domain-input-error" className="text-red-600">
            {domainFieldError}
          </p>
        ) : (
          <p id="domain-input-help" className="text-gray-400">
            Enter the hostname only, without `http://` or path segments.
          </p>
        )}
      </div>
    </div>
  )
}

export function DomainsAlerts({
  permissionDenied,
  error,
}: {
  permissionDenied: boolean
  error: string
}): JSX.Element {
  return (
    <>
      {permissionDenied && (
        <StatusNotice
          tone="warning"
          message="Custom domain management is not available for your current account access."
        />
      )}
      {error && <StatusNotice message={error} />}
    </>
  )
}

export function DomainsList({
  loading,
  error,
  hasLoadedOnce,
  domains,
  cards,
  cardsLoaded,
  cardsLoading,
  verifyingId,
  deletingId,
  assigningId,
  onRetry,
  onLoadCards,
  onAssignCard,
  onVerify,
  onDelete,
}: {
  loading: boolean
  error: string
  hasLoadedOnce: boolean
  domains: CustomDomain[]
  cards: CardOption[]
  cardsLoaded: boolean
  cardsLoading: boolean
  verifyingId: string | null
  deletingId: string | null
  assigningId: string | null
  onRetry: () => void
  onLoadCards: () => void
  onAssignCard: (domainId: string, cardId: string | null) => void
  onVerify: (domainId: string) => void
  onDelete: (domainId: string) => void
}): JSX.Element {
  if (loading) {
    return (
      <div className="app-list-skeleton rounded-[28px] text-sm text-gray-500">
        Loading domains...
      </div>
    )
  }

  if (error && !hasLoadedOnce) {
    return (
      <div className="app-empty-state">
        <Globe className="mb-4 h-10 w-10 text-slate-300" />
        <p className="app-empty-state-title">Domains are unavailable</p>
        <p className="app-empty-state-text">{error}</p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
        >
          Retry
        </button>
      </div>
    )
  }

  if (domains.length === 0) {
    return (
      <div className="app-empty-state">
        <Globe className="mb-4 h-10 w-10 text-slate-300" />
        <p className="app-empty-state-title">No custom domains yet.</p>
        <p className="app-empty-state-text">
          Add a domain above to start verification and connect it to one of your cards.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {domains.map((domain) => {
        const rowBusy =
          verifyingId === domain.id || assigningId === domain.id || deletingId === domain.id
        const anyRowBusy = verifyingId !== null || assigningId !== null || deletingId !== null

        return (
          <div key={domain.id} className="app-panel rounded-[28px] p-6 sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-mono text-sm font-semibold text-gray-900">
                    {domain.domain}
                  </span>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[domain.status] ?? ''}`}
                  >
                    {domain.status}
                  </span>
                  {domain.card && (
                    <span className="text-xs text-gray-400">Assigned to /{domain.card.handle}</span>
                  )}
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <label
                    htmlFor={`domain-card-select-${domain.id}`}
                    className="shrink-0 text-xs font-medium text-gray-500"
                  >
                    Assign to card:
                  </label>
                  {cardsLoaded ? (
                    <>
                      <SelectField
                        id={`domain-card-select-${domain.id}`}
                        value={domain.card?.id ?? ''}
                        disabled={rowBusy || anyRowBusy}
                        onChange={(event) => onAssignCard(domain.id, event.target.value || null)}
                        className="flex-1 rounded-xl border-gray-300/80 bg-white/85 px-3 py-2.5 pr-9 text-xs focus:border-brand-500 focus:ring-brand-100"
                      >
                        <option value="">— None —</option>
                        {cards.map((card) => (
                          <option key={card.id} value={card.id}>
                            /{card.handle}
                            {card.fields?.name ? ` (${card.fields.name})` : ''}
                          </option>
                        ))}
                      </SelectField>
                      {assigningId === domain.id && (
                        <span className="text-xs text-gray-400">Saving...</span>
                      )}
                    </>
                  ) : (
                    <div className="flex-1 rounded-xl border border-dashed border-gray-300 bg-white/80 px-3 py-2 text-xs text-gray-500">
                      <div className="flex items-center justify-between gap-3">
                        <span>
                          {cardsLoading
                            ? 'Loading card options...'
                            : 'Card options load on demand.'}
                        </span>
                        <button
                          type="button"
                          disabled={rowBusy || anyRowBusy || cardsLoading}
                          onClick={onLoadCards}
                          className="rounded-lg border border-gray-300 px-2.5 py-1 font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
                        >
                          {cardsLoading ? 'Loading...' : 'Load'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {domain.status !== 'ACTIVE' && (
                  <div className="app-panel-subtle mt-4 rounded-[22px] p-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      DNS Verification Record
                    </p>
                    <div className="space-y-1 font-mono text-xs text-gray-700">
                      <div>
                        <span className="text-gray-400">Type:</span> TXT
                      </div>
                      <div>
                        <span className="text-gray-400">Name:</span>{' '}
                        <span className="select-all">_dotly-verify.{domain.domain}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Value:</span>{' '}
                        <span className="select-all break-all">{domain.verificationToken}</span>
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-gray-400">
                      After adding the record, DNS propagation may take up to 24 hours.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex shrink-0 flex-wrap gap-2">
                {domain.status !== 'ACTIVE' && (
                  <button
                    type="button"
                    onClick={() => onVerify(domain.id)}
                    disabled={rowBusy || anyRowBusy}
                    className="rounded-xl border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
                  >
                    {verifyingId === domain.id ? 'Checking...' : 'Verify'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onDelete(domain.id)}
                  disabled={rowBusy || anyRowBusy}
                  className="rounded-xl border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                >
                  {deletingId === domain.id ? 'Removing...' : 'Remove'}
                </button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function DomainsConfirmDialog({
  title,
  message,
  onConfirm,
  onCancel,
}: {
  title: string
  message: string
  onConfirm: () => void
  onCancel: () => void
}): JSX.Element {
  const dialogRef = useRef<HTMLDivElement>(null)
  const cancelButtonRef = useRef<HTMLButtonElement>(null)

  useDialogFocusTrap({
    active: true,
    containerRef: dialogRef,
    initialFocusRef: cancelButtonRef,
    onEscape: onCancel,
  })

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onCancel} aria-hidden="true" />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="domains-confirm-dialog-title"
        className="app-modal fixed inset-x-4 top-1/2 z-50 max-w-sm -translate-y-1/2 p-6 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2"
      >
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
            <AlertTriangle className="h-5 w-5 text-red-600" />
          </div>
          <div className="flex-1">
            <h3 id="domains-confirm-dialog-title" className="text-sm font-semibold text-gray-900">
              {title}
            </h3>
            <p className="mt-1 text-sm text-gray-600">{message}</p>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
          >
            Remove
          </button>
        </div>
      </div>
    </>
  )
}
