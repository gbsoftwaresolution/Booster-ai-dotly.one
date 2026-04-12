'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { apiPost } from '@/lib/api'
import { ChevronDown } from 'lucide-react'
import { getPublicApiUrl } from '@/lib/public-env'

const API_URL = getPublicApiUrl()

// ─── Global styles (all keyframes in one place) ───────────────────────────────

const GLOBAL_STYLES = `
  @keyframes lcm-slide-up {
    from { transform: translateY(100%); opacity: 0; }
    to   { transform: translateY(0);    opacity: 1; }
  }
  @keyframes lcm-check-pop {
    0%   { transform: scale(0.5); opacity: 0; }
    60%  { transform: scale(1.25); opacity: 1; }
    100% { transform: scale(1);    opacity: 1; }
  }
  @keyframes lcm-spin {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }
`

// ─── Shared vCard download ────────────────────────────────────────────────────

/** Download a vCard using fetch() + createObjectURL() so that the
 *  Authorization header can be sent — the vCard endpoint only accepts
 *  Bearer tokens, not ?token= query params (stripped for security).
 */
async function downloadVcardFetch(cardHandle: string, token: string) {
  const url = `${API_URL}/public/cards/${cardHandle}/vcard`
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) {
    throw new Error(
      res.status === 403 ? 'Sign in to download this contact.' : 'Failed to download contact.',
    )
  }

  const blob = await res.blob()
  const objectUrl = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = objectUrl
  a.download = `${cardHandle}.vcf`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(objectUrl)
}

// ─── Types ────────────────────────────────────────────────────────────────────

type LeadFieldType = 'TEXT' | 'EMAIL' | 'PHONE' | 'URL' | 'TEXTAREA' | 'SELECT'

interface LeadField {
  id: string
  label: string
  fieldType: LeadFieldType
  placeholder: string
  required: boolean
  displayOrder: number
  options: string[]
}

