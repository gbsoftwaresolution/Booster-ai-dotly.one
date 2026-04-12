import type { LucideIcon } from 'lucide-react'
import { BillingPlan, hasPlanAccess } from '@/lib/billing-plans'
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
  { href: '/apps/cards/email-templates', label: 'Email Templates', icon: Mail, section: 'Cards' },
  {
    href: '/apps/cards/email-signature',
    label: 'Signature',
    icon: FileSignature,
    section: 'Cards',
  },

  // Scheduling — own section so it stands out
  { href: '/scheduling', label: 'Scheduling', icon: Calendar, section: 'Scheduling' },

  // CRM
  { href: '/contacts', label: 'Contacts', icon: Users, section: 'CRM' },
  { href: '/leads', label: 'Lead Submissions', icon: Inbox, section: 'CRM' },
  { href: '/deals', label: 'Deals', icon: DollarSign, section: 'CRM' },
  { href: '/tasks', label: 'Tasks', icon: CheckSquare, section: 'CRM' },
  { href: '/crm', label: 'Pipeline', icon: Kanban, section: 'CRM' },
  { href: '/pipelines', label: 'Pipelines', icon: GitBranch, section: 'CRM' },
  { href: '/crm/custom-fields', label: 'Custom Fields', icon: SlidersHorizontal, section: 'CRM' },
  { href: '/crm/analytics', label: 'CRM Analytics', icon: TrendingUp, section: 'CRM' },

  // Administration
  {
    href: '/team',
    label: 'Team',
    icon: UsersRound,
    section: 'Administration',
    minPlan: 'BUSINESS',
  },
  {
    href: '/settings/webhooks',
    label: 'Webhooks',
    icon: Webhook,
    section: 'Administration',
    minPlan: 'PRO',
  },
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
  return groupDashboardNavItems(filterDashboardItemsByPlan(dashboardNavItems, plan))
}

export function getVisibleDashboardBottomTabs(plan: BillingPlan): DashboardNavItem[] {
  return filterDashboardItemsByPlan(dashboardBottomTabs, plan)
}

export function getVisibleDashboardMoreSections(plan: BillingPlan): DashboardNavSection[] {
  return groupDashboardNavItems(filterDashboardItemsByPlan(dashboardMoreItems, plan))
}
