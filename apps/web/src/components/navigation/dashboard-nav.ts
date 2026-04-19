import type { LucideIcon } from 'lucide-react'
import { BillingPlan, hasPlanAccess } from '@/lib/billing-plans'
import { isLaunchMode } from '@/lib/launch-mode'
import {
  BarChart3,
  Calendar,
  CheckSquare,
  CreditCard,
  DollarSign,
  FileSignature,
  GitBranch,
  Inbox,
  Kanban,
  LayoutDashboard,
  Mail,
  Settings,
  SlidersHorizontal,
  TrendingUp,
  Users,
  UsersRound,
  Webhook,
  Smartphone,
} from 'lucide-react'

export interface DashboardNavItem {
  href: string
  label: string
  icon: LucideIcon
  section: string
  minPlan?: BillingPlan
}

export interface DashboardNavSection {
  title: string
  items: DashboardNavItem[]
}

export const dashboardNavItems: DashboardNavItem[] = [
  // Overview
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, section: 'Overview' },
  { href: '/apps/cards/analytics', label: 'Analytics', icon: BarChart3, section: 'Overview' },

  // Cards
  { href: '/cards', label: 'My Cards', icon: CreditCard, section: 'Cards' },
  {
    href: '/apps/cards/email-templates',
    label: 'Email Templates',
    icon: Mail,
    section: 'Cards',
    minPlan: 'STARTER',
  },
  {
    href: '/apps/cards/email-signature',
    label: 'Signature',
    icon: FileSignature,
    section: 'Cards',
    minPlan: 'STARTER',
  },

  // Scheduling — own section so it stands out
  {
    href: '/scheduling',
    label: 'Scheduling',
    icon: Calendar,
    section: 'Scheduling',
    minPlan: 'STARTER',
  },

  // CRM
  { href: '/contacts', label: 'Contacts', icon: Users, section: 'CRM', minPlan: 'STARTER' },
  { href: '/leads', label: 'Lead Submissions', icon: Inbox, section: 'CRM' },
  { href: '/deals', label: 'Deals', icon: DollarSign, section: 'CRM', minPlan: 'PRO' },
  { href: '/tasks', label: 'Tasks', icon: CheckSquare, section: 'CRM', minPlan: 'PRO' },
  { href: '/crm', label: 'Pipeline', icon: Kanban, section: 'CRM', minPlan: 'PRO' },
  { href: '/pipelines', label: 'Pipelines', icon: GitBranch, section: 'CRM', minPlan: 'PRO' },
  {
    href: '/crm/custom-fields',
    label: 'Custom Fields',
    icon: SlidersHorizontal,
    section: 'CRM',
    minPlan: 'PRO',
  },
  {
    href: '/crm/analytics',
    label: 'CRM Analytics',
    icon: TrendingUp,
    section: 'CRM',
    minPlan: 'PRO',
  },

  // Administration
  {
    href: '/team',
    label: 'Team',
    icon: UsersRound,
    section: 'Administration',
    minPlan: 'BUSINESS',
  },
  { href: '/settings/pwa', label: 'PWA Insights', icon: Smartphone, section: 'Administration' },
  {
    href: '/settings/webhooks',
    label: 'Webhooks',
    icon: Webhook,
    section: 'Administration',
    minPlan: 'PRO',
  },
  { href: '/settings/billing', label: 'Billing', icon: DollarSign, section: 'Administration' },
  { href: '/settings', label: 'Settings', icon: Settings, section: 'Administration' },
]

// Mobile bottom tabs: Home, Cards, Scheduling, Contacts, Settings
const bottomTabHrefs = ['/dashboard', '/cards', '/scheduling', '/contacts', '/settings'] as const

export const dashboardBottomTabs: DashboardNavItem[] = dashboardNavItems
  .filter((item) => bottomTabHrefs.includes(item.href as (typeof bottomTabHrefs)[number]))
  // Sort to match the desired left-to-right tab order
  .sort(
    (a, b) =>
      bottomTabHrefs.indexOf(a.href as (typeof bottomTabHrefs)[number]) -
      bottomTabHrefs.indexOf(b.href as (typeof bottomTabHrefs)[number]),
  )
  .map((item) => {
    if (item.href === '/dashboard') return { ...item, label: 'Home' }
    if (item.href === '/cards') return { ...item, label: 'Cards' }
    if (item.href === '/scheduling') return { ...item, label: 'Schedule' }
    return item
  })

export const dashboardMoreItems = dashboardNavItems.filter(
  (item) => !dashboardBottomTabs.some((tab) => tab.href === item.href),
)

function filterDashboardItemsByPlan(
  items: DashboardNavItem[],
  plan: BillingPlan,
): DashboardNavItem[] {
  return items.filter((item) => !item.minPlan || hasPlanAccess(plan, item.minPlan))
}

function groupDashboardNavItems(items: DashboardNavItem[]): DashboardNavSection[] {
  return items.reduce<DashboardNavSection[]>((sections, item) => {
    const existingSection = sections.find((section) => section.title === item.section)

    if (existingSection) {
      existingSection.items.push(item)
      return sections
    }

    sections.push({ title: item.section, items: [item] })
    return sections
  }, [])
}

export const dashboardNavSections = groupDashboardNavItems(dashboardNavItems)
export const dashboardMoreSections = groupDashboardNavItems(dashboardMoreItems)

export function getVisibleDashboardNavSections(plan: BillingPlan): DashboardNavSection[] {
  const filtered = filterDashboardItemsByPlan(dashboardNavItems, plan)

  if (!isLaunchMode()) {
    return groupDashboardNavItems(filtered)
  }

  const launchHrefs = new Set([
    '/dashboard',
    '/cards',
    '/scheduling',
    '/settings/billing',
    '/settings',
  ])
  return groupDashboardNavItems(filtered.filter((item) => launchHrefs.has(item.href)))
}

export function getVisibleDashboardBottomTabs(plan: BillingPlan): DashboardNavItem[] {
  const filtered = filterDashboardItemsByPlan(dashboardBottomTabs, plan)

  if (!isLaunchMode()) {
    return filtered
  }

  const launchTabs = new Set(['/dashboard', '/cards', '/settings'])
  return filtered.filter((item) => launchTabs.has(item.href))
}

export function getVisibleDashboardMoreSections(plan: BillingPlan): DashboardNavSection[] {
  const filtered = filterDashboardItemsByPlan(dashboardMoreItems, plan)

  if (!isLaunchMode()) {
    return groupDashboardNavItems(filtered)
  }

  const launchHrefs = new Set(['/settings', '/settings/billing'])
  return groupDashboardNavItems(filtered.filter((item) => launchHrefs.has(item.href)))
}
