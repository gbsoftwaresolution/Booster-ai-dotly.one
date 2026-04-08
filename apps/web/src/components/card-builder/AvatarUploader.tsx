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
import { useState, useRef, useCallback, useEffect } from 'react'
import Cropper from 'react-easy-crop'
import type { Area } from 'react-easy-crop'
import { X, Link2, Upload, Camera, Check, Loader2, AlertCircle, Trash2 } from 'lucide-react'
import { cn } from '@/lib/cn'
import { apiPost } from '@/lib/api'
import { getAccessToken } from '@/lib/supabase/client'

// ─── Types ──────────────────────────────────────────────────────────────────

type Tab = 'url' | 'upload' | 'camera'

interface AvatarUploaderProps {
  cardId: string
  currentAvatarUrl?: string
  onAvatarChange: (url: string) => void
  onClose: () => void
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
    { filename, contentType: mimeType },
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
      onClick={onClick}
      className={cn(
        'flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition-all',
        active ? 'bg-white text-brand-600 shadow-sm' : 'text-gray-500 hover:text-gray-700',
      )}
    >
      <Icon className="h-3.5 w-3.5" />
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
        <span className="text-xs text-gray-400 w-8 text-right">–</span>
        <input
          type="range"
          min={1}
          max={3}
          step={0.01}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="flex-1 accent-brand-500"
        />
        <span className="text-xs text-gray-400 w-8">+</span>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-600">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {error}
        </div>
      )}

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
              <Loader2 className="h-4 w-4 animate-spin" /> Uploading…
            </>
          ) : (
            <>
              <Check className="h-4 w-4" /> Use Photo
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
  const [preview, setPreview] = useState(current ? true : false)
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
        <Link2 className="h-4 w-4 shrink-0 text-gray-400" />
        <input
          type="url"
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            setPreview(false)
          }}
          onBlur={handleBlur}
          placeholder="https://example.com/photo.jpg"
          className="flex-1 bg-transparent text-sm text-gray-900 placeholder:text-gray-400 outline-none"
        />
      </div>

      {preview && value && (
        <div className="flex justify-center">
          {imgError ? (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-600">
              <AlertCircle className="h-3.5 w-3.5" /> Could not load image — check the URL
            </div>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={value}
              alt="preview"
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
        <Check className="h-4 w-4" /> Use this URL
      </button>
    </div>
  )
}

// ─── Tab: Upload + Crop ──────────────────────────────────────────────────────

function UploadTab({ cardId, onConfirm }: { cardId: string; onConfirm: (url: string) => void }) {
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const ALLOWED = ['image/jpeg', 'image/png', 'image/webp']

  async function handleFile(file: File) {
    if (!ALLOWED.includes(file.type)) {
      setError('Only JPEG, PNG, and WebP images are supported.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('File is too large. Maximum size is 10 MB.')
      return
    }
    setError(null)
    const reader = new FileReader()
    reader.onload = () => setImageSrc(reader.result as string)
    reader.readAsDataURL(file)
  }

  async function handleCropConfirm(pixels: Area) {
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
  }

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
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          const file = e.dataTransfer.files[0]
          if (file) handleFile(file)
        }}
        className={cn(
          'flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50',
          'cursor-pointer py-10 text-center transition-colors hover:border-brand-400 hover:bg-brand-50',
        )}
      >
        <Upload className="h-8 w-8 text-gray-300" />
        <div>
          <p className="text-sm font-semibold text-gray-700">Click or drag an image here</p>
          <p className="text-xs text-gray-400 mt-0.5">JPEG · PNG · WebP up to 10 MB</p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-600">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {error}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) handleFile(f)
        }}
      />
    </div>
  )
}

// ─── Tab: Camera ─────────────────────────────────────────────────────────────

function CameraTab({ cardId, onConfirm }: { cardId: string; onConfirm: (url: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [captured, setCaptured] = useState<string | null>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  // Start camera when tab mounts
  useEffect(() => {
    let active = true
    async function startCamera() {
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        })
        if (!active) {
          s.getTracks().forEach((t) => t.stop())
          return
        }
        setStream(s)
        if (videoRef.current) videoRef.current.srcObject = s
      } catch {
        if (active) setCameraError('Camera access denied or not available on this device.')
      }
    }
    startCamera()
    return () => {
      active = false
      stream?.getTracks().forEach((t) => t.stop())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Stop stream when leaving
  function stopStream() {
    stream?.getTracks().forEach((t) => t.stop())
    setStream(null)
  }

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

  async function handleCropConfirm(pixels: Area) {
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
  }

  function retake() {
    setCaptured(null)
    // restart camera
    async function restart() {
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        })
        setStream(s)
        if (videoRef.current) videoRef.current.srcObject = s
      } catch {
        setCameraError('Camera access denied or not available.')
      }
    }
    restart()
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
        <AlertCircle className="h-8 w-8 text-red-400" />
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
        <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
        {/* Guide circle overlay */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-48 w-48 rounded-full border-2 border-white/60 shadow-inner" />
        </div>
      </div>

      <button
        type="button"
        onClick={capture}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 transition-colors"
      >
        <Camera className="h-4 w-4" /> Take Photo
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

  function handleConfirm(url: string) {
    onAvatarChange(url)
    onClose()
  }

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" aria-hidden />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-sm rounded-t-3xl sm:rounded-3xl bg-white p-5 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-gray-900">Profile Photo</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <X className="h-4 w-4" />
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
              title="Remove photo"
              onClick={() => {
                onAvatarChange('')
                onClose()
              }}
              className="rounded-full p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Tab switcher */}
        <div className="flex gap-1 rounded-xl bg-gray-100 p-1 mb-4">
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
