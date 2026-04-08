'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { getAccessToken } from '@/lib/supabase/client'
import { apiPost } from '@/lib/api'
import { CardTemplate } from '@dotly/types'

const TEMPLATES: { id: CardTemplate; label: string; description: string; emoji: string }[] = [
  {
    id: CardTemplate.MINIMAL,
    label: 'Minimal',
    description: 'Clean white card with centered layout. Perfect for professionals.',
    emoji: '⬜',
  },
  {
    id: CardTemplate.BOLD,
    label: 'Bold',
    description: 'Dark background with strong typography. Makes a statement.',
    emoji: '⬛',
  },
  {
    id: CardTemplate.CREATIVE,
    label: 'Creative',
    description: 'Gradient background with portfolio strip. Great for creators.',
    emoji: '🎨',
  },
  {
    id: CardTemplate.CORPORATE,
    label: 'Corporate',
    description: 'Two-column professional layout with company branding.',
    emoji: '🏢',
  },
]

export default function CreateCardPage() {
  const router = useRouter()
  const [selected, setSelected] = useState<CardTemplate>(CardTemplate.MINIMAL)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCreate = async () => {
    setLoading(true)
    setError(null)
    try {
      const token = await getAccessToken()

      const card = await apiPost<{ id: string }>('/cards', { templateId: selected }, token)
      router.push(`/cards/${card.id}/edit`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create card')
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Choose a Template</h1>
        <p className="mt-1 text-sm text-gray-500">
          Pick a starting template. You can customize everything in the editor.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {TEMPLATES.map((tmpl) => (
          <button
            key={tmpl.id}
            type="button"
            onClick={() => setSelected(tmpl.id)}
            className={[
              'flex flex-col gap-3 rounded-xl border-2 p-5 text-left transition-all',
              selected === tmpl.id
                ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-500 ring-offset-2'
                : 'border-gray-200 bg-white hover:border-gray-300',
            ].join(' ')}
          >
            <span className="text-3xl">{tmpl.emoji}</span>
            <div>
              <p className="font-semibold text-gray-900">{tmpl.label}</p>
              <p className="mt-1 text-xs text-gray-500">{tmpl.description}</p>
            </div>
          </button>
        ))}
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      <button
        type="button"
        onClick={handleCreate}
        disabled={loading}
        className="w-full rounded-lg bg-brand-500 py-3 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
      >
        {loading ? 'Creating…' : `Create ${selected.charAt(0) + selected.slice(1).toLowerCase()} Card →`}
      </button>
    </div>
  )
}
