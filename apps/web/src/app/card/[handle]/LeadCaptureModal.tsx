'use client'
import { useState, useEffect } from 'react'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

// ── Types ─────────────────────────────────────────────────────────────────────

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

// Default form shown when no custom schema is configured
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

// ── Field icon map ─────────────────────────────────────────────────────────────

function FieldIcon({ type, focused }: { type: LeadFieldType; focused: boolean }) {
  const color = focused ? '#0ea5e9' : '#94a3b8'
  switch (type) {
    case 'EMAIL':
      return (
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect width="20" height="16" x="2" y="4" rx="2" />
          <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
        </svg>
      )
    case 'PHONE':
      return (
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.41 2 2 0 0 1 3.59 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.56a16 16 0 0 0 6.53 6.53l1.62-1.62a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
        </svg>
      )
    case 'URL':
      return (
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
      )
    case 'TEXTAREA':
      return (
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <line x1="8" y1="8" x2="16" y2="8" />
          <line x1="8" y1="12" x2="16" y2="12" />
          <line x1="8" y1="16" x2="12" y2="16" />
        </svg>
      )
    case 'SELECT':
      return (
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 6h18M3 12h18M3 18h7" />
          <path d="m16 16 2 2 4-4" />
        </svg>
      )
    default: // TEXT
      return (
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      )
  }
}

// ── Input components ─────────────────────────────────────────────────────────

