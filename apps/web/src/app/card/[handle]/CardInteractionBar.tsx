'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { getAccessToken } from '@/lib/supabase/client'
import { apiPost } from '@/lib/api'
import { getPublicApiUrl } from '@/lib/public-env'
import {
  MessageSquare,
  Mic,
  FolderOpen,
  UserPlus,
  Check,
  X,
  ChevronUp,
  Loader2,
  Square,
  Upload,
  FileText,
  Share2,
} from 'lucide-react'

// ─── Global styles (all keyframes in one place) ───────────────────────────────

const GLOBAL_STYLES = `
  @keyframes cib-pulse {
    0%, 100% { transform: scale(1); }
    50%       { transform: scale(1.06); }
  }
  @keyframes cib-slide-up {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes cib-check-pop {
    0%   { transform: scale(0.5); opacity: 0; }
    60%  { transform: scale(1.25); opacity: 1; }
    100% { transform: scale(1);    opacity: 1; }
  }
  @keyframes cib-shimmer {
    0%   { background-position: -200% 0; }
    100% { background-position: 200%  0; }
  }
`

// ─── Types ────────────────────────────────────────────────────────────────────

const API_URL = getPublicApiUrl()
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://dotly.one'

/** Download a vCard using fetch() + createObjectURL() so that the
 *  Authorization header can be sent — the vCard endpoint only accepts
 *  Bearer tokens, not ?token= query params (stripped for security).
 */
async function downloadVcardFetch(cardHandle: string, token: string) {
  const url = `${API_URL}/public/cards/${cardHandle}/vcard`
  try {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    if (!res.ok) return
    const blob = await res.blob()
    const objectUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = objectUrl
    a.download = `${cardHandle}.vcf`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(objectUrl)
  } catch {
    /* non-blocking */
  }
}

type Tab = 'contact' | 'message' | 'voice' | 'dropbox'

interface Props {
  cardId: string
  cardHandle: string
  ownerName: string
  onAnalytics?: (type: 'CLICK' | 'SAVE', metadata: Record<string, unknown>) => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function vibrate(pattern: number[]) {
  try {
    navigator.vibrate?.(pattern)
  } catch {
    /* ignore */
  }
}

function getSupportedMimeType(): string {
  const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4']
  for (const t of types) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t)) return t
  }
  return ''
}

// ─── Spam guard ───────────────────────────────────────────────────────────────

function useSpamGuard() {
  const startTime = useRef(Date.now())
  const [honeypot, setHoneypot] = useState('')
  const reset = useCallback(() => {
    startTime.current = Date.now()
  }, [])
  const check = useCallback((): string | null => {
    if (honeypot) return 'spam'
    if (Date.now() - startTime.current < 1500) return 'too_fast'
    return null
  }, [honeypot])
  return { honeypot, setHoneypot, check, reset }
}

// ─── Input styles ─────────────────────────────────────────────────────────────

const INPUT_CLS =
  'w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100'

// ─── Success card ─────────────────────────────────────────────────────────────

