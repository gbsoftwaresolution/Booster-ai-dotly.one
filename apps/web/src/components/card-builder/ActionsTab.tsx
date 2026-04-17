'use client'

import type { JSX } from 'react'
import type {
  CardActionsConfig,
  CardActionConfig,
  CardActionType,
  PartialCardFields,
} from '@dotly/types'
import { MessageCircleMore, CalendarDays, ClipboardList } from 'lucide-react'
import { cn } from '@/lib/cn'

interface ActionsTabProps {
  fields: PartialCardFields
  onActionsChange: (actions: CardActionsConfig | undefined) => void
}

const ACTION_ORDER: CardActionType[] = ['BOOK', 'WHATSAPP_CHAT', 'LEAD_CAPTURE']

const ACTION_META: Record<
  CardActionType,
  { label: string; description: string; Icon: React.ElementType; defaultLabel: string }
> = {
  BOOK: {
    label: 'Book',
    description: 'Send visitors to your booking page.',
    Icon: CalendarDays,
    defaultLabel: 'Book call',
  },
  WHATSAPP_CHAT: {
    label: 'WhatsApp Chat',
    description: 'Open a prefilled WhatsApp conversation.',
    Icon: MessageCircleMore,
    defaultLabel: 'Chat now',
  },
  LEAD_CAPTURE: {
    label: 'Lead Capture',
    description: 'Open your lead capture form on the card.',
    Icon: ClipboardList,
    defaultLabel: 'Leave details',
  },
}

function normalizeActions(fields: PartialCardFields): CardActionsConfig {
  const configured = fields.actions
  if (configured && (configured.primary || (configured.secondary?.length ?? 0) > 0)) {
    return configured
  }

  return {
    primary: { type: 'BOOK', enabled: true, label: ACTION_META.BOOK.defaultLabel },
    secondary: [
      { type: 'WHATSAPP_CHAT', enabled: true, label: ACTION_META.WHATSAPP_CHAT.defaultLabel },
      { type: 'LEAD_CAPTURE', enabled: true, label: ACTION_META.LEAD_CAPTURE.defaultLabel },
    ],
  }
}

function availableSecondaryTypes(primaryType: CardActionType): CardActionType[] {
  return ACTION_ORDER.filter((type) => type !== primaryType)
}

function buildAction(type: CardActionType, previous?: CardActionConfig | null): CardActionConfig {
  return {
    type,
    enabled: previous?.enabled ?? true,
    label: previous?.label?.trim() || ACTION_META[type].defaultLabel,
    ...(type === 'WHATSAPP_CHAT' && previous?.whatsappMessage
      ? { whatsappMessage: previous.whatsappMessage }
      : {}),
  }
}