function DynamicField({
  field,
  value,
  onChange,
}: {
  field: LeadField
  value: string
  onChange: (v: string) => void
}) {
  const [focused, setFocused] = useState(false)

  const baseInputStyle: React.CSSProperties = {
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

  const wrapStyle: React.CSSProperties = {
    position: 'relative',
    display: 'flex',
    alignItems: field.fieldType === 'TEXTAREA' ? 'flex-start' : 'center',
    borderRadius: 10,
    border: `1.5px solid ${focused ? '#0ea5e9' : '#e2e8f0'}`,
    background: focused ? '#f0f9ff' : '#f8fafc',
    transition: 'border-color 0.15s, background 0.15s',
    boxShadow: focused ? '0 0 0 3px rgba(14,165,233,0.12)' : 'none',
  }

  return (
    <div>
      <label
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
        {field.required && <span style={{ color: '#ef4444', marginLeft: 2 }}>*</span>}
      </label>
      <div style={wrapStyle}>
        <span
          style={{
            position: 'absolute',
            left: 12,
            top: field.fieldType === 'TEXTAREA' ? 12 : undefined,
            color: focused ? '#0ea5e9' : '#94a3b8',
            display: 'flex',
            alignItems: 'center',
            transition: 'color 0.15s',
          }}
        >
          <FieldIcon type={field.fieldType} focused={focused} />
        </span>

        {field.fieldType === 'TEXTAREA' ? (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={field.placeholder}
            required={field.required}
            rows={3}
            style={{
              ...baseInputStyle,
              paddingTop: 10,
              paddingBottom: 10,
              resize: 'none',
            }}
          />
        ) : field.fieldType === 'SELECT' ? (
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            required={field.required}
            style={{ ...baseInputStyle, appearance: 'none', paddingRight: 32 }}
          >
            <option value="">{field.placeholder || `Select ${field.label}`}</option>
            {field.options.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        ) : (
          <input
            type={
              field.fieldType === 'EMAIL'
                ? 'email'
                : field.fieldType === 'PHONE'
                  ? 'tel'
                  : field.fieldType === 'URL'
                    ? 'url'
                    : 'text'
            }
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={field.placeholder}
            required={field.required}
            style={baseInputStyle}
          />
        )}
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

interface LeadCaptureModalProps {
  cardId: string
  cardHandle: string
  ownerName: string
  /** When provided, the modal is always visible and this is called to close it */
  onClose?: () => void
}

export function LeadCaptureModal({
  cardId,
  cardHandle,
  ownerName,
  onClose,
}: LeadCaptureModalProps) {
  const [open, setOpen] = useState(!onClose)
  const [form, setForm] = useState<LeadForm>(DEFAULT_FORM)
  const [values, setValues] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const isControlled = !!onClose
  const isOpen = isControlled ? true : open

  // Fetch form schema from public API
  useEffect(() => {
    fetch(`${API_URL}/public/cards/${cardHandle}/lead-form`)
      .then((r) => (r.ok ? (r.json() as Promise<LeadForm>) : Promise.reject()))
      .then((data: LeadForm) => {
        setForm(data)
        // Initialise values map for all fields
        const init: Record<string, string> = {}
        data.fields.forEach((f) => {
          init[f.id] = ''
        })
        setValues(init)
      })
      .catch(() => {
        // Fallback to defaults — already set
        const init: Record<string, string> = {}
        DEFAULT_FORM.fields.forEach((f) => {
          init[f.id] = ''
        })
        setValues(init)
      })
  }, [cardHandle])

  function handleClose() {
    if (isControlled) {
      onClose?.()
    } else {
      setOpen(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    // Validate required fields
    for (const field of form.fields) {
      if (field.required && !values[field.id]?.trim()) {
        setError(`${field.label} is required.`)
        return
      }
    }

    setSubmitting(true)
    setError('')

    // Map field values to submission payload
    // Keep backward-compatible name/email/phone keys for default fields,
    // plus a generic `fields` map for custom ones.
    const fieldValues: Record<string, string> = {}
    form.fields.forEach((f) => {
      fieldValues[f.label.toLowerCase().replace(/\s+/g, '_')] = values[f.id] ?? ''
    })

    // Extract well-known keys for the contacts API
    const name = values['__name'] ?? fieldValues['name'] ?? ''
    const email = values['__email'] ?? fieldValues['email'] ?? ''
    const phone = values['__phone'] ?? fieldValues['phone'] ?? ''

    try {
      const res = await fetch(`${API_URL}/public/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          phone,
          cardId,
          sourceHandle: cardHandle,
          fields: fieldValues,
        }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { message?: string }
        setError(body.message ?? 'Something went wrong. Please try again.')
      } else {
        setSuccess(true)
        setTimeout(() => {
          handleClose()
          setSuccess(false)
          setValues({})
        }, 2200)
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      {/* Standalone trigger — only shown when not externally controlled */}
      {!isControlled && (
        <button
          onClick={() => setOpen(true)}
          style={{
            marginTop: 16,
            width: '100%',
            padding: '12px 0',
            borderRadius: 12,
            background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
            color: '#fff',
            fontSize: 14,
            fontWeight: 700,
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(14,165,233,0.35)',
          }}
        >
          Connect with me
        </button>
      )}

      {isOpen && (
        <div
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
            style={{
              width: '100%',
              maxWidth: 480,
              background: '#ffffff',
              borderRadius: '20px 20px 0 0',
              padding: '20px 24px 36px',
              boxShadow: '0 -8px 40px rgba(0,0,0,0.18)',
              animation: 'slideUp 0.25s cubic-bezier(0.32, 0.72, 0, 1)',
              maxHeight: '90dvh',
              overflowY: 'auto',
            }}
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
                  style={{
                    fontSize: 20,
                    fontWeight: 800,
                    color: '#0f172a',
                    margin: '0 0 4px',
                    letterSpacing: '-0.3px',
                  }}
                >
                  {form.title.replace('me', ownerName)}
                </h2>
                <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>{form.description}</p>
              </div>
              <button
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

            {success ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  padding: '24px 0',
                  gap: 12,
                }}
              >
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 16px rgba(34,197,94,0.35)',
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
                  {ownerName} will be in touch soon.
                </p>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  void handleSubmit(e)
                }}
                style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
              >
                {form.fields.map((field) => (
                  <DynamicField
                    key={field.id}
                    field={field}
                    value={values[field.id] ?? ''}
                    onChange={(v) => setValues((prev) => ({ ...prev, [field.id]: v }))}
                  />
                ))}

                {error && (
                  <div
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
                    background: submitting
                      ? '#94a3b8'
                      : 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
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

          <style>{`
            @keyframes slideUp {
              from { transform: translateY(100%); }
              to   { transform: translateY(0); }
            }
          `}</style>
        </div>
      )}
    </>
  )
}
