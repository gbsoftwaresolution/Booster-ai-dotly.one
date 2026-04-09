'use client'

import type { JSX } from 'react'
import { useState, useEffect, useRef } from 'react'
import { X, Send, Mail, ChevronDown } from 'lucide-react'
import { getAccessToken } from '@/lib/supabase/client'
import { apiPost, apiGet } from '@/lib/api'

interface ComposeEmailModalProps {
  contactId: string
  contactName: string
  contactEmail: string
  onClose: () => void
}

interface EmailTemplate {
  id: string
  name: string
  subject: string
  body: string
}

async function getToken(): Promise<string | undefined> {
  return getAccessToken()
}

export function ComposeEmailModal({
  contactId,
  contactName,
  contactEmail,
  onClose,
}: ComposeEmailModalProps): JSX.Element {
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [showTemplates, setShowTemplates] = useState(false)
  const subjectRef = useRef<HTMLInputElement>(null)

  // Auto-focus subject on open
  useEffect(() => {
    subjectRef.current?.focus()
  }, [])

  // Load email templates
  useEffect(() => {
    void (async () => {
      try {
        const token = await getToken()
        const data = await apiGet<EmailTemplate[]>('/email-templates', token)
        setTemplates(data)
      } catch {
        // Non-critical — templates just won't show
      }
    })()
  }, [])

  // Auto-close after success
  useEffect(() => {
    if (sent) {
      const timer = setTimeout(onClose, 2000)
      return () => clearTimeout(timer)
    }
  }, [sent, onClose])

  // Escape key closes modal
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  const applyTemplate = (tpl: EmailTemplate) => {
    setSubject(tpl.subject)
    setBody(tpl.body)
    setShowTemplates(false)
  }

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) {
      setError('Subject and body are required.')
      return
    }
    setSending(true)
    setError(null)
    try {
      const token = await getToken()
      await apiPost(
        `/contacts/${contactId}/send-email`,
        { subject: subject.trim(), body: body.trim() },
        token,
      )
      setSent(true)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to send email'
      if (msg.includes('429') || msg.includes('Too Many')) {
        setError('Rate limit reached: you can send at most 20 emails per hour.')
      } else {
        setError(msg)
      }
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-60 bg-black/50" onClick={onClose} aria-hidden="true" />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="compose-email-title"
        className="fixed left-1/2 top-1/2 z-70 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-indigo-500" />
            <h2 id="compose-email-title" className="text-base font-semibold text-gray-900">
              Send Email to {contactName}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <div className="space-y-4 px-5 py-4">
          {/* To field (read-only) */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">To</label>
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
              {contactEmail}
            </div>
          </div>

          {/* Template picker */}
          {templates.length > 0 && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowTemplates((v) => !v)}
                className="flex items-center gap-1.5 rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
              >
                Use template
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
              {showTemplates && (
                <div className="absolute left-0 top-full z-10 mt-1 w-72 rounded-lg border border-gray-200 bg-white shadow-lg">
                  {templates.map((tpl) => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => applyTemplate(tpl)}
                      className="block w-full px-4 py-2.5 text-left hover:bg-gray-50"
                    >
                      <p className="text-sm font-medium text-gray-800">{tpl.name}</p>
                      <p className="truncate text-xs text-gray-500">{tpl.subject}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Subject */}
          <div>
            <label
              htmlFor="compose-subject"
              className="mb-1 block text-xs font-medium text-gray-500"
            >
              Subject
            </label>
            <input
              ref={subjectRef}
              id="compose-subject"
              type="text"
              maxLength={200}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Enter subject..."
              disabled={sending || sent}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 disabled:bg-gray-50 disabled:text-gray-500"
            />
          </div>

          {/* Body */}
          <div>
            <label htmlFor="compose-body" className="mb-1 block text-xs font-medium text-gray-500">
              Message
            </label>
            <textarea
              id="compose-body"
              rows={5}
              maxLength={5000}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your message..."
              disabled={sending || sent}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 disabled:bg-gray-50 disabled:text-gray-500"
            />
            <p className="mt-1 text-right text-xs text-gray-400">{body.length}/5000</p>
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
          )}

          {/* Success */}
          {sent && (
            <div className="rounded-lg bg-green-50 px-3 py-2 text-sm font-medium text-green-700">
              Email sent! Closing...
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-gray-200 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={sending}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={sending || sent || !subject.trim() || !body.trim()}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            {sending ? 'Sending...' : sent ? 'Sent!' : 'Send Email'}
          </button>
        </div>
      </div>
    </>
  )
}