export function ActionsTab({ fields, onActionsChange }: ActionsTabProps): JSX.Element {
  const actions = normalizeActions(fields)
  const primary = buildAction(actions.primary?.type ?? 'BOOK', actions.primary)
  const secondary = (actions.secondary ?? []).slice(0, 2)
  const firstSecondaryType = secondary[0]?.type ?? 'WHATSAPP_CHAT'
  const secondSecondaryType =
    secondary[1]?.type ??
    availableSecondaryTypes(primary.type).find((type) => type !== firstSecondaryType) ??
    'LEAD_CAPTURE'

  function update(next: CardActionsConfig) {
    onActionsChange(next)
  }

  function updatePrimary(type: CardActionType) {
    const nextPrimary = buildAction(type, type === primary.type ? primary : null)
    const allowedSecondary = availableSecondaryTypes(type)
    const nextSecondaryTypes = [firstSecondaryType, secondSecondaryType].filter(
      (secondaryType, index, arr) =>
        allowedSecondary.includes(secondaryType) && arr.indexOf(secondaryType) === index,
    )

    while (nextSecondaryTypes.length < 2) {
      const fallback = allowedSecondary.find((candidate) => !nextSecondaryTypes.includes(candidate))
      if (!fallback) break
      nextSecondaryTypes.push(fallback)
    }

    update({
      primary: nextPrimary,
      secondary: nextSecondaryTypes.slice(0, 2).map((secondaryType) => {
        const existing = secondary.find((item) => item.type === secondaryType)
        return buildAction(secondaryType, existing)
      }),
    })
  }

  function updateSecondary(slot: 0 | 1, type: CardActionType) {
    const allowedSecondary = availableSecondaryTypes(primary.type)
    const nextTypes: CardActionType[] = [firstSecondaryType, secondSecondaryType]
    nextTypes[slot] = type
    const currentFirst = nextTypes[0] ?? firstSecondaryType
    const currentSecond = nextTypes[1] ?? secondSecondaryType

    const firstAllowed = allowedSecondary[0] ?? 'WHATSAPP_CHAT'
    if (!allowedSecondary.includes(currentFirst)) {
      nextTypes[0] = firstAllowed
    }
    if (!allowedSecondary.includes(currentSecond) || currentSecond === nextTypes[0]) {
      nextTypes[1] =
        allowedSecondary.find((candidate) => candidate !== nextTypes[0]) ??
        nextTypes[0] ??
        firstAllowed
    }

    update({
      primary,
      secondary: nextTypes.map((secondaryType) => {
        const existing = secondary.find((item) => item.type === secondaryType)
        return buildAction(secondaryType, existing)
      }),
    })
  }

  function updateLabel(type: CardActionType, label: string) {
    update({
      primary: primary.type === type ? { ...primary, label } : primary,
      secondary: [firstSecondaryType, secondSecondaryType].map((secondaryType) => {
        const existing = buildAction(
          secondaryType,
          secondary.find((item) => item.type === secondaryType),
        )
        return secondaryType === type ? { ...existing, label } : existing
      }),
    })
  }

  function updateWhatsappMessage(message: string) {
    update({
      primary:
        primary.type === 'WHATSAPP_CHAT' ? { ...primary, whatsappMessage: message } : primary,
      secondary: [firstSecondaryType, secondSecondaryType].map((secondaryType) => {
        const existing = buildAction(
          secondaryType,
          secondary.find((item) => item.type === secondaryType),
        )
        return secondaryType === 'WHATSAPP_CHAT'
          ? { ...existing, whatsappMessage: message }
          : existing
      }),
    })
  }

  const whatsappAction =
    primary.type === 'WHATSAPP_CHAT'
      ? primary
      : [firstSecondaryType, secondSecondaryType]
          .map((type) =>
            buildAction(
              type,
              secondary.find((item) => item.type === type),
            ),
          )
          .find((item) => item.type === 'WHATSAPP_CHAT')

  return (
    <div className="space-y-5">
      <div className="rounded-[28px] border border-slate-200 bg-white/70 p-5 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.22)]">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">CTA stack</p>
        <h3 className="mt-2 text-lg font-bold tracking-tight text-slate-900">
          Choose the actions every visitor sees first
        </h3>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Keep the stack focused: booking first, WhatsApp second, lead capture third.
        </p>
      </div>

      <ActionSelectCard
        title="Primary action"
        subtitle="The main action at the top of your public card."
        value={primary.type}
        options={ACTION_ORDER}
        onChange={updatePrimary}
      />

      <ActionSelectCard
        title="Secondary action 1"
        subtitle="Shown below the primary action."
        value={firstSecondaryType}
        options={availableSecondaryTypes(primary.type)}
        onChange={(value) => updateSecondary(0, value)}
      />

      <ActionSelectCard
        title="Secondary action 2"
        subtitle="Use lead capture as a fallback conversion path."
        value={secondSecondaryType}
        options={availableSecondaryTypes(primary.type).filter(
          (type) => type !== firstSecondaryType,
        )}
        onChange={(value) => updateSecondary(1, value)}
      />

      <div className="rounded-[28px] border border-slate-200 bg-white/70 p-5 space-y-4">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
          Button labels
        </p>
        {[primary.type, firstSecondaryType, secondSecondaryType].map((type, index) => {
          const action =
            index === 0
              ? primary
              : buildAction(
                  type,
                  secondary.find((item) => item.type === type),
                )
          return (
            <div key={`${type}-${index}`}>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                {ACTION_META[type].label}
              </label>
              <input
                type="text"
                value={action.label ?? ACTION_META[type].defaultLabel}
                onChange={(e) => updateLabel(type, e.target.value.slice(0, 60))}
                placeholder={ACTION_META[type].defaultLabel}
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition-all focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
          )
        })}
      </div>

      <div className="rounded-[28px] border border-slate-200 bg-white/70 p-5 space-y-3">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
          WhatsApp message
        </p>
        <p className="text-sm leading-6 text-slate-500">
          Dotly will use this text when visitors tap the WhatsApp CTA.
        </p>
        <textarea
          rows={4}
          value={
            whatsappAction?.whatsappMessage ??
            'Hi, I saw your Dotly and want to know more about your service.'
          }
          onChange={(e) => updateWhatsappMessage(e.target.value.slice(0, 500))}
          className="w-full resize-none rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition-all focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-500/20"
        />
      </div>
    </div>
  )
}

function ActionSelectCard({
  title,
  subtitle,
  value,
  options,
  onChange,
}: {
  title: string
  subtitle: string
  value: CardActionType
  options: CardActionType[]
  onChange: (value: CardActionType) => void
}) {
  return (
    <div className="rounded-[28px] border border-slate-200 bg-white/70 p-5">
      <div className="mb-4">
        <p className="text-sm font-bold text-slate-900">{title}</p>
        <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {options.map((type) => {
          const { label, description, Icon } = ACTION_META[type]
          const active = value === type
          return (
            <button
              key={type}
              type="button"
              onClick={() => onChange(type)}
              className={cn(
                'rounded-[24px] border px-4 py-4 text-left transition-all',
                active
                  ? 'border-brand-300 bg-brand-50 shadow-[0_18px_36px_-28px_rgba(14,165,233,0.35)]'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50',
              )}
            >
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-brand-600 shadow-sm">
                <Icon className="h-5 w-5" />
              </span>
              <p className="mt-3 text-sm font-bold text-slate-900">{label}</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
            </button>
          )
        })}
      </div>
    </div>
  )
}
