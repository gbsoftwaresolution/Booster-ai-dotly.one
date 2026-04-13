'use client'

import type { JSX } from 'react'

import DOMPurify from 'dompurify'
import { Check, Copy, Mail } from 'lucide-react'
import { cn } from '@/lib/cn'

import { SelectField } from '@/components/ui/SelectField'
import { StatusNotice } from '@/components/ui/StatusNotice'

import { STYLES, getCopyToastText } from './helpers'
import type { CardSummary, SignatureOptions, SignatureStyle } from './signature-utils'

export function EmailSignatureLoading(): JSX.Element {
  return (
    <div className="space-y-6">
      <div className="h-8 w-64 animate-pulse rounded bg-gray-100" />
      <div className="h-64 animate-pulse rounded-xl bg-gray-100" />
    </div>
  )
}

export function EmailSignatureHeader(): JSX.Element {
  return (
    <div className="relative overflow-hidden rounded-[32px] border border-white/80 bg-white/60 px-6 py-8 sm:px-10 shadow-[0_8px_32px_-12px_rgba(15,23,42,0.08)] backdrop-blur-xl transition-all duration-300 hover:shadow-[0_16px_48px_-12px_rgba(15,23,42,0.15)]">
      <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-indigo-500/10 blur-[40px] pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 h-48 w-48 rounded-full bg-brand-400/10 blur-[40px] pointer-events-none" />
      <h1 className="relative text-3xl font-extrabold tracking-tight text-slate-800">
        Email Signature Generator
      </h1>
      <p className="relative mt-3 text-[15px] font-medium text-slate-500">
        Generate a Gmail-compatible email signature from your Dotly card.
      </p>
    </div>
  )
}

export function EmailSignatureAlerts({
  error,
  qrError,
  showQr,
  copyError,
  copyToast,
}: {
  error: string | null
  qrError: string | null
  showQr: boolean
  copyError: string | null
  copyToast: 'html' | 'gmail' | 'gmail-plain' | null
}): JSX.Element {
  return (
    <>
      {error && <StatusNotice message={error} />}
      {qrError && showQr && <StatusNotice tone="warning" message={qrError} liveMode="polite" />}
      {copyError && (
        <div role="alert" className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700">
          {copyError}
        </div>
      )}
      <div aria-live="polite" className="sr-only">
        {getCopyToastText(copyToast)}
      </div>
    </>
  )
}

export function EmailSignatureEmpty(): JSX.Element {
  return (
    <div className="app-empty-state">
      <Mail className="mx-auto mb-4 h-12 w-12 text-gray-300" />
      <p className="text-sm text-gray-500">Create a card first to generate an email signature.</p>
    </div>
  )
}

