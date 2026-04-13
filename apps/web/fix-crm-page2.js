const fs = require('fs')
const file = 'src/app/(apps)/apps/crm/page.tsx'
let code = fs.readFileSync(file, 'utf8')

// Replace StatPill component
const statPillCode = `function StatPill({
  label,
  value,
  icon: Icon,
  color,
  href,
}: {
  label: string
  value: number
  icon: React.ElementType
  color: string
  href: string
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group relative flex flex-col justify-between overflow-hidden rounded-[32px] border border-white/80 bg-white/60 p-6 backdrop-blur-xl transition-all duration-500",
        "hover:-translate-y-1 hover:shadow-[0_12px_36px_-12px_rgba(15,23,42,0.12)] hover:bg-white"
      )}
    >
      <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br opacity-20 blur-2xl transition-all duration-500 group-hover:scale-150 group-hover:opacity-40" />
      <div className="flex items-start justify-between">
        <span className={cn('flex h-12 w-12 items-center justify-center rounded-2xl shrink-0 shadow-sm', color)}>
          <Icon className="h-6 w-6 text-white" />
        </span>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-50 text-gray-400 transition-colors group-hover:bg-gray-100 group-hover:text-gray-900">
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </div>
      </div>
      <div className="mt-8 min-w-0">
        <p className="text-3xl font-extrabold tracking-tight text-slate-900 tabular-nums">{value}</p>
        <p className="mt-1 text-[13px] font-bold text-slate-500">{label}</p>
      </div>
    </Link>
  )
}`

code = code.replace(/function StatPill\([\s\S]*?className="h-4 w-4 text-gray-300 transition-transform group-hover:translate-x-1 shrink-0" \/>\n    <\/Link>\n  \)\n\}/, statPillCode)

// Replace CRM Header section
const headerRegex = /\{\/\* Header \*\/\}\n\s*<div className="app-panel flex items-center justify-between rounded-\[30px\] px-6 py-6 sm:px-8">\n\s*<div>\n\s*<h1 className="text-2xl font-bold text-gray-900">CRM<\/h1>\n\s*<p className="mt-2 text-sm text-gray-500">\n\s*Contacts, pipeline, deals and tasks in one place\n\s*<\/p>\n\s*<\/div>\n\s*<Link\n\s*href="\/apps\/crm\/contacts"\n\s*className="flex items-center gap-2 rounded-xl px-4 py-2\.5 text-sm font-semibold text-white shadow-sm transition-all hover:opacity-90"\n\s*style=\{\{ background: 'linear-gradient\(135deg,#a78bfa,#7c3aed\)' \}\}\n\s*>\n\s*<Plus className="h-4 w-4" \/>\n\s*Add Contact\n\s*<\/Link>\n\s*<\/div>/

const newHeader = `{/* Premium Header */}
      <div className="relative overflow-hidden rounded-[36px] bg-slate-900 px-8 py-12 shadow-2xl sm:px-10 sm:py-14 z-0">
        {/* Background glows */}
        <div className="absolute -left-10 top-0 h-64 w-64 rounded-full bg-violet-600/30 blur-[80px]" />
        <div className="absolute -right-10 bottom-0 h-64 w-64 rounded-full bg-fuchsia-600/30 blur-[80px]" />
        <div className="absolute left-1/2 top-1/2 h-full w-full -translate-x-1/2 -translate-y-1/2 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at center, white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

        <div className="relative z-10 flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 shadow-inner backdrop-blur-sm">
              <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300">Live Dashboard</span>
            </div>
            <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl">
              Customer <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400">Relations</span>
            </h1>
            <p className="mt-3 max-w-xl text-sm font-medium text-slate-400 sm:text-base">
              Track contacts, manage deals, and build pipeline velocity. Everything you need to close more.
            </p>
          </div>
          <Link
            href="/apps/crm/contacts"
            className="group relative flex items-center gap-2 overflow-hidden rounded-2xl bg-white px-5 py-3.5 text-sm font-bold text-slate-900 shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)] transition-all hover:scale-105 active:scale-95"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-violet-100 to-fuchsia-100 opacity-0 transition-opacity group-hover:opacity-100" />
            <Plus className="relative z-10 h-4 w-4" />
            <span className="relative z-10">Add Contact</span>
          </Link>
        </div>
      </div>`

code = code.replace(headerRegex, newHeader)


// Replace Stats
const statsRegex = /\{\/\* Stats \*\/\}\n\s*\{loading \? \([\s\S]*?\) : \([\s\S]*?<div className="grid grid-cols-2 gap-4 lg:grid-cols-3">[\s\S]*?<StatPill\n\s*label="Contacts"[\s\S]*?color="bg-violet-500"[\s\S]*?href="\/apps\/crm\/contacts"\n\s*\/>\n\s*<StatPill\n\s*label="Deals"[\s\S]*?color="bg-emerald-500"[\s\S]*?href="\/apps\/crm\/deals"\n\s*\/>\n\s*<StatPill\n\s*label="Lead Submissions"[\s\S]*?color="bg-sky-500"[\s\S]*?href="\/apps\/crm\/leads"\n\s*\/>\n\s*<\/div>\n\s*\)\}/

const newStats = `{/* Stats */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-44 animate-pulse rounded-[32px] bg-slate-100" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatPill
            label="Total Contacts"
            value={data.recentCount}
            icon={Users}
            color="bg-gradient-to-br from-blue-500 to-indigo-600"
            href="/apps/crm/contacts"
          />
          <StatPill
            label="Active Deals"
            value={data.dealCount}
            icon={DollarSign}
            color="bg-gradient-to-br from-emerald-400 to-teal-500"
            href="/apps/crm/deals"
          />
          <StatPill
            label="Lead Submissions"
            value={data.leadCount}
            icon={Inbox}
            color="bg-gradient-to-br from-fuchsia-500 to-pink-600"
            href="/apps/crm/leads"
          />
        </div>
      )}`

code = code.replace(statsRegex, newStats)

// Replace Recent contacts and CRM Tools app-panel to the 3D style
code = code.replace(
  /<section className="app-panel overflow-hidden rounded-\[28px\]">/g,
  '<section className="relative overflow-hidden rounded-[32px] border border-white/80 bg-white/60 shadow-[0_4px_20px_-8px_rgba(15,23,42,0.06)] backdrop-blur-xl">'
)

code = code.replace(
  /<div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">/g,
  '<div className="flex items-center justify-between border-b border-slate-100/60 bg-white/40 px-6 py-5 backdrop-blur-md">'
)

code = code.replace(
  /<div className="border-b border-gray-100 px-5 py-4">/g,
  '<div className="border-b border-slate-100/60 bg-white/40 px-6 py-5 backdrop-blur-md">'
)

// Contacts row styling upgrade
code = code.replace(
  /<li key=\{c\.id\} className="flex items-center gap-3 px-5 py-3">/g,
  '<li key={c.id} className="group flex items-center gap-4 px-6 py-4 transition-all hover:bg-white/50">'
)

// CRM Tools row styling upgrade
code = code.replace(
  /<li key=\{link\.href\}>/g,
  '<li key={link.href} className="group transition-all hover:bg-white/50">'
)

code = code.replace(
  /className="flex items-center gap-4 px-5 py-4"/g,
  'className="flex relative items-center gap-5 px-6 py-5 transition-all outline-none"'
)

// Improve the "app-empty-state" inside Recent contacts
code = code.replace(
  '<div className="app-empty-state rounded-none border-0 shadow-none">',
  '<div className="app-empty-state rounded-[24px] border-0 shadow-none bg-transparent py-10">'
)

fs.writeFileSync(file, code, 'utf8')