function SuccessCard({
  title,
  subtitle,
  onReset,
  resetLabel,
  shareUrl,
}: {
  title: string
  subtitle: string
  onReset: () => void
  resetLabel: string
  shareUrl?: string
}) {
  async function handleShare() {
    if (!shareUrl) return
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ url: shareUrl })
        return
      } catch {
        /* cancelled */
      }
    }
    try {
      await navigator.clipboard.writeText(shareUrl)
    } catch {
      /* ignore */
    }
  }

  return (
    <div
      className="flex flex-col items-center gap-3 py-6 text-center"
      style={{ animation: 'cib-slide-up 0.3s ease both' }}
    >
      <div
        className="flex h-14 w-14 items-center justify-center rounded-full"
        style={{ background: '#f0fdf4' }}
      >
        <Check
          className="h-7 w-7 text-green-500"
          style={{ animation: 'cib-check-pop 0.4s cubic-bezier(.32,1.4,.56,1) both' }}
        />
      </div>
      <p className="text-sm font-bold text-slate-800">{title}</p>
      <p className="max-w-xs text-xs text-slate-500">{subtitle}</p>
      <div className="flex gap-2 mt-1">
        <button
          onClick={onReset}
          className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 transition-opacity active:opacity-70"
        >
          {resetLabel}
        </button>
        {shareUrl && (
          <button
            onClick={() => void handleShare()}
            className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold text-white transition-opacity active:opacity-70"
            style={{ background: 'linear-gradient(135deg,#38bdf8,#0ea5e9)' }}
          >
            <Share2 className="h-3.5 w-3.5" />
            Share their card
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Message tab ──────────────────────────────────────────────────────────────

function MessageTab({
  cardHandle,
  ownerName,
  onAnalytics,
}: {
  cardHandle: string
  ownerName: string
  onAnalytics?: (type: 'CLICK' | 'SAVE', metadata: Record<string, unknown>) => void
}) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const { honeypot, setHoneypot, check, reset } = useSpamGuard()

  useEffect(() => {
    reset()
  }, [reset])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    const guard = check()
    if (guard) return
    if (!name.trim() || !body.trim()) {
      setError('Name and message are required.')
      return
    }
    setSending(true)
    setError('')
    try {
      const res = await fetch(`${API_URL}/public/cards/${cardHandle}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderName: name.trim(),
          senderEmail: email.trim(),
          message: body.trim(),
        }),
      })
      if (!res.ok) {
        const b = (await res.json().catch(() => ({}))) as { message?: string }
        setError(
          res.status === 429
            ? 'Too many messages. Try again later.'
            : (b.message ?? 'Something went wrong.'),
        )
        return
      }
      vibrate([20, 30, 60])
      onAnalytics?.('SAVE', {
        surface: 'interaction_bar',
        action: 'message_sent',
        status: 'success',
      })
      setSent(true)
    } catch {
      setError('Network error. Try again.')
    } finally {
      setSending(false)
    }
  }

  if (sent)
    return (
      <SuccessCard
        title="Message sent!"
        subtitle={`${ownerName} will see your message and can reply.`}
        onReset={() => {
          setSent(false)
          setName('')
          setEmail('')
          setBody('')
        }}
        resetLabel="Send another"
      />
    )

  return (
    <form onSubmit={(e) => void handleSend(e)} className="flex flex-col gap-3 pt-2">
      {/* Honeypot */}
      <input
        type="text"
        value={honeypot}
        onChange={(e) => setHoneypot(e.target.value)}
        tabIndex={-1}
        aria-hidden="true"
        style={{ position: 'absolute', left: -9999, width: 1, height: 1 }}
      />
      <input
        type="text"
        placeholder="Your name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        autoComplete="name"
        className={INPUT_CLS}
      />
      <input
        type="email"
        placeholder="Your email (optional)"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete="email"
        className={INPUT_CLS}
      />
      <textarea
        placeholder={`Write a message to ${ownerName}…`}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        required
        rows={3}
        className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
      <button
        type="submit"
        disabled={sending}
        className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white shadow-sm disabled:opacity-60 transition-opacity active:opacity-80"
        style={{ background: 'linear-gradient(135deg,#3b82f6,#2563eb)' }}
      >
        {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send Message'}
      </button>
    </form>
  )
}

// ─── Voice note tab ───────────────────────────────────────────────────────────

function VoiceTab({
  cardHandle,
  ownerName,
  onAnalytics,
}: {
  cardHandle: string
  ownerName: string
  onAnalytics?: (type: 'CLICK' | 'SAVE', metadata: Record<string, unknown>) => void
}) {
  const [senderName, setSenderName] = useState('')
  const [recording, setRecording] = useState(false)
  const [blob, setBlob] = useState<Blob | null>(null)
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [seconds, setSeconds] = useState(0)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const MAX_SECONDS = 120

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (blobUrl) URL.revokeObjectURL(blobUrl)
    }
  }, [blobUrl])

  async function startRecording() {
    setError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      chunksRef.current = []
      const mime = getSupportedMimeType()
      const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined)
      recorderRef.current = recorder
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop())
        const recorded = new Blob(chunksRef.current, { type: mime || 'audio/webm' })
        setBlob(recorded)
        setBlobUrl(URL.createObjectURL(recorded))
      }
      recorder.start(200)
      setRecording(true)
      setSeconds(0)
      timerRef.current = setInterval(() => {
        setSeconds((s) => {
          if (s + 1 >= MAX_SECONDS) {
            stopRecording()
            return s + 1
          }
          return s + 1
        })
      }, 1000)
    } catch {
      setError('Microphone access denied or not available.')
    }
  }

  function stopRecording() {
    recorderRef.current?.stop()
    setRecording(false)
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  async function handleUpload() {
    if (!blob) return
    if (!senderName.trim()) {
      setError('Your name is required.')
      return
    }
    setUploading(true)
    setError('')
    try {
      const mime = getSupportedMimeType() || 'audio/webm'
      const ext = mime.includes('mp4') ? 'mp4' : mime.includes('ogg') ? 'ogg' : 'webm'
      const filename = `voice-${Date.now()}.${ext}`

      // Step 1 — get presigned R2 URL
      const urlRes = await fetch(`${API_URL}/public/cards/${cardHandle}/voice-notes/upload-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename, contentType: mime, fileSizeBytes: blob.size }),
      })
      if (!urlRes.ok) {
        const b = (await urlRes.json().catch(() => ({}))) as { message?: string }
        setError(
          urlRes.status === 429
            ? 'Too many uploads. Try again later.'
            : (b.message ?? 'Upload failed.'),
        )
        return
      }
      const { uploadUrl, uploadToken } = (await urlRes.json()) as {
        uploadUrl: string
        uploadToken: string
      }

      // Step 2 — PUT directly to R2
      const putRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': mime },
        body: blob,
      })
      if (!putRes.ok) {
        setError('Upload to storage failed. Try again.')
        return
      }

      // Step 3 — confirm with API
      const confirmRes = await fetch(`${API_URL}/public/cards/${cardHandle}/voice-notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderName: senderName.trim(),
          uploadToken,
          durationSec: seconds,
        }),
      })
      if (!confirmRes.ok) {
        const b = (await confirmRes.json().catch(() => ({}))) as { message?: string }
        setError(b.message ?? 'Failed to send voice note.')
        return
      }
      vibrate([20, 30, 60])
      onAnalytics?.('SAVE', { surface: 'interaction_bar', action: 'voice_sent', status: 'success' })
      setSent(true)
    } catch {
      setError('Network error. Try again.')
    } finally {
      setUploading(false)
    }
  }

  function discard() {
    if (blobUrl) URL.revokeObjectURL(blobUrl)
    setBlob(null)
    setBlobUrl(null)
    setSeconds(0)
    setSent(false)
    setError('')
  }

  const progress = Math.min((seconds / MAX_SECONDS) * 100, 100)
  const remaining = MAX_SECONDS - seconds

  if (sent)
    return (
      <SuccessCard
        title="Voice note sent!"
        subtitle={`${ownerName} will receive your voice message.`}
        onReset={() => {
          discard()
          setSenderName('')
        }}
        resetLabel="Record another"
      />
    )

  return (
    <div className="flex flex-col items-center gap-4 pt-2">
      <input
        type="text"
        placeholder="Your name"
        value={senderName}
        onChange={(e) => setSenderName(e.target.value)}
        required
        autoComplete="name"
        className={INPUT_CLS}
      />

      {!blob && (
        <>
          {/* Record button */}
          <div
            className="flex h-20 w-20 cursor-pointer items-center justify-center rounded-full transition-transform active:scale-95"
            style={{
              background: recording
                ? 'linear-gradient(135deg,#ef4444,#dc2626)'
                : 'linear-gradient(135deg,#3b82f6,#2563eb)',
              boxShadow: recording
                ? '0 0 0 10px rgba(239,68,68,0.12), 0 6px 24px rgba(239,68,68,0.3)'
                : '0 6px 24px rgba(59,130,246,0.3)',
              animation: recording ? 'cib-pulse 1.4s ease-in-out infinite' : 'none',
            }}
            onClick={() => (recording ? stopRecording() : void startRecording())}
            role="button"
            tabIndex={0}
            onKeyDown={(e) =>
              e.key === 'Enter' && (recording ? stopRecording() : void startRecording())
            }
            aria-label={recording ? 'Stop recording' : 'Start recording'}
          >
            {recording ? (
              <Square className="h-7 w-7 text-white" />
            ) : (
              <Mic className="h-7 w-7 text-white" />
            )}
          </div>

          {/* Progress bar — only while recording */}
          {recording && (
            <div className="w-full">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${progress}%`,
                    background:
                      progress > 80 ? '#ef4444' : 'linear-gradient(90deg,#3b82f6,#2563eb)',
                  }}
                />
              </div>
              <div className="mt-1 flex justify-between text-[10px] text-slate-400">
                <span>{seconds}s</span>
                <span>{remaining}s left</span>
              </div>
            </div>
          )}

          <div className="flex flex-col items-center gap-1">
            <p className="text-sm font-semibold text-slate-700">
              {recording ? `Recording… ${seconds}s` : 'Tap to record a voice note'}
            </p>
            <p className="text-xs text-slate-400">
              {recording ? 'Tap again to stop' : `Up to ${MAX_SECONDS} seconds`}
            </p>
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}
        </>
      )}

      {blob && blobUrl && (
        <div
          className="flex w-full flex-col gap-3"
          style={{ animation: 'cib-slide-up 0.25s ease both' }}
        >
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Preview
            </p>
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <audio controls src={blobUrl} className="w-full" />
            <p className="mt-1.5 text-right text-xs text-slate-400">{seconds}s recorded</p>
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={discard}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-700 transition-opacity active:opacity-70"
            >
              <X className="h-4 w-4" /> Discard
            </button>
            <button
              onClick={() => void handleUpload()}
              disabled={uploading}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-3 text-sm font-bold text-white shadow-sm disabled:opacity-60 transition-opacity active:opacity-80"
              style={{ background: 'linear-gradient(135deg,#3b82f6,#2563eb)' }}
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {uploading ? 'Sending…' : 'Send'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Dropbox tab ──────────────────────────────────────────────────────────────

const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'text/plain',
]
const ALLOWED_EXTS = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.webp', '.gif', '.txt']
const MAX_FILE_MB = 10
const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024

function DropboxTab({
  cardHandle,
  ownerName,
  onAnalytics,
}: {
  cardHandle: string
  ownerName: string
  onAnalytics?: (type: 'CLICK' | 'SAVE', metadata: Record<string, unknown>) => void
}) {
  const [file, setFile] = useState<File | null>(null)
  const [senderName, setSenderName] = useState('')
  const [uploading, setUploading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function validateFile(f: File): string | null {
    // Check by MIME type first, fallback to extension (some mobile browsers return application/octet-stream)
    const ext = '.' + (f.name.split('.').pop() ?? '').toLowerCase()
    if (!ALLOWED_TYPES.includes(f.type) && !ALLOWED_EXTS.includes(ext)) {
      return `File type not allowed. Supported: PDF, Word, images, text.`
    }
    if (f.size > MAX_FILE_BYTES) return `File too large. Max ${MAX_FILE_MB}MB.`
    return null
  }

  function handleFilePick(f: File) {
    const err = validateFile(f)
    if (err) {
      setError(err)
      return
    }
    setFile(f)
    setError('')
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!file || !senderName.trim()) {
      setError('Your name and a file are required.')
      return
    }
    setUploading(true)
    setError('')
    try {
      const mimeType = file.type || 'application/octet-stream'

      // Step 1 — get presigned R2 URL
      const urlRes = await fetch(`${API_URL}/public/cards/${cardHandle}/dropbox/upload-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          contentType: mimeType,
          fileSizeBytes: file.size,
        }),
      })
      if (!urlRes.ok) {
        const b = (await urlRes.json().catch(() => ({}))) as { message?: string }
        setError(
          urlRes.status === 429
            ? 'Too many uploads. Try again later.'
            : (b.message ?? 'Upload failed.'),
        )
        return
      }
      const { uploadUrl, uploadToken } = (await urlRes.json()) as {
        uploadUrl: string
        uploadToken: string
      }

      // Step 2 — PUT directly to R2
      const putRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': mimeType },
        body: file,
      })
      if (!putRes.ok) {
        setError('Upload to storage failed. Try again.')
        return
      }

      // Step 3 — confirm with API
      const confirmRes = await fetch(`${API_URL}/public/cards/${cardHandle}/dropbox`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderName: senderName.trim(),
          fileName: file.name,
          uploadToken,
        }),
      })
      if (!confirmRes.ok) {
        const b = (await confirmRes.json().catch(() => ({}))) as { message?: string }
        setError(b.message ?? 'Failed to send file.')
        return
      }
      vibrate([20, 30, 60])
      onAnalytics?.('SAVE', { surface: 'interaction_bar', action: 'file_sent', status: 'success' })
      setSent(true)
    } catch {
      setError('Network error. Try again.')
    } finally {
      setUploading(false)
    }
  }

  if (sent)
    return (
      <SuccessCard
        title="File sent!"
        subtitle={`${ownerName} will receive your file.`}
        onReset={() => {
          setSent(false)
          setFile(null)
          setSenderName('')
        }}
        resetLabel="Send another"
      />
    )

  return (
    <form onSubmit={(e) => void handleUpload(e)} className="flex flex-col gap-3 pt-2">
      <input
        type="text"
        placeholder="Your name"
        value={senderName}
        onChange={(e) => setSenderName(e.target.value)}
        required
        autoComplete="name"
        className={INPUT_CLS}
      />

      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          const f = e.dataTransfer.files[0]
          if (f) handleFilePick(f)
        }}
        onClick={() => fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
        aria-label="Upload file"
        className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed py-6 transition-colors"
        style={{
          borderColor: dragOver ? '#3b82f6' : '#e2e8f0',
          background: dragOver ? '#eff6ff' : '#f8fafc',
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept={ALLOWED_EXTS.join(',')}
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) handleFilePick(f)
          }}
        />
        {file ? (
          <>
            <FileText className="h-8 w-8 text-blue-500" />
            <p className="max-w-[200px] truncate text-sm font-semibold text-slate-700">
              {file.name}
            </p>
            <p className="text-xs text-slate-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setFile(null)
              }}
              className="mt-1 flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600"
            >
              <X className="h-3 w-3" /> Remove
            </button>
          </>
        ) : (
          <>
            <FolderOpen className="h-8 w-8 text-slate-400" />
            <p className="text-sm font-semibold text-slate-600">Drop a file or tap to browse</p>
            <p className="text-xs text-slate-400">PDF, Word, images, text — max {MAX_FILE_MB}MB</p>
          </>
        )}
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <button
        type="submit"
        disabled={uploading || !file}
        className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white shadow-sm disabled:opacity-60 transition-opacity active:opacity-80"
        style={{ background: 'linear-gradient(135deg,#3b82f6,#2563eb)' }}
      >
        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        {uploading ? 'Uploading…' : `Send to ${ownerName}`}
      </button>
    </form>
  )
}

// ─── Save Contact tab ─────────────────────────────────────────────────────────

const SAVED_KEY = (handle: string) => `dotly_saved_${handle}`

function SignInPromptTab({ ownerName }: { ownerName: string }) {
  return (
    <div
      className="flex flex-col items-center gap-4 py-4 text-center"
      style={{ animation: 'cib-slide-up 0.25s ease both' }}
    >
      <div
        className="flex h-14 w-14 items-center justify-center rounded-full"
        style={{ background: '#eff6ff' }}
      >
        <UserPlus className="h-7 w-7 text-blue-500" />
      </div>
      <div>
        <p className="text-base font-bold text-slate-800">Sign in to save {ownerName}</p>
        <p className="mt-1 text-sm text-slate-500">
          Messaging, voice notes, and file drop are open to everyone. Saving to your Dotly CRM
          requires an account.
        </p>
      </div>
      <div className="flex w-full gap-2">
        <a
          href={`${SITE_URL}/auth/login`}
          className="flex-1 rounded-xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-700 transition-opacity active:opacity-70"
        >
          Sign in
        </a>
        <a
          href={`${SITE_URL}/auth/signup`}
          className="flex-1 rounded-xl py-3 text-sm font-bold text-white transition-opacity active:opacity-70"
          style={{ background: 'linear-gradient(135deg,#3b82f6,#2563eb)' }}
        >
          Create account
        </a>
      </div>
    </div>
  )
}

function SaveContactTab({
  cardId,
  cardHandle,
  ownerName,
  onAnalytics,
}: {
  cardId: string
  cardHandle: string
  ownerName: string
  onAnalytics?: (type: 'CLICK' | 'SAVE', metadata: Record<string, unknown>) => void
}) {
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const shareUrl = `${SITE_URL}/card/${encodeURIComponent(cardHandle)}`

  // Check local "already saved" state on mount
  useEffect(() => {
    try {
      if (localStorage.getItem(SAVED_KEY(cardHandle)) === '1') setSaved(true)
    } catch {
      /* ignore */
    }
  }, [cardHandle])

  async function handleSave() {
    setSaving(true)
    setError('')
    try {
      const token = await getAccessToken()
      if (!token) {
        setError('You must be signed in to save contacts.')
        return
      }
      // 1. Save to Dotly CRM
      await apiPost(
        '/contacts',
        {
          name: ownerName,
          sourceCardId: cardId,
          sourceHandle: cardHandle,
        },
        token,
      )
      vibrate([20, 30, 60])
      try {
        localStorage.setItem(SAVED_KEY(cardHandle), '1')
      } catch {
        /* ignore */
      }
      // 2. Also download the vCard so the contact lands in their phone's address book.
      //    Uses fetch + Authorization header (the endpoint no longer accepts ?token=).
      await downloadVcardFetch(cardHandle, token)
      onAnalytics?.('SAVE', {
        surface: 'interaction_bar',
        action: 'save_contact',
        status: 'success',
      })
      setSaved(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save. Try again.')
    } finally {
      setSaving(false)
    }
  }

  if (saved)
    return (
      <SuccessCard
        title={`${ownerName} saved!`}
        subtitle="Contact saved to your CRM. They'll be notified you connected."
        onReset={() => {}} // can't un-save; button navigates nowhere but label should be non-empty
        resetLabel="Done"
        shareUrl={shareUrl}
      />
    )

  return (
    <div
      className="flex flex-col items-center gap-4 py-4"
      style={{ animation: 'cib-slide-up 0.25s ease both' }}
    >
      <div
        className="flex h-14 w-14 items-center justify-center rounded-full"
        style={{ background: '#eff6ff' }}
      >
        <UserPlus className="h-7 w-7 text-blue-500" />
      </div>
      <div className="text-center">
        <p className="text-base font-bold text-slate-800">Save {ownerName}</p>
        <p className="mt-1 text-sm text-slate-500">
          Add to your Dotly CRM. {ownerName} gets notified and can add you back.
        </p>
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <button
        onClick={() => void handleSave()}
        disabled={saving}
        className="flex w-full items-center justify-center gap-2.5 rounded-xl py-3.5 text-sm font-bold text-white shadow-sm disabled:opacity-60 transition-opacity active:opacity-80"
        style={{ background: 'linear-gradient(135deg,#3b82f6,#2563eb)' }}
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
        {saving ? 'Saving…' : `Save ${ownerName}`}
      </button>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function CardInteractionBar({ cardId, cardHandle, ownerName, onAnalytics }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('message')
  const [isAuth, setIsAuth] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)

  useEffect(() => {
    getAccessToken()
      .then((token) => {
        setIsAuth(!!token)
        setAuthChecked(true)
      })
      .catch(() => setAuthChecked(true))
  }, [])

  // Wait until auth is resolved so we know which tabs to show.
  // Render nothing during the brief auth-check window to avoid layout shift.
  if (!authChecked) return null

  // Authenticated users get all 4 tabs; guests get Message / Voice / Dropbox.
  // The Save Contact tab requires a Dotly account to persist to the CRM.
  const allTabs: { id: Tab; icon: React.ReactNode; label: string }[] = [
    { id: 'contact', icon: <UserPlus className="h-4 w-4" />, label: 'Save' },
    { id: 'message', icon: <MessageSquare className="h-4 w-4" />, label: 'Message' },
    { id: 'voice', icon: <Mic className="h-4 w-4" />, label: 'Voice' },
    { id: 'dropbox', icon: <FolderOpen className="h-4 w-4" />, label: 'Dropbox' },
  ]
  const tabs = isAuth ? allTabs : allTabs.filter((t) => t.id !== 'contact')

  const firstName = ownerName.split(' ')[0] ?? ownerName

  return (
    <>
      <style>{GLOBAL_STYLES}</style>

      {/* Backdrop — fixed sibling at z-40, behind the sheet (z-50) but above card content */}
      {expanded && (
        <div
          className="fixed inset-0 z-40"
          style={{
            background: 'rgba(15,23,42,0.45)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
          }}
          onClick={() => setExpanded(false)}
          aria-hidden="true"
        />
      )}

      {/* Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50" style={{ fontFamily: 'inherit' }}>
        <div
          className="mx-auto max-w-lg"
          style={{
            background: '#ffffff',
            borderRadius: '20px 20px 0 0',
            boxShadow: '0 -8px 48px rgba(0,0,0,0.18)',
          }}
        >
          {/* Handle bar */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="h-1 w-10 rounded-full bg-slate-200" />
          </div>

          {/* Collapsed toggle row */}
          <button
            onClick={() => {
              const nextExpanded = !expanded
              onAnalytics?.('CLICK', {
                surface: 'interaction_bar',
                action: nextExpanded ? 'expand' : 'collapse',
              })
              setExpanded(nextExpanded)
            }}
            aria-expanded={expanded}
            aria-label={
              expanded ? 'Collapse' : isAuth ? `Connect with ${firstName}` : `Message ${firstName}`
            }
            className="flex w-full items-center justify-between px-4 py-2.5"
          >
            <span className="truncate text-xs font-bold uppercase tracking-wider text-slate-500">
              {expanded
                ? 'Interact'
                : isAuth
                  ? `Connect with ${firstName}`
                  : `Message ${firstName}`}
            </span>

            <div className="flex shrink-0 items-center gap-2">
              {/* Quick-launch pills — only when collapsed */}
              {!expanded && (
                <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                  {tabs.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => {
                        onAnalytics?.('CLICK', {
                          surface: 'interaction_bar',
                          action: 'quick_launch_tab',
                          status: t.id,
                        })
                        setActiveTab(t.id)
                        setExpanded(true)
                      }}
                      className="flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-semibold transition-opacity active:opacity-70"
                      style={{
                        background: 'linear-gradient(135deg,#eff6ff,#dbeafe)',
                        color: '#2563eb',
                      }}
                    >
                      {t.icon}
                      <span className="hidden sm:inline">{t.label}</span>
                    </button>
                  ))}
                </div>
              )}

              <ChevronUp
                className="h-4 w-4 text-slate-400 transition-transform duration-200"
                style={{ transform: expanded ? 'rotate(180deg)' : 'none' }}
              />
            </div>
          </button>

          {/* Expanded panel */}
          {expanded && (
            <div
              className="px-4"
              style={{
                paddingBottom: 'max(2rem, calc(env(safe-area-inset-bottom) + 1.5rem))',
                animation: 'cib-slide-up 0.22s ease both',
              }}
            >
              {/* Tab bar */}
              <div className="mb-4 flex gap-1 rounded-xl bg-slate-100 p-1">
                {tabs.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      onAnalytics?.('CLICK', {
                        surface: 'interaction_bar',
                        action: 'tab_selected',
                        status: t.id,
                      })
                      setActiveTab(t.id)
                    }}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-all"
                    style={{
                      background: activeTab === t.id ? '#fff' : 'transparent',
                      color: activeTab === t.id ? '#1e40af' : '#64748b',
                      boxShadow: activeTab === t.id ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                    }}
                  >
                    {t.icon}
                    <span className="hidden xs:inline sm:inline">{t.label}</span>
                  </button>
                ))}
              </div>

              {/* Tab content */}
              {activeTab === 'contact' && isAuth && (
                <SaveContactTab
                  cardId={cardId}
                  cardHandle={cardHandle}
                  ownerName={ownerName}
                  onAnalytics={onAnalytics}
                />
              )}
              {activeTab === 'contact' && !isAuth && <SignInPromptTab ownerName={ownerName} />}
              {activeTab === 'message' && (
                <MessageTab
                  cardHandle={cardHandle}
                  ownerName={ownerName}
                  onAnalytics={onAnalytics}
                />
              )}
              {activeTab === 'voice' && (
                <VoiceTab cardHandle={cardHandle} ownerName={ownerName} onAnalytics={onAnalytics} />
              )}
              {activeTab === 'dropbox' && (
                <DropboxTab
                  cardHandle={cardHandle}
                  ownerName={ownerName}
                  onAnalytics={onAnalytics}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
