'use client'

/**
 * AvatarUploader
 *
 * A modal with three tabs for setting a card's profile picture:
 *   1. URL  — paste any image URL directly
 *   2. Upload — pick / drag a file, crop it 1:1, upload to R2 via signed URL
 *   3. Camera — capture a photo from the user's webcam, crop it 1:1, upload
 *
 * On success, calls `onAvatarChange(publicUrl)`.
 * If the user has no avatar yet (or clears it), initials are shown by AvatarBlock.
 */

import type { JSX } from 'react'
import { useState, useRef, useEffect, useCallback } from 'react'
import Cropper from 'react-easy-crop'
import type { Area } from 'react-easy-crop'
import { X, Link2, Upload, Camera, Check, Loader2, AlertCircle, Trash2 } from 'lucide-react'
import { cn } from '@/lib/cn'
import { apiPost } from '@/lib/api'
import { getAccessToken } from '@/lib/supabase/client'

// ─── Module-level constants ──────────────────────────────────────────────────

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB

// ─── Types ──────────────────────────────────────────────────────────────────

type Tab = 'url' | 'upload' | 'camera'

interface AvatarUploaderProps {
  cardId: string
  currentAvatarUrl?: string
  onAvatarChange: (url: string) => void
  onClose: () => void
}

// ─── useFocusTrap: traps Tab/Shift-Tab inside a container, handles Escape ───

function useFocusTrap(
  ref: React.RefObject<HTMLElement | null>,
  active: boolean,
  onEscape?: () => void,
) {
  useEffect(() => {
    if (!active || !ref.current) return
    const el = ref.current
    const focusable = el.querySelectorAll<HTMLElement>(
      'button:not([disabled]),input:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])',
    )
    const first = focusable[0]
    const last = focusable[focusable.length - 1]

    // Auto-focus first focusable element
    first?.focus()

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        onEscape?.()
        return
      }
      if (e.key !== 'Tab') return
      if (focusable.length === 0) {
        e.preventDefault()
        return
      }
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last?.focus()
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          first?.focus()
        }
      }
    }
    el.addEventListener('keydown', onKeyDown)
    return () => el.removeEventListener('keydown', onKeyDown)
  }, [active, ref, onEscape])
}

// ─── ErrorBanner ─────────────────────────────────────────────────────────────

function ErrorBanner({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-600"
    >
      <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      {message}
    </div>
  )
}

// ─── Canvas helper: crop a loaded image to a circular/square area ────────────

async function getCroppedBlob(
  imageSrc: string,
  pixelCrop: Area,
  mimeType: 'image/jpeg' | 'image/webp' = 'image/webp',
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => {
      const canvas = document.createElement('canvas')
      const SIZE = 512
      canvas.width = SIZE
      canvas.height = SIZE
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Canvas not supported'))
        return
      }
      ctx.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        SIZE,
        SIZE,
      )
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Failed to produce blob'))
            return
          }
          resolve(blob)
        },
        mimeType,
        0.92,
      )
    }
    image.onerror = () => reject(new Error('Failed to load image for cropping'))
    image.src = imageSrc
  })
}

// ─── Upload helper: get signed URL then PUT blob directly to R2 ──────────────

async function uploadBlobToR2(cardId: string, blob: Blob, mimeType: string): Promise<string> {
  const token = await getAccessToken()
  const ext = mimeType === 'image/webp' ? 'webp' : 'jpg'
  const filename = `avatar-${Date.now()}.${ext}`
  const { uploadUrl, publicUrl } = await apiPost<{ uploadUrl: string; publicUrl: string }>(
    `/cards/${cardId}/upload-url`,
    { filename, contentType: mimeType, fileSizeBytes: blob.size },
    token,
  )
  const res = await fetch(uploadUrl, {
    method: 'PUT',
    body: blob,
    headers: { 'Content-Type': mimeType },
  })
  if (!res.ok) throw new Error('Upload to storage failed — please try again')
  return publicUrl
}

// ─── Tiny tab button ─────────────────────────────────────────────────────────

function TabBtn({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: React.ElementType
  label: string
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        'flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition-all',
        active ? 'bg-white text-brand-600 shadow-sm' : 'text-gray-500 hover:text-gray-700',
      )}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
    </button>
  )
}

// ─── Crop pane (shared between Upload and Camera tabs) ───────────────────────