interface LeadForm {
  title: string
  description: string
  buttonText: string
  fields: LeadField[]
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_REGEX = /^[+]?[0-9()\-\s]{7,20}$/

function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

function normalizeFieldValue(field: LeadField, value: string): string {
  if (field.fieldType === 'TEXTAREA') return value.trim()
  return value.trim()
}

function validateFieldValue(field: LeadField, value: string): string | null {
  const trimmed = value.trim()

  if (field.required && !trimmed) {
    return `${field.label} is required.`
  }

  if (!trimmed) return null

  if (trimmed.length > 500) {
    return `${field.label} must be 500 characters or less.`
  }

  if ((field.id === '__name' || field.fieldType === 'TEXT') && trimmed.length < 2) {
    return `${field.label} must be at least 2 characters.`
  }

  if (field.fieldType === 'EMAIL' && !EMAIL_REGEX.test(trimmed)) {
    return 'Enter a valid email address.'
  }

  if (field.fieldType === 'PHONE' && !PHONE_REGEX.test(trimmed)) {
    return 'Enter a valid phone number.'
  }

  if (field.fieldType === 'URL' && !isValidHttpUrl(trimmed)) {
    return 'Enter a valid URL starting with http:// or https://.'
  }

  if (
    field.fieldType === 'SELECT' &&
    field.options.length > 0 &&
    !field.options.includes(trimmed)
  ) {
    return `Select a valid ${field.label.toLowerCase()}.`
  }

  return null
}

const DEFAULT_FORM: LeadForm = {
  title: 'Connect with me',
  description: "Leave your details and I'll be in touch.",
  buttonText: 'Connect',
  fields: [
    {
      id: '__name',
      label: 'Name',
      fieldType: 'TEXT',
      placeholder: 'Your full name',
      required: true,
      displayOrder: 0,
      options: [],
    },
    {
      id: '__email',
      label: 'Email',
      fieldType: 'EMAIL',
      placeholder: 'your@email.com',
      required: false,
      displayOrder: 1,
      options: [],
    },
    {
      id: '__phone',
      label: 'Phone',
      fieldType: 'PHONE',
      placeholder: '+1 (555) 000-0000',
      required: false,
      displayOrder: 2,
      options: [],
    },
  ],
}

// ─── Field icon ───────────────────────────────────────────────────────────────

function FieldIcon({ type, focused }: { type: LeadFieldType; focused: boolean }) {
  const color = focused ? '#0ea5e9' : '#94a3b8'
  const props = {
    width: 14,
    height: 14,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: color,
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }
  switch (type) {
    case 'EMAIL':
      return (
        <svg {...props}>
          <rect width="20" height="16" x="2" y="4" rx="2" />
          <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
        </svg>
      )
    case 'PHONE':
      return (
        <svg {...props}>
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.41 2 2 0 0 1 3.59 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.56a16 16 0 0 0 6.53 6.53l1.62-1.62a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
        </svg>
      )
    case 'URL':
      return (
        <svg {...props}>
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
      )
    case 'TEXTAREA':
      return (
        <svg {...props}>
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <line x1="8" y1="8" x2="16" y2="8" />
          <line x1="8" y1="12" x2="16" y2="12" />
          <line x1="8" y1="16" x2="12" y2="16" />
        </svg>
      )
    case 'SELECT':
      return (
        <svg {...props}>
          <path d="M3 6h18M3 12h18M3 18h7" />
          <path d="m16 16 2 2 4-4" />
        </svg>
      )
    default:
      return (
        <svg {...props}>
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      )
  }
}

// ─── Dynamic field ────────────────────────────────────────────────────────────

function autoCompleteFor(type: LeadFieldType): string {
  switch (type) {
    case 'EMAIL':
      return 'email'
    case 'PHONE':
      return 'tel'
    case 'URL':
      return 'url'
    default:
      return 'name'
  }
}

function inputTypeFor(type: LeadFieldType): string {
  switch (type) {
    case 'EMAIL':
      return 'email'
    case 'PHONE':
      return 'tel'
    case 'URL':
      return 'url'
    default:
      return 'text'
  }
}

function inputModeFor(
  type: LeadFieldType,
): React.InputHTMLAttributes<HTMLInputElement>['inputMode'] {
  if (type === 'PHONE') return 'tel'
  if (type === 'URL') return 'url'
  if (type === 'EMAIL') return 'email'
  return 'text'
}

function DynamicField({
  field,
  value,
  onChange,
  inputId,
  autoFocus,
  error,
}: {
  field: LeadField
  value: string
  onChange: (v: string) => void
  inputId: string
  autoFocus?: boolean
  error?: string
}) {
  const [focused, setFocused] = useState(false)
  const errorId = `${inputId}-error`

  const wrapStyle: React.CSSProperties = {
    position: 'relative',
    display: 'flex',
    alignItems: field.fieldType === 'TEXTAREA' ? 'flex-start' : 'center',
    borderRadius: 10,
    border: `1.5px solid ${error ? '#ef4444' : focused ? '#0ea5e9' : '#e2e8f0'}`,
    background: focused ? '#f0f9ff' : '#f8fafc',
    transition: 'border-color 0.15s, background 0.15s',
    boxShadow: error
      ? '0 0 0 3px rgba(239,68,68,0.12)'
      : focused
        ? '0 0 0 3px rgba(14,165,233,0.12)'
        : 'none',
  }

  const baseInput: React.CSSProperties = {
    width: '100%',
    paddingLeft: 38,
    paddingRight: 12,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 14,
    color: '#1e293b',
    background: 'transparent',
    border: 'none',
    outline: 'none',
    borderRadius: 10,
  }

  const iconStyle: React.CSSProperties = {
    position: 'absolute',
    left: 12,
    top: field.fieldType === 'TEXTAREA' ? 12 : undefined,
    display: 'flex',
    alignItems: 'center',
    transition: 'color 0.15s',
  }

  return (
    <div>
      <label
        htmlFor={inputId}
        style={{
          display: 'block',
          fontSize: 11,
          fontWeight: 600,
          color: '#64748b',
          textTransform: 'uppercase',
          letterSpacing: 0.6,
          marginBottom: 6,
        }}
      >
        {field.label}
        {field.required && (
          <span style={{ color: '#ef4444', marginLeft: 2 }} aria-hidden="true">
            *
          </span>
        )}
        {field.required && <span className="sr-only"> (required)</span>}
      </label>
      <div style={wrapStyle}>
        <span style={iconStyle} aria-hidden="true">
          <FieldIcon type={field.fieldType} focused={focused} />
        </span>
        {field.fieldType === 'TEXTAREA' ? (
          <textarea
            id={inputId}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={field.placeholder}
            rows={3}
            autoFocus={autoFocus}
            maxLength={500}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={error ? errorId : undefined}
            style={{ ...baseInput, resize: 'none' }}
          />
        ) : field.fieldType === 'SELECT' ? (
          <>
            <select
              id={inputId}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              autoFocus={autoFocus}
              aria-invalid={error ? 'true' : 'false'}
              aria-describedby={error ? errorId : undefined}
              style={{ ...baseInput, appearance: 'none', paddingRight: 40 }}
            >
              <option value="">{field.placeholder || `Select ${field.label}`}</option>
              {field.options.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            <span
              aria-hidden="true"
              style={{
                position: 'absolute',
                right: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                display: 'flex',
                color: '#94a3b8',
                pointerEvents: 'none',
              }}
            >
              <ChevronDown size={16} />
            </span>
          </>
        ) : (
          <input
            id={inputId}
            type={inputTypeFor(field.fieldType)}
            inputMode={inputModeFor(field.fieldType)}
            autoComplete={
              field.fieldType === 'TEXT' && field.id === '__name'
                ? 'name'
                : autoCompleteFor(field.fieldType)
            }
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={field.placeholder}
            autoFocus={autoFocus}
            maxLength={field.fieldType === 'PHONE' ? 20 : field.fieldType === 'EMAIL' ? 254 : 500}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={error ? errorId : undefined}
            style={baseInput}
          />
        )}
      </div>
      {error && (
        <p id={errorId} style={{ margin: '6px 0 0', fontSize: 12, color: '#dc2626' }}>
          {error}
        </p>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface LeadCaptureModalProps {
  cardId: string
  cardHandle: string
  ownerName: string
  /** Whether the visitor is an authenticated Dotly user */
  isAuth?: boolean
  /** The visitor's access token (if authenticated) */
  authToken?: string | null
  onAnalytics?: (type: 'CLICK' | 'SAVE', metadata: Record<string, unknown>) => void
  /** When provided, the modal is always visible and this callback closes it */
  onClose?: () => void
}

export function LeadCaptureModal({
  cardId,
  cardHandle,
  ownerName,
  isAuth = false,
  authToken = null,
  onAnalytics,
  onClose,
}: LeadCaptureModalProps) {
  const isControlled = !!onClose
  const [open, setOpen] = useState(false) // always starts closed — trigger button opens it
  const [form, setForm] = useState<LeadForm>(DEFAULT_FORM)
  const [values, setValues] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [schemaLoading, setSchemaLoading] = useState(true)
  const [schemaError, setSchemaError] = useState('')
  const [schemaRetry, setSchemaRetry] = useState(0)
  const titleId = `lcm-title-${cardHandle}`
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const schemaRequestIdRef = useRef(0)
  // Auth-connect state — for authenticated users who skip the form
  const [authConnecting, setAuthConnecting] = useState(false)
  const [authConnected, setAuthConnected] = useState(false)
  const [authConnectError, setAuthConnectError] = useState('')

  const isOpen = isControlled ? true : open

  // Initialise field values from a form schema
  function initValues(fields: LeadField[]) {
    const init: Record<string, string> = {}
    fields.forEach((f) => {
      init[f.id] = ''
    })
    setValues(init)
    setFieldErrors({})
  }

  // Fetch form schema from public API
  useEffect(() => {
    const controller = new AbortController()
    const requestId = ++schemaRequestIdRef.current
    setSchemaLoading(true)
    setSchemaError('')
    fetch(`${API_URL}/public/cards/${cardHandle}/lead-form`, { signal: controller.signal })
      .then(async (r) => {
        if (!r.ok) {
          throw new Error(r.status === 404 ? 'missing' : 'failed')
        }
        return (await r.json()) as LeadForm
      })
      .then((data: LeadForm) => {
        if (schemaRequestIdRef.current !== requestId) return
        const sorted = [...data.fields].sort((a, b) => a.displayOrder - b.displayOrder)
        const merged = { ...data, fields: sorted }
        setForm(merged)
        initValues(sorted)
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === 'AbortError') return
        if (schemaRequestIdRef.current !== requestId) return
        if (err instanceof Error && err.message === 'missing') {
          setForm(DEFAULT_FORM)
          initValues(DEFAULT_FORM.fields)
          return
        }
        setSchemaError('We could not load this contact form. Please retry.')
      })
      .finally(() => {
        if (schemaRequestIdRef.current !== requestId) return
        setSchemaLoading(false)
      })
    return () => controller.abort()
  }, [cardHandle, schemaRetry])

  // Body scroll lock while open
  useEffect(() => {
    if (!isOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [isOpen])

  const handleClose = useCallback(() => {
    setSuccess(false) // reset success state so next open starts fresh
    setError('')
    onAnalytics?.('CLICK', { surface: 'lead_modal', action: 'close' })
    if (isControlled) {
      onClose?.()
    } else {
      setOpen(false)
    }
  }, [isControlled, onAnalytics, onClose])

  // Escape key
  useEffect(() => {
    if (!isOpen) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') handleClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, handleClose])

  // Cleanup timer
  useEffect(
    () => () => {
      if (successTimerRef.current) clearTimeout(successTimerRef.current)
    },
    [],
  )

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (submitting) return

    const nextValues: Record<string, string> = {}
    const nextFieldErrors: Record<string, string> = {}

    for (const field of form.fields) {
      const normalized = normalizeFieldValue(field, values[field.id] ?? '')
      const validationError = validateFieldValue(field, normalized)
      nextValues[field.id] = normalized
      if (validationError) {
        nextFieldErrors[field.id] = validationError
      }
    }

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors)
      setValues((prev) => ({ ...prev, ...nextValues }))
      setError('Fix the highlighted fields before submitting.')
      return
    }

    setValues((prev) => ({ ...prev, ...nextValues }))
    setFieldErrors({})
    setSubmitting(true)
    setError('')

    const fieldValues: Record<string, string> = {}
    form.fields.forEach((f) => {
      fieldValues[f.label.toLowerCase().replace(/\s+/g, '_')] = nextValues[f.id] ?? ''
    })
    try {
      const res = await fetch(`${API_URL}/public/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: nextValues['__name'] ?? fieldValues['name'] ?? '',
          email: nextValues['__email'] ?? fieldValues['email'] ?? '',
          phone: nextValues['__phone'] ?? fieldValues['phone'] ?? '',
          cardId,
          sourceHandle: cardHandle,
          fields: fieldValues,
        }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { message?: string }
        setError(body.message ?? 'Something went wrong. Please try again.')
      } else {
        onAnalytics?.('SAVE', {
          surface: 'lead_modal',
          action: 'lead_submitted',
          status: 'success',
        })
        setSuccess(true)
        // Auto-dismiss after 3s — long enough to read, not annoying
        if (successTimerRef.current) clearTimeout(successTimerRef.current)
        successTimerRef.current = setTimeout(() => handleClose(), 3000)
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // Auth-aware direct connect — skips the form for signed-in users
  async function handleAuthConnect() {
    if (!authToken) return
    setAuthConnecting(true)
    setAuthConnectError('')
    try {
      // 1. Save to Dotly CRM (mutual exchange) — use apiPost for consistency
      await apiPost(
        '/contacts',
        { name: ownerName, sourceCardId: cardId, sourceHandle: cardHandle },
        authToken,
      )
      // 2. Download vCard using fetch + Authorization header (endpoint no longer accepts ?token=)
      await downloadVcardFetch(cardHandle, authToken)
      onAnalytics?.('SAVE', { surface: 'lead_modal', action: 'auth_connect', status: 'success' })
      setAuthConnected(true)
      if (successTimerRef.current) clearTimeout(successTimerRef.current)
      successTimerRef.current = setTimeout(() => handleClose(), 3000)
    } catch {
      setAuthConnectError('Something went wrong. Please try again.')
    } finally {
      setAuthConnecting(false)
    }
  }

  // Replace "me" with owner name only when it's a standalone pronoun at end of title
  const personalizedTitle = form.title.replace(/\bme\b/gi, ownerName)

  return (
    <>
      <style>{GLOBAL_STYLES}</style>

      {/* Standalone trigger — only shown when not externally controlled */}
      {!isControlled && (
        <button
          type="button"
          onClick={() => {
            onAnalytics?.('CLICK', { surface: 'lead_modal', action: 'open' })
            setOpen(true)
          }}
          style={{
            marginTop: 16,
            width: '100%',
            padding: '12px 0',
            borderRadius: 12,
            background: 'linear-gradient(135deg,#0ea5e9,#0284c7)',
            color: '#fff',
            fontSize: 14,
            fontWeight: 700,
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(14,165,233,0.35)',
            transition: 'opacity 0.15s',
          }}
          onMouseEnter={(e) => {
            ;(e.currentTarget as HTMLButtonElement).style.opacity = '0.88'
          }}
          onMouseLeave={(e) => {
            ;(e.currentTarget as HTMLButtonElement).style.opacity = '1'
          }}
        >
          Connect with me
        </button>
      )}

      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 50,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            background: 'rgba(15,23,42,0.55)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) handleClose()
          }}
        >
          <div
            style={
              {
                width: '100%',
                maxWidth: 480,
                background: '#ffffff',
                borderRadius: '20px 20px 0 0',
                padding: '20px 24px',
                paddingBottom: 'max(36px, calc(env(safe-area-inset-bottom) + 24px))',
                boxShadow: '0 -8px 40px rgba(0,0,0,0.18)',
                animation: 'lcm-slide-up 0.25s cubic-bezier(0.32,0.72,0,1)',
                maxHeight: '90dvh',
                overflowY: 'auto',
                WebkitOverflowScrolling: 'touch',
              } as React.CSSProperties
            }
          >
            {/* Drag handle */}
            <div
              style={{
                width: 36,
                height: 4,
                background: '#e2e8f0',
                borderRadius: 2,
                margin: '0 auto 20px',
              }}
            />

            {/* Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                marginBottom: 4,
              }}
            >
              <div>
                <h2
                  id={titleId}
                  style={{
                    fontSize: 20,
                    fontWeight: 800,
                    color: '#0f172a',
                    margin: '0 0 4px',
                    letterSpacing: '-0.3px',
                  }}
                >
                  {personalizedTitle}
                </h2>
                <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>{form.description}</p>
              </div>
              <button
                type="button"
                onClick={handleClose}
                aria-label="Close"
                style={{
                  flexShrink: 0,
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: '#f1f5f9',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginLeft: 12,
                  marginTop: 2,
                }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#64748b"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div style={{ height: 1, background: '#f1f5f9', margin: '16px 0' }} />

            {schemaLoading ? (
              <div
                style={{ padding: '12px 0', textAlign: 'center', color: '#64748b', fontSize: 13 }}
              >
                Loading contact form…
              </div>
            ) : schemaError ? (
              <div
                role="alert"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 12,
                  padding: '16px 0',
                  textAlign: 'center',
                }}
              >
                <p style={{ fontSize: 13, color: '#dc2626', margin: 0 }}>{schemaError}</p>
                <button
                  type="button"
                  onClick={() => setSchemaRetry((current) => current + 1)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 10,
                    border: '1px solid #cbd5e1',
                    background: '#fff',
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#0f172a',
                    cursor: 'pointer',
                  }}
                >
                  Retry
                </button>
              </div>
            ) : success || authConnected ? (
              /* ── Success screen (shared for both paths) ── */
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  padding: '24px 0',
                  gap: 12,
                }}
                aria-live="polite"
              >
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg,#22c55e,#16a34a)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 16px rgba(34,197,94,0.35)',
                    animation: 'lcm-check-pop 0.4s cubic-bezier(.32,1.4,.56,1) both',
                  }}
                >
                  <svg
                    width="26"
                    height="26"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#fff"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <p style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: 0 }}>
                  You&apos;re connected!
                </p>
                <p style={{ fontSize: 13, color: '#64748b', margin: 0, textAlign: 'center' }}>
                  {authConnected
                    ? `${ownerName} has been added to your contacts and their vCard has been downloaded.`
                    : `${ownerName} will be in touch soon.`}
                </p>
                <button
                  type="button"
                  onClick={handleClose}
                  style={{
                    marginTop: 4,
                    padding: '8px 20px',
                    borderRadius: 10,
                    background: '#f1f5f9',
                    border: 'none',
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#475569',
                    cursor: 'pointer',
                  }}
                >
                  Close
                </button>
              </div>
            ) : isAuth ? (
              /* ── Auth-connect UI — skip the form for signed-in users ── */
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 20,
                  padding: '8px 0 4px',
                }}
              >
                {/* Owner avatar placeholder */}
                <div
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg,#0ea5e9,#0284c7)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 16px rgba(14,165,233,0.3)',
                    flexShrink: 0,
                  }}
                >
                  <span style={{ fontSize: 28, fontWeight: 800, color: '#fff', lineHeight: 1 }}>
                    {ownerName.charAt(0).toUpperCase()}
                  </span>
                </div>

                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: '0 0 4px' }}>
                    {ownerName}
                  </p>
                  <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
                    Save their contact &amp; add them to your Dotly CRM in one tap.
                  </p>
                </div>

                {authConnectError && (
                  <div
                    role="alert"
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '10px 12px',
                      borderRadius: 10,
                      background: '#fef2f2',
                      border: '1px solid #fecaca',
                    }}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#ef4444"
                      strokeWidth="2"
                      strokeLinecap="round"
                      aria-hidden="true"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <span style={{ fontSize: 13, color: '#dc2626' }}>{authConnectError}</span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => void handleAuthConnect()}
                  disabled={authConnecting}
                  style={{
                    width: '100%',
                    padding: '13px 0',
                    borderRadius: 12,
                    background: authConnecting
                      ? '#94a3b8'
                      : 'linear-gradient(135deg,#0ea5e9,#0284c7)',
                    color: '#fff',
                    fontSize: 15,
                    fontWeight: 700,
                    border: 'none',
                    cursor: authConnecting ? 'not-allowed' : 'pointer',
                    boxShadow: authConnecting ? 'none' : '0 4px 14px rgba(14,165,233,0.35)',
                    transition: 'background 0.15s, box-shadow 0.15s',
                    letterSpacing: '-0.1px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                  }}
                >
                  {authConnecting ? (
                    <>
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        style={{ animation: 'lcm-spin 0.75s linear infinite' }}
                        aria-hidden="true"
                      >
                        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                      </svg>
                      Connecting…
                    </>
                  ) : (
                    <>
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M11 17a4 4 0 0 1-8 0V7l4-3 4 3v3" />
                        <path d="M16 3l4 3v10a4 4 0 0 1-8 0v-3l4-3" />
                      </svg>
                      Connect with {ownerName}
                    </>
                  )}
                </button>

                <p style={{ fontSize: 11, color: '#94a3b8', margin: 0, textAlign: 'center' }}>
                  Their vCard will be downloaded to your device.
                </p>
              </div>
            ) : (
              /* ── Standard lead-capture form ── */
              <form
                noValidate
                onSubmit={(e) => void handleSubmit(e)}
                style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
              >
                {form.fields.map((field, index) => (
                  <DynamicField
                    key={field.id}
                    field={field}
                    value={values[field.id] ?? ''}
                    onChange={(v) => {
                      setValues((prev) => ({ ...prev, [field.id]: v }))
                      setFieldErrors((prev) => {
                        if (!prev[field.id]) return prev
                        const next = { ...prev }
                        delete next[field.id]
                        return next
                      })
                    }}
                    inputId={`lcm-field-${cardHandle}-${field.id}`}
                    autoFocus={index === 0}
                    error={fieldErrors[field.id]}
                  />
                ))}

                {error && (
                  <div
                    role="alert"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '10px 12px',
                      borderRadius: 10,
                      background: '#fef2f2',
                      border: '1px solid #fecaca',
                    }}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#ef4444"
                      strokeWidth="2"
                      strokeLinecap="round"
                      aria-hidden="true"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <span style={{ fontSize: 13, color: '#dc2626' }}>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    width: '100%',
                    padding: '13px 0',
                    borderRadius: 12,
                    background: submitting ? '#94a3b8' : 'linear-gradient(135deg,#0ea5e9,#0284c7)',
                    color: '#fff',
                    fontSize: 15,
                    fontWeight: 700,
                    border: 'none',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    boxShadow: submitting ? 'none' : '0 4px 14px rgba(14,165,233,0.35)',
                    transition: 'background 0.15s, box-shadow 0.15s',
                    letterSpacing: '-0.1px',
                  }}
                >
                  {submitting ? 'Connecting…' : form.buttonText}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