export function EmailSignatureControls({
  cards,
  selectedCardId,
  style,
  options,
  selectedCard,
  copyToast,
  onSelectCard,
  onSelectStyle,
  onToggleOption,
  onCopyHtml,
  onCopyForGmail,
}: {
  cards: CardSummary[]
  selectedCardId: string | null
  style: SignatureStyle
  options: SignatureOptions
  selectedCard: CardSummary | null
  copyToast: 'html' | 'gmail' | 'gmail-plain' | null
  onSelectCard: (cardId: string) => void
  onSelectStyle: (style: SignatureStyle) => void
  onToggleOption: (key: keyof SignatureOptions, checked: boolean) => void
  onCopyHtml: () => void
  onCopyForGmail: () => void
}): JSX.Element {
  return (
    <div className="space-y-6">
      <div className="relative rounded-[32px] border border-white/80 bg-white/60 p-6 shadow-[0_4px_20px_-8px_rgba(15,23,42,0.06)] backdrop-blur-xl transition-all duration-300 hover:shadow-[0_12px_36px_-12px_rgba(15,23,42,0.12)] hover:bg-white">
        <h2 className="mb-4 text-[13px] font-extrabold uppercase tracking-widest text-slate-400 ml-1">
          Card
        </h2>
        <SelectField
          aria-label="Select a card for this signature"
          value={selectedCardId ?? ''}
          onChange={(event) => onSelectCard(event.target.value)}
          className="rounded-xl px-3 py-2.5 pr-10 focus:border-indigo-500 focus:ring-indigo-100"
        >
          {cards.map((card) => (
            <option key={card.id} value={card.id}>
              /{card.handle}
              {card.fields['name'] ? ` — ${card.fields['name']}` : ''}
            </option>
          ))}
        </SelectField>
      </div>

      <div className="relative rounded-[32px] border border-white/80 bg-white/60 p-6 shadow-[0_4px_20px_-8px_rgba(15,23,42,0.06)] backdrop-blur-xl transition-all duration-300 hover:shadow-[0_12px_36px_-12px_rgba(15,23,42,0.12)] hover:bg-white">
        <h2 className="mb-4 text-[13px] font-extrabold uppercase tracking-widest text-slate-400 ml-1">
          Style
        </h2>
        <div className="space-y-2">
          {STYLES.map((styleOption) => (
            <button
              key={styleOption.value}
              type="button"
              onClick={() => onSelectStyle(styleOption.value)}
              aria-pressed={style === styleOption.value}
              className={[
                'group relative flex w-full items-center justify-between rounded-[20px] border px-5 py-4 text-left transition-all duration-300 ease-out',
                style === styleOption.value
                  ? 'border-brand-300 bg-brand-50/80 shadow-[0_8px_24px_-8px_rgba(14,165,233,0.25)] scale-[1.02] ring-2 ring-brand-500/20'
                  : 'border-white/80 bg-white/40 hover:bg-white hover:border-white hover:shadow-[0_8px_24px_-8px_rgba(15,23,42,0.08)] hover:-translate-y-0.5',
              ].join(' ')}
            >
              <span
                className={cn(
                  'text-[15px] font-bold tracking-tight transition-colors',
                  style === styleOption.value
                    ? 'text-brand-700'
                    : 'text-slate-700 group-hover:text-slate-900',
                )}
              >
                {styleOption.label}
              </span>
              <span
                className={cn(
                  'text-[13px] font-medium transition-colors',
                  style === styleOption.value ? 'text-brand-500/80' : 'text-slate-400',
                )}
              >
                {styleOption.desc}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="relative rounded-[32px] border border-white/80 bg-white/60 p-6 shadow-[0_4px_20px_-8px_rgba(15,23,42,0.06)] backdrop-blur-xl transition-all duration-300 hover:shadow-[0_12px_36px_-12px_rgba(15,23,42,0.12)] hover:bg-white">
        <h2 className="mb-4 text-[13px] font-extrabold uppercase tracking-widest text-slate-400 ml-1">
          Options
        </h2>
        <div className="space-y-3">
          {(
            [
              { key: 'showPhoto', label: 'Show photo' },
              { key: 'showSocials', label: 'Show social links' },
              { key: 'showQr', label: 'Show QR code' },
            ] as { key: keyof SignatureOptions; label: string }[]
          ).map(({ key, label }) => (
            <label key={key} className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={options[key]}
                onChange={(event) => onToggleOption(key, event.target.checked)}
                className="h-5 w-5 rounded-md border-gray-300 text-indigo-500 shadow-sm transition-all hover:border-indigo-400 hover:scale-110 focus:ring-indigo-500 focus:ring-offset-2"
              />
              <span className="text-[14px] font-bold text-slate-700 tracking-tight">{label}</span>
            </label>
          ))}
        </div>
        {options.showQr && selectedCard && !selectedCard.qrImageUrl && (
          <p className="mt-3 text-xs text-amber-600">
            No QR code found for this card. Generate one from the card editor first.
          </p>
        )}
      </div>

      <div className="space-y-2">
        <button
          type="button"
          onClick={onCopyHtml}
          disabled={!selectedCard}
          aria-live="polite"
          className="group relative flex w-full items-center justify-center gap-3 rounded-[24px] border-2 border-slate-200/60 bg-white/50 px-6 py-4 text-[15px] font-bold text-slate-600 shadow-[0_4px_16px_-8px_rgba(15,23,42,0.05)] backdrop-blur-md transition-all duration-300 ease-out hover:border-slate-300/80 hover:bg-white hover:text-slate-800 hover:shadow-[0_8px_24px_-8px_rgba(15,23,42,0.1)] hover:scale-[1.01] active:scale-95 disabled:pointer-events-none disabled:opacity-50"
        >
          {copyToast === 'html' ? (
            <>
              <Check className="h-4 w-4 text-green-500" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" />
              Copy HTML
            </>
          )}
        </button>

        <button
          type="button"
          onClick={onCopyForGmail}
          disabled={!selectedCard}
          aria-live="polite"
          className="group relative flex w-full items-center justify-center gap-3 rounded-[24px] bg-gradient-to-r from-sky-400 to-indigo-500 px-6 py-4 text-[15px] font-bold text-white shadow-[0_8px_32px_-8px_rgba(79,70,229,0.4)] transition-all duration-300 ease-out hover:shadow-[0_16px_48px_-12px_rgba(79,70,229,0.6)] hover:scale-[1.02] active:scale-95 disabled:pointer-events-none disabled:opacity-50"
        >
          {copyToast === 'gmail' || copyToast === 'gmail-plain' ? (
            <>
              <Check className="h-4 w-4" />
              {copyToast === 'gmail-plain' ? 'Plain Text Copied' : 'Copied!'}
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" />
              Copy for Gmail
            </>
          )}
        </button>

        <p className="text-center text-xs text-gray-400">
          {copyToast === 'gmail-plain'
            ? 'This browser only allowed plain-text copy. Paste styling may be lost.'
            : '“Copy for Gmail” pastes styled HTML directly into Gmail compose.'}
        </p>
      </div>
    </div>
  )
}

export function EmailSignaturePreview({
  selectedCard,
  signatureHtml,
}: {
  selectedCard: CardSummary | null
  signatureHtml: string
}): JSX.Element {
  return (
    <div className="relative overflow-hidden rounded-[32px] border border-white/80 bg-white/60 p-8 shadow-[0_8px_32px_-12px_rgba(15,23,42,0.08)] backdrop-blur-xl transition-all duration-300 hover:shadow-[0_16px_48px_-12px_rgba(15,23,42,0.15)] lg:sticky lg:top-8">
      <h2 className="mb-6 text-[13px] font-extrabold uppercase tracking-widest text-slate-400 ml-1">
        Preview
      </h2>

      {selectedCard ? (
        <div className="rounded-[24px] border-2 border-dashed border-slate-200/60 bg-white/40 p-8 shadow-inner transition-all duration-300 hover:bg-white/60">
          <div className="mb-4 border-b border-gray-200 pb-4">
            <p className="text-xs text-gray-400">— Email body above —</p>
          </div>
          <div
            // biome-ignore lint/security/noDangerouslySetInnerHtml: intentional for signature preview — sanitized via DOMPurify
            dangerouslySetInnerHTML={{
              __html: DOMPurify.sanitize(signatureHtml),
            }}
          />
        </div>
      ) : (
        <p className="text-sm text-gray-400">Select a card to preview your signature.</p>
      )}

      {selectedCard && (
        <details className="mt-4">
          <summary className="cursor-pointer text-xs text-gray-400 hover:text-gray-600">
            View raw HTML
          </summary>
          <pre className="mt-2 max-h-48 overflow-auto rounded-lg bg-gray-900 p-4 text-xs text-gray-100">
            {signatureHtml}
          </pre>
        </details>
      )}
    </div>
  )
}