function CropPane({
  src,
  onConfirm,
  onCancel,
  uploading,
  error,
}: {
  src: string
  onConfirm: (croppedArea: Area) => void
  onCancel: () => void
  uploading: boolean
  error: string | null
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedArea, setCroppedArea] = useState<Area | null>(null)

  return (
    <div className="flex flex-col gap-4">
      {/* Crop area */}
      <div className="relative w-full rounded-2xl overflow-hidden bg-black" style={{ height: 280 }}>
        <Cropper
          image={src}
          crop={crop}
          zoom={zoom}
          aspect={1}
          cropShape="round"
          showGrid={false}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={(_: Area, pixels: Area) => setCroppedArea(pixels)}
        />
      </div>

      {/* Zoom slider */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-400 w-8 text-right" aria-hidden="true">–</span>
        <input
          type="range"
          min={1}
          max={3}
          step={0.01}
          value={zoom}
          aria-label="Zoom level"
          onChange={(e) => setZoom(Number(e.target.value))}
          className="flex-1 accent-brand-500"
        />
        <span className="text-xs text-gray-400 w-8" aria-hidden="true">+</span>
      </div>

      {error && <ErrorBanner message={error} />}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={uploading}
          className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          Back
        </button>
        <button
          type="button"
          disabled={!croppedArea || uploading}
          onClick={() => croppedArea && onConfirm(croppedArea)}
          className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 transition-colors disabled:opacity-50"
        >
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Uploading…
            </>
          ) : (
            <>
              <Check className="h-4 w-4" aria-hidden="true" /> Use Photo
            </>
          )}
        </button>
      </div>
    </div>
  )
}

// ─── Tab: URL ────────────────────────────────────────────────────────────────

function UrlTab({ current, onConfirm }: { current: string; onConfirm: (url: string) => void }) {
  const [value, setValue] = useState(current)
  const [preview, setPreview] = useState(!!current)
  const [imgError, setImgError] = useState(false)

  function handleBlur() {
    if (value.trim()) {
      setPreview(true)
      setImgError(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-gray-500">Paste a publicly accessible image URL.</p>

      <div
        className={cn(
          'flex items-center gap-2.5 rounded-2xl border border-gray-200 bg-gray-50 px-3.5 py-3',
          'focus-within:border-brand-400 focus-within:bg-white focus-within:ring-2 focus-within:ring-brand-500/20',
        )}
      >
        <Link2 className="h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
        <input
          type="url"
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            setPreview(false)
          }}
          onBlur={handleBlur}
          placeholder="https://example.com/photo.jpg"
          aria-label="Image URL"
          className="flex-1 bg-transparent text-sm text-gray-900 placeholder:text-gray-400 outline-none"
        />
      </div>

      {preview && value && (
        <div className="flex justify-center">
          {imgError ? (
            <ErrorBanner message="Could not load image — check the URL" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={value}
              alt="URL preview"
              onError={() => setImgError(true)}
              className="h-28 w-28 rounded-full object-cover ring-4 ring-brand-100"
            />
          )}
        </div>
      )}

      <button
        type="button"
        disabled={!value.trim() || imgError}
        onClick={() => onConfirm(value.trim())}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 transition-colors disabled:opacity-50"
      >
        <Check className="h-4 w-4" aria-hidden="true" /> Use this URL
      </button>
    </div>
  )
}

// ─── Tab: Upload + Crop ──────────────────────────────────────────────────────

function UploadTab({ cardId, onConfirm }: { cardId: string; onConfirm: (url: string) => void }) {
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(async (file: File) => {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type as typeof ALLOWED_IMAGE_TYPES[number])) {
      setError('Only JPEG, PNG, and WebP images are supported.')
      return
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError('File is too large. Maximum size is 10 MB.')
      return
    }
    setError(null)
    const reader = new FileReader()
    reader.onload = () => setImageSrc(reader.result as string)
    reader.readAsDataURL(file)
  }, [])

  const handleCropConfirm = useCallback(async (pixels: Area) => {
    if (!imageSrc) return
    setUploading(true)
    setError(null)
    try {
      const blob = await getCroppedBlob(imageSrc, pixels, 'image/webp')
      const url = await uploadBlobToR2(cardId, blob, 'image/webp')
      onConfirm(url)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }, [imageSrc, cardId, onConfirm])

  if (imageSrc) {
    return (
      <CropPane
        src={imageSrc}
        onConfirm={handleCropConfirm}
        onCancel={() => setImageSrc(null)}
        uploading={uploading}
        error={error}
      />
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        aria-label="Click or drag an image to upload"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragActive(true) }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragActive(false)
          const file = e.dataTransfer.files[0]
          if (file) void handleFile(file)
        }}
        className={cn(
          'flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed py-10 text-center transition-colors',
          dragActive
            ? 'border-brand-400 bg-brand-50'
            : 'border-gray-200 bg-gray-50 cursor-pointer hover:border-brand-400 hover:bg-brand-50',
        )}
      >
        <Upload className="h-8 w-8 text-gray-300" aria-hidden="true" />
        <div>
          <p className="text-sm font-semibold text-gray-700">Click or drag an image here</p>
          <p className="text-xs text-gray-400 mt-0.5">JPEG · PNG · WebP up to 10 MB</p>
        </div>
      </button>

      {error && <ErrorBanner message={error} />}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        aria-hidden="true"
        tabIndex={-1}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) void handleFile(f)
          // Reset so same file can be selected again
          e.target.value = ''
        }}
      />
    </div>
  )
}

// ─── Tab: Camera ─────────────────────────────────────────────────────────────

