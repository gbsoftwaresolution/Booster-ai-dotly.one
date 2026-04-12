'use client'

import type { JSX } from 'react'

import DOMPurify from 'dompurify'
import { Check, Copy, Mail } from 'lucide-react'

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
    <div className="app-panel rounded-[30px] px-6 py-6 sm:px-8">
      <h1 className="text-2xl font-bold text-gray-900">Email Signature Generator</h1>
      <p className="mt-2 text-sm text-gray-500">
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
      <div className="app-panel rounded-[24px] p-5">
        <h2 className="mb-3 text-sm font-semibold text-gray-700">Card</h2>
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

      <div className="app-panel rounded-[24px] p-5">
        <h2 className="mb-3 text-sm font-semibold text-gray-700">Style</h2>
        <div className="space-y-2">
          {STYLES.map((styleOption) => (
            <button
              key={styleOption.value}
              type="button"
              onClick={() => onSelectStyle(styleOption.value)}
              aria-pressed={style === styleOption.value}
              className={[
                'flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left text-sm transition-colors',
                style === styleOption.value
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                  : 'border-gray-200 text-gray-700 hover:bg-gray-50',
              ].join(' ')}
            >
              <span className="font-medium">{styleOption.label}</span>
              <span className="text-xs text-gray-400">{styleOption.desc}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="app-panel rounded-[24px] p-5">
        <h2 className="mb-3 text-sm font-semibold text-gray-700">Options</h2>
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
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm text-gray-700">{label}</span>
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
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
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
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
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
    <div className="app-panel rounded-[28px] p-6">
      <h2 className="mb-4 text-sm font-semibold text-gray-700">Preview</h2>

      {selectedCard ? (
        <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-6">
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
