import type { LucideIcon } from 'lucide-react'
import {
  BarChart3,
  Calendar,
  CalendarCheck,
  CalendarClock,
  CheckSquare,
  Clock,
  CreditCard,
  DollarSign,
  FileSignature,
  GitBranch,
  Home,
  Inbox,
  Kanban,
  LayoutDashboard,
  Mail,
  MessageSquare,
  Settings,
  SlidersHorizontal,
  TrendingUp,
  Users,
  UsersRound,
  Webhook,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AppNavItem {
  href: string
  label: string
  icon: LucideIcon
  badge?: string
}

export interface AppNavSection {
  title: string
  items: AppNavItem[]
}

export interface AppDefinition {
  id: string
  label: string
  description: string
  icon: LucideIcon
  color: string // Tailwind bg color for the app icon
  gradient: string // CSS gradient for active state
  href: string // landing page inside the app
  sections: AppNavSection[]
  /** Cross-app quick links shown at the bottom of the sidebar */
  crossLinks?: Array<{ label: string; href: string; icon: LucideIcon }>
}

// ─── App Definitions ─────────────────────────────────────────────────────────

export const APPS: AppDefinition[] = [
  // ── Cards ──────────────────────────────────────────────────────────────────
  {
    id: 'cards',
    label: 'Cards',
    description: 'Digital business cards & email signatures',
    icon: CreditCard,
    color: 'bg-sky-500',
    gradient: 'linear-gradient(135deg,#38bdf8,#0ea5e9)',
    href: '/apps/cards',
    sections: [
      {
        title: 'My Cards',
        items: [
          { href: '/apps/cards', label: 'All Cards', icon: CreditCard },
          { href: '/apps/cards/analytics', label: 'Card Analytics', icon: BarChart3 },
        ],
      },
      {
        title: 'Tools',
        items: [
          { href: '/apps/cards/email-templates', label: 'Email Templates', icon: Mail },
          { href: '/apps/cards/email-signature', label: 'Email Signature', icon: FileSignature },
        ],
      },
    ],
    crossLinks: [
      { label: 'View CRM leads from cards', href: '/apps/crm/leads', icon: Inbox },
      { label: 'Card inbox (messages & files)', href: '/inbox', icon: MessageSquare },
      { label: 'Schedule from card', href: '/apps/scheduling', icon: Calendar },
    ],
  },

  // ── CRM ────────────────────────────────────────────────────────────────────
  {
    id: 'crm',
    label: 'CRM',
    description: 'Contacts, deals, pipeline & lead management',
    icon: Users,
    color: 'bg-violet-500',
    gradient: 'linear-gradient(135deg,#a78bfa,#7c3aed)',
    href: '/apps/crm',
    sections: [
      {
        title: 'People',
        items: [
          { href: '/apps/crm', label: 'Overview', icon: LayoutDashboard },
          { href: '/apps/crm/contacts', label: 'Contacts', icon: Users },
          { href: '/apps/crm/leads', label: 'Lead Submissions', icon: Inbox },
        ],
      },
      {
        title: 'Sales',
        items: [
          { href: '/apps/crm/deals', label: 'Deals', icon: DollarSign },
          { href: '/apps/crm/tasks', label: 'Tasks', icon: CheckSquare },
          { href: '/apps/crm/pipeline', label: 'Pipeline', icon: Kanban },
          { href: '/apps/crm/pipelines', label: 'Pipelines', icon: GitBranch },
        ],
      },
      {
        title: 'Settings',
        items: [
          { href: '/apps/crm/custom-fields', label: 'Custom Fields', icon: SlidersHorizontal },
          { href: '/apps/crm/analytics', label: 'Analytics', icon: TrendingUp },
        ],
      },
    ],
    crossLinks: [
      { label: 'View card leads', href: '/apps/cards', icon: CreditCard },
      { label: 'Book appointment', href: '/apps/scheduling', icon: Calendar },
    ],
  },

  // ── Scheduling ─────────────────────────────────────────────────────────────
  {
    id: 'scheduling',
    label: 'Scheduling',
    description: 'Appointments, availability & bookings',
    icon: Calendar,
    color: 'bg-emerald-500',
    gradient: 'linear-gradient(135deg,#34d399,#059669)',
    href: '/apps/scheduling',
    sections: [
      {
        title: 'Scheduling',
        items: [
          { href: '/apps/scheduling', label: 'Overview', icon: LayoutDashboard },
          {
            href: '/apps/scheduling/appointment-types',
            label: 'Appointment Types',
            icon: CalendarCheck,
          },
          { href: '/apps/scheduling/availability', label: 'Availability', icon: Clock },
          { href: '/apps/scheduling/bookings', label: 'Bookings', icon: CalendarClock },
        ],
      },
    ],
    crossLinks: [
      { label: 'View booked contacts', href: '/apps/crm/contacts', icon: Users },
      { label: 'Add to card', href: '/apps/cards', icon: CreditCard },
    ],
  },
]

// ─── Home / launcher "app" (not in APPS array — special) ─────────────────────

export const HOME_APP = {
  id: 'home',
  label: 'Home',
  icon: Home,
  href: '/dashboard',
}

// ─── Settings / Admin (pinned at bottom of rail, not a full app) ──────────────

export const ADMIN_APPS: AppDefinition[] = [
  {
    id: 'settings',
    label: 'Settings',
    description: 'Account, team, billing & integrations',
    icon: Settings,
    color: 'bg-gray-500',
    gradient: 'linear-gradient(135deg,#9ca3af,#6b7280)',
    href: '/settings',
    sections: [
      {
        title: 'Account',
        items: [
          { href: '/settings', label: 'General', icon: Settings },
          { href: '/settings/billing', label: 'Billing', icon: DollarSign },
          { href: '/settings/domains', label: 'Custom Domains', icon: GitBranch },
          { href: '/settings/webhooks', label: 'Webhooks', icon: Webhook },
        ],
      },
      {
        title: 'Team',
        items: [
          { href: '/team', label: 'Members', icon: UsersRound },
          { href: '/team/brand', label: 'Brand', icon: FileSignature },
        ],
      },
    ],
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getAppById(id: string): AppDefinition | undefined {
  return [...APPS, ...ADMIN_APPS].find((a) => a.id === id)
}

/** Given a pathname like /apps/crm/contacts, find which app it belongs to */
export function getActiveApp(pathname: string): AppDefinition | undefined {
  // /apps/[id]/... pattern
  const appsMatch = pathname.match(/^\/apps\/([^/]+)/)
  if (appsMatch) {
    const id = appsMatch[1]
    return getAppById(id ?? '')
  }
  // /settings or /team → settings app
  if (pathname.startsWith('/settings') || pathname.startsWith('/team')) {
    return ADMIN_APPS[0]
  }
  return undefined
}

// Mobile bottom tabs for the app-level layout
export const APP_MOBILE_TABS = APPS.map((app) => ({
  href: app.href,
  label: app.label,
  icon: app.icon,
}))