function CameraTab({ cardId, onConfirm }: { cardId: string; onConfirm: (url: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  // Use ref to avoid stale-closure issues in cleanup
  const streamRef = useRef<MediaStream | null>(null)
  const [cameraReady, setCameraReady] = useState(false)
  const [captured, setCaptured] = useState<string | null>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const startCamera = useCallback(async () => {
    setCameraError(null)
    setCameraReady(false)
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
      })
      streamRef.current = s
      if (videoRef.current) {
        videoRef.current.srcObject = s
        videoRef.current.onloadedmetadata = () => setCameraReady(true)
      }
    } catch {
      setCameraError('Camera access denied or not available on this device.')
    }
  }, [])

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setCameraReady(false)
  }, [])

  // Start camera when tab mounts, stop on unmount
  useEffect(() => {
    void startCamera()
    return () => stopStream()
  }, [startCamera, stopStream])

  function capture() {
    const video = videoRef.current
    if (!video) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0)
    const dataUrl = canvas.toDataURL('image/webp', 0.95)
    stopStream()
    setCaptured(dataUrl)
  }

  const handleCropConfirm = useCallback(async (pixels: Area) => {
    if (!captured) return
    setUploading(true)
    setUploadError(null)
    try {
      const blob = await getCroppedBlob(captured, pixels, 'image/webp')
      const url = await uploadBlobToR2(cardId, blob, 'image/webp')
      onConfirm(url)
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }, [captured, cardId, onConfirm])

  function retake() {
    setCaptured(null)
    void startCamera()
  }

  if (captured) {
    return (
      <CropPane
        src={captured}
        onConfirm={handleCropConfirm}
        onCancel={retake}
        uploading={uploading}
        error={uploadError}
      />
    )
  }

  if (cameraError) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl bg-red-50 px-4 py-10 text-center">
        <AlertCircle className="h-8 w-8 text-red-400" aria-hidden="true" />
        <p className="text-sm text-red-600">{cameraError}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div
        className="relative w-full overflow-hidden rounded-2xl bg-black"
        style={{ aspectRatio: '4/3' }}
      >
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          aria-label="Camera preview"
          className="h-full w-full object-cover"
        />
        {/* Loading overlay while camera initialises */}
        {!cameraReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <Loader2 className="h-8 w-8 animate-spin text-white" aria-hidden="true" />
          </div>
        )}
        {/* Guide circle overlay */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-48 w-48 rounded-full border-2 border-white/60 shadow-inner" />
        </div>
      </div>

      <button
        type="button"
        onClick={capture}
        disabled={!cameraReady}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Camera className="h-4 w-4" aria-hidden="true" /> Take Photo
      </button>
    </div>
  )
}

// ─── Main modal ──────────────────────────────────────────────────────────────

export function AvatarUploader({
  cardId,
  currentAvatarUrl,
  onAvatarChange,
  onClose,
}: AvatarUploaderProps): JSX.Element {
  const [tab, setTab] = useState<Tab>('upload')
  const panelRef = useRef<HTMLDivElement>(null)

  const handleConfirm = useCallback((url: string) => {
    onAvatarChange(url)
    onClose()
  }, [onAvatarChange, onClose])

  // Focus trap + Escape key inside the panel
  useFocusTrap(panelRef, true, onClose)

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" aria-hidden="true" />

      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="avatar-dialog-title"
        className="relative z-10 w-full max-w-sm rounded-t-3xl sm:rounded-3xl bg-white p-5 shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 id="avatar-dialog-title" className="text-base font-bold text-gray-900">
            Profile Photo
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close profile photo dialog"
            className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Current avatar preview + remove */}
        {currentAvatarUrl && (
          <div className="flex items-center gap-3 mb-4 p-3 rounded-2xl bg-gray-50 border border-gray-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={currentAvatarUrl}
              alt="Current avatar"
              className="h-12 w-12 rounded-full object-cover ring-2 ring-brand-100"
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-700">Current photo</p>
              <p className="text-xs text-gray-400 truncate">{currentAvatarUrl}</p>
            </div>
            <button
              type="button"
              aria-label="Remove current photo"
              onClick={() => {
                onAvatarChange('')
                onClose()
              }}
              className="rounded-full p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        )}

        {/* Tab switcher */}
        <div role="tablist" aria-label="Photo source" className="flex gap-1 rounded-xl bg-gray-100 p-1 mb-4">
          <TabBtn
            active={tab === 'upload'}
            onClick={() => setTab('upload')}
            icon={Upload}
            label="Upload"
          />
          <TabBtn active={tab === 'url'} onClick={() => setTab('url')} icon={Link2} label="URL" />
          <TabBtn
            active={tab === 'camera'}
            onClick={() => setTab('camera')}
            icon={Camera}
            label="Camera"
          />
        </div>

        {/* Tab content */}
        {tab === 'url' && <UrlTab current={currentAvatarUrl ?? ''} onConfirm={handleConfirm} />}
        {tab === 'upload' && <UploadTab cardId={cardId} onConfirm={handleConfirm} />}
        {tab === 'camera' && <CameraTab cardId={cardId} onConfirm={handleConfirm} />}
      </div>
    </div>
  )
}
