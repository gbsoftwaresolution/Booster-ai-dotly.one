'use client'
import { useState } from 'react'

interface LeadCaptureModalProps {
  cardId: string
  cardHandle: string
  ownerName: string
  /** When provided, the modal is always visible and this is called to close it */
  onClose?: () => void
}

interface InputFieldProps {
  label: string
  required?: boolean
  type: string
  value: string
  onChange: (v: string) => void
  placeholder: string
  icon: React.ReactNode
}

function InputField({
  label,
  required,
  type,
  value,
  onChange,
  placeholder,
  icon,
}: InputFieldProps) {
  const [focused, setFocused] = useState(false)
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
        {label}
        {required && <span style={{ color: '#ef4444', marginLeft: 2 }}>*</span>}
      </label>
      <div
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          borderRadius: 10,
          border: `1.5px solid ${focused ? '#0ea5e9' : '#e2e8f0'}`,
          background: focused ? '#f0f9ff' : '#f8fafc',
          transition: 'border-color 0.15s, background 0.15s',
          boxShadow: focused ? '0 0 0 3px rgba(14,165,233,0.12)' : 'none',
        }}
      >
        <span
          style={{
            position: 'absolute',
            left: 12,
            color: focused ? '#0ea5e9' : '#94a3b8',
            display: 'flex',
            alignItems: 'center',
            transition: 'color 0.15s',
          }}
        >
          {icon}
        </span>
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          required={required}
          style={{
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
          }}
        />
      </div>
    </div>
  )
}

export function LeadCaptureModal({
  cardId,
  cardHandle,
  ownerName,
  onClose,
}: LeadCaptureModalProps) {
  const [open, setOpen] = useState(!onClose)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const isControlled = !!onClose
  const isOpen = isControlled ? true : open

  function handleClose() {
    if (isControlled) {
      onClose?.()
    } else {
      setOpen(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setError('Name is required.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'}/public/contacts`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, phone, cardId, sourceHandle: cardHandle }),
        },
      )
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { message?: string }
        setError(body.message ?? 'Something went wrong. Please try again.')
      } else {
        setSuccess(true)
        setTimeout(() => {
          handleClose()
          setSuccess(false)
          setName('')
          setEmail('')
          setPhone('')
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
        /* Backdrop */
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
            padding: '0 0 0 0',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) handleClose()
          }}
        >
          {/* Sheet */}
          <div
            style={{
              width: '100%',
              maxWidth: 480,
              background: '#ffffff',
              borderRadius: '20px 20px 0 0',
              padding: '20px 24px 36px',
              boxShadow: '0 -8px 40px rgba(0,0,0,0.18)',
              animation: 'slideUp 0.25s cubic-bezier(0.32, 0.72, 0, 1)',
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
                  Connect with {ownerName}
                </h2>
                <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
                  Leave your details and they&apos;ll be in touch.
                </p>
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

            {/* Divider */}
            <div style={{ height: 1, background: '#f1f5f9', margin: '16px 0' }} />

            {success ? (
              /* Success state */
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
                <InputField
                  label="Name"
                  required
                  type="text"
                  value={name}
                  onChange={setName}
                  placeholder="Your full name"
                  icon={
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  }
                />
                <InputField
                  label="Email"
                  type="email"
                  value={email}
                  onChange={setEmail}
                  placeholder="your@email.com"
                  icon={
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect width="20" height="16" x="2" y="4" rx="2" />
                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                    </svg>
                  }
                />
                <InputField
                  label="Phone"
                  type="tel"
                  value={phone}
                  onChange={setPhone}
                  placeholder="+1 (555) 000-0000"
                  icon={
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.41 2 2 0 0 1 3.59 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.56a16 16 0 0 0 6.53 6.53l1.62-1.62a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                  }
                />

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
                  {submitting ? 'Connecting…' : 'Connect'}
                </button>
              </form>
            )}
          </div>

          {/* Slide-up keyframe — injected once via a style tag */}
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
