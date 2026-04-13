const fs = require('fs')
const p = 'apps/web/src/components/card-builder/LinksTab.tsx'
let c = fs.readFileSync(p, 'utf8')

// Section Header replacement
c = c.replace(/<div className="flex items-center gap-3 pt-2">\n\s*<p className="text-xs font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">\n\s*\{label\}\n\s*<\/p>\n\s*<div className="h-px flex-1 bg-gray-100" \/>\n\s*<\/div>/g, 
`    <div className="flex items-center gap-3 pt-6 pb-2">
      <div className="h-2 w-2 rounded-full bg-gradient-to-r from-sky-400 to-indigo-500 shadow-[0_0_12px_rgba(56,189,248,0.8)]" />
      <p className="text-[12px] font-extrabold text-slate-500 uppercase tracking-[0.2em] whitespace-nowrap truncate">
        {label}
      </p>
      <div className="h-[2px] flex-1 bg-gradient-to-r from-slate-200/80 to-transparent rounded-full" />
    </div>`)

// Draggable link item upgrade
c = c.replace(/<div\n\s*ref=\{setNodeRef\}\n\s*style=\{style\}\n\s*className=\{cn\(\n\s*'group relative flex flex-col gap-3 rounded-2xl border bg-white p-4 shadow-sm transition-all focus-within:border-brand-300 focus-within:ring-2 focus-within:ring-brand-500\/20',\n\s*isDragging \? 'z-50 border-brand-400 opacity-90 shadow-2xl' : 'border-gray-200',\n\s*\)\}\n\s*>/g,
`<div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group relative flex flex-col gap-3 rounded-[32px] border border-white/80 bg-white/60 p-5 shadow-[0_4px_20px_-8px_rgba(15,23,42,0.06)] backdrop-blur-2xl transition-all duration-300 ease-out focus-within:!border-brand-300 focus-within:!bg-white focus-within:shadow-[0_16px_40px_-12px_rgba(14,165,233,0.3)] focus-within:ring-4 focus-within:ring-brand-500/10 focus-within:scale-[1.02] focus-within:z-20 hover:shadow-[0_12px_36px_-12px_rgba(15,23,42,0.12)] hover:bg-white hover:border-white',
        isDragging ? 'z-50 border-brand-400/80 opacity-95 shadow-[0_24px_60px_-12px_rgba(14,165,233,0.4)] scale-[1.03] ring-4 ring-brand-500/20 bg-white/90' : '',
      )}
    >
      <div className="absolute inset-0 rounded-[32px] bg-gradient-to-r from-sky-400/5 to-purple-500/5 blur-xl pointer-events-none opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />`)

c = c.replace(/className="flex items-center gap-3"/g, 'className="relative z-10 flex items-center gap-4"')

c = c.replace(/<button\n\s*type="button"\n\s*aria-label="Drag to reorder"\n\s*className="flex h-8 w-8 cursor-grab items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 active:cursor-grabbing"\n\s*\{...attributes\}\n\s*\{...listeners\}\n\s*>/g,
`<button
          type="button"
          aria-label="Drag to reorder"
          className="flex h-10 w-10 cursor-grab items-center justify-center rounded-[18px] text-gray-300 bg-white shadow-[0_2px_8px_-2px_rgba(15,23,42,0.06)] border border-gray-50 hover:bg-gray-50 hover:text-gray-900 active:cursor-grabbing active:scale-95 transition-all duration-300 hover:shadow-md"
          {...attributes}
          {...listeners}
        >`)

// Add link button
c = c.replace(/className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 py-4 text-sm font-semibold text-gray-500 transition-all hover:border-brand-300 hover:bg-brand-50 hover:text-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-500\/20 active:scale-\[0\.98\]"/g,
'className="relative flex w-full items-center justify-center gap-2 rounded-[32px] border-2 border-dashed border-brand-200 bg-brand-50/50 py-5 text-[15px] font-extrabold text-brand-600 transition-all duration-300 ease-out hover:border-brand-400 hover:bg-brand-100 hover:text-brand-700 hover:shadow-[0_12px_40px_-12px_rgba(14,165,233,0.3)] hover:scale-[1.01] focus:outline-none focus:ring-4 focus:ring-brand-500/20 active:scale-[0.98] overflow-hidden group"')

c = c.replace(/<Plus className="h-4 w-4" \/>/g, 
`        <Plus className="h-5 w-5 transition-transform duration-300 group-hover:rotate-90 group-hover:scale-110" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(14,165,233,0.1)_0%,transparent_60%)] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />`)

fs.writeFileSync(p, c, 'utf8')
