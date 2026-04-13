const fs = require('fs')

const p = 'apps/web/src/components/card-builder/ProfileTab.tsx'
const c = fs.readFileSync(p, 'utf8')

// We will systematically rewrite the rendering functions for:
// 1. IconInput
// 2. IconTextarea
// 3. SectionHeader
// 4. AvatarPicker
// 5. The ProfileTab itself (Handle section & Members Only switch) 

let newC = c

// 1. IconInput
newC = newC.replace(/<div\n\s*className=\{cn\(\n\s*'flex items-center rounded-2xl border border-gray-200 bg-gray-50 overflow-hidden',\n\s*'transition-all duration-150',\n\s*'focus-within:border-brand-400 focus-within:bg-white focus-within:ring-2 focus-within:ring-brand-500\/20',\n\s*\)\}\n\s*>/g, 
`      <div
        className={cn(
          'relative flex items-center rounded-[24px] border border-white/80 bg-white/60 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.04)] backdrop-blur-xl overflow-hidden',
          'transition-all duration-300 ease-out z-10',
          'hover:shadow-[0_8px_24px_-8px_rgba(15,23,42,0.08)] hover:bg-white/80 hover:border-white',
          'focus-within:!border-brand-300 focus-within:!bg-white focus-within:shadow-[0_16px_40px_-12px_rgba(14,165,233,0.3)] focus-within:ring-4 focus-within:ring-brand-500/10 focus-within:scale-[1.02] focus-within:z-20',
        )}
      >`)
newC = newC.replace(/className="flex h-full items-center justify-center bg-transparent shrink-0 pl-3 pr-2"/g, 'className="flex h-full items-center justify-center bg-transparent shrink-0 pl-4 pr-2"')
newC = newC.replace(/className="h-4 w-4 text-gray-400 group-focus-within:text-brand-500 transition-colors"/g, 'className="h-[18px] w-[18px] text-gray-400 group-focus-within:text-brand-500 transition-transform duration-300 group-focus-within:scale-110"')
newC = newC.replace(/className="flex-1 bg-transparent py-3 pr-3.5 text-sm font-semibold text-gray-900 placeholder:text-gray-400 outline-none"/g, 'className="flex-1 bg-transparent py-4 pr-4 text-[14px] font-bold text-gray-900 placeholder:text-gray-400/80 outline-none tracking-tight"')

// 2. IconTextarea
newC = newC.replace(/<div\n\s*className=\{cn\(\n\s*'flex rounded-2xl border border-gray-200 bg-gray-50 overflow-hidden px-3 py-3',\n\s*'transition-all duration-150',\n\s*'focus-within:border-brand-400 focus-within:bg-white focus-within:ring-2 focus-within:ring-brand-500\/20',\n\s*\)\}\n\s*>/g, 
`      <div
        className={cn(
          'relative flex rounded-[28px] border border-white/80 bg-white/60 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.04)] backdrop-blur-xl overflow-hidden px-4 py-4',
          'transition-all duration-300 ease-out z-10',
          'hover:shadow-[0_8px_24px_-8px_rgba(15,23,42,0.08)] hover:bg-white/80 hover:border-white',
          'focus-within:!border-brand-300 focus-within:!bg-white focus-within:shadow-[0_16px_40px_-12px_rgba(14,165,233,0.3)] focus-within:ring-4 focus-within:ring-brand-500/10 focus-within:scale-[1.02] focus-within:z-20',
        )}
      >`)
newC = newC.replace(/className="mt-0.5 h-4 w-4 shrink-0 text-gray-400 group-focus-within:text-brand-500 transition-colors"/g, 'className="mt-1 h-[18px] w-[18px] shrink-0 text-gray-400 group-focus-within:text-brand-500 transition-transform duration-300 group-focus-within:scale-110 group-focus-within:-rotate-3"')
newC = newC.replace(/className="flex-1 resize-none bg-transparent text-sm text-gray-900 placeholder:text-gray-400 outline-none"/g, 'className="flex-1 resize-none bg-transparent text-[14px] font-bold text-gray-900 placeholder:text-gray-400/80 outline-none tracking-tight leading-relaxed"')

// 3. SectionHeader
newC = newC.replace(/<div className="flex items-center gap-3 pt-2">\n\s*<p className="text-xs font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">\n\s*\{label\}\n\s*<\/p>\n\s*<div className="h-px flex-1 bg-gray-100" \/>\n\s*<\/div>/g, 
`    <div className="flex items-center gap-3 pt-6 pb-2">
      <div className="h-2 w-2 rounded-full bg-gradient-to-r from-sky-400 to-indigo-500 shadow-[0_0_12px_rgba(56,189,248,0.8)]" />
      <p className="text-[12px] font-extrabold text-slate-500 uppercase tracking-[0.2em] whitespace-nowrap truncate">
        {label}
      </p>
      <div className="h-[2px] flex-1 bg-gradient-to-r from-slate-200/80 to-transparent rounded-full" />
    </div>`)

// 4. AvatarPicker
newC = newC.replace(/<div className="app-panel-subtle flex flex-col items-center gap-3 rounded-\[28px\] px-4 py-5">\n\s*<label className="text-xs font-semibold text-gray-500 uppercase tracking-wide self-start">\n\s*Profile Photo\n\s*<\/label>\n\n\s*\{\/\* Avatar circle — click to open uploader \*\/\}\n\s*<button\n\s*type="button"\n\s*onClick=\{([^}]+)\}\n\s*className="group relative h-24 w-24 rounded-full overflow-hidden ring-4 ring-gray-100 hover:ring-brand-200 transition-all focus:outline-none focus:ring-brand-400"/g, 
`<div className="relative flex flex-col items-center gap-5 rounded-[40px] bg-gradient-to-b from-white/90 to-white/40 border border-white/80 p-8 shadow-[0_12px_40px_-16px_rgba(15,23,42,0.1)] backdrop-blur-2xl">
        <label className="absolute top-5 left-6 text-[10px] font-extrabold text-brand-500 uppercase tracking-[0.2em] bg-brand-50/80 px-3 py-1 rounded-full border border-brand-100 shadow-sm backdrop-blur-md z-10">
          Photo
        </label>
        
        {/* Decorative glowing backplate */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-brand-400/20 blur-3xl rounded-full pointer-events-none" />

        {/* Avatar circle */}
        <button
          type="button"
          onClick={$1}
          className="group relative h-28 w-28 rounded-full overflow-hidden ring-[6px] ring-white shadow-[0_12px_44px_-12px_rgba(14,165,233,0.4)] hover:ring-brand-100 hover:scale-105 active:scale-95 transition-all duration-300 ease-out focus:outline-none focus:ring-brand-400 z-10"`)

newC = newC.replace(/className="text-xs font-semibold text-brand-600 hover:text-brand-700 transition-colors"/g, 'className="text-[13px] font-bold text-brand-600 bg-brand-50 hover:bg-brand-100/80 px-4 py-2 rounded-full border border-brand-100 shadow-sm transition-all duration-300 hover:shadow-md hover:scale-105 active:scale-95 z-10"')

// 5. Handle / Switch block
newC = newC.replace(/<div\n\s*className=\{cn\(\n\s*'flex items-center rounded-2xl border border-gray-200 bg-gray-50 overflow-hidden',\n\s*'transition-all duration-150',\n\s*'focus-within:border-brand-400 focus-within:bg-white focus-within:ring-2 focus-within:ring-brand-500\/20',\n\s*\)\}\n\s*>/g, 
`        <div
          className={cn(
            'relative flex items-center rounded-[24px] border border-white/80 bg-white/60 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.04)] backdrop-blur-xl overflow-hidden',
            'transition-all duration-300 ease-out z-10',
            'hover:shadow-[0_8px_24px_-8px_rgba(15,23,42,0.08)] hover:bg-white/80 hover:border-white',
            'focus-within:!border-brand-300 focus-within:!bg-white focus-within:shadow-[0_16px_40px_-12px_rgba(14,165,233,0.3)] focus-within:ring-4 focus-within:ring-brand-500/10 focus-within:scale-[1.02] focus-within:z-20',
          )}
        >`)
newC = newC.replace(/className="flex items-center gap-2 shrink-0 pl-3.5 pr-2"/g, 'className="flex h-full items-center gap-2 bg-transparent shrink-0 pl-4 pr-2"')
newC = newC.replace(/<AtSign className="h-4 w-4 text-gray-400 group-focus-within:text-brand-500 transition-colors" \/>/g, '<AtSign className="h-[18px] w-[18px] text-gray-400 group-focus-within:text-brand-500 transition-transform duration-300 group-focus-within:scale-110 group-focus-within:rotate-6" />')
newC = newC.replace(/<span className="text-sm text-gray-400 font-medium">dotly.one\/<\/span>/g, '<span className="text-[14px] text-gray-400 font-bold group-focus-within:text-gray-600 transition-colors tracking-tight">dotly.one/</span>')
newC = newC.replace(/className="flex-1 bg-transparent py-3 pr-3.5 text-sm font-semibold text-gray-900 placeholder:text-gray-400 outline-none"/g, 'className="flex-1 bg-transparent py-4 pr-4 pl-0 text-[14px] font-bold text-gray-900 placeholder:text-gray-400/80 outline-none tracking-tight"')
newC = newC.replace(/className="mt-1.5 px-1 text-xs text-gray-400"/g, 'className="mt-2.5 px-2 text-[11px] font-semibold text-gray-400 tracking-wide uppercase"')

newC = newC.replace(/<button\n\s*onClick=\{([^}]+)\}\n\s*className="flex w-full items-center justify-between rounded-2xl border border-gray-200 bg-white p-4 hover:border-brand-200 hover:bg-brand-50\/50 transition-all"\n\s*>/g, 
`<button
            onClick={$1}
            className={cn(
              "group relative flex w-full items-center justify-between rounded-[32px] border border-white/80 bg-white/60 p-6 shadow-[0_4px_20px_-8px_rgba(15,23,42,0.06)] backdrop-blur-2xl transition-all duration-300 ease-out overflow-hidden z-10",
              "hover:shadow-[0_12px_36px_-12px_rgba(15,23,42,0.12)] hover:bg-white hover:border-white hover:scale-[1.015] active:scale-[0.98]",
              vcardPolicy === 'MEMBERS_ONLY' && "!border-brand-300 !bg-brand-50/80 !shadow-[0_16px_40px_-16px_rgba(14,165,233,0.35)]"
            )}
          >
            {vcardPolicy === 'MEMBERS_ONLY' && (
              <div className="absolute inset-0 rounded-[32px] bg-gradient-to-r from-brand-400/10 to-purple-500/10 blur-xl pointer-events-none" />
            )}`)
newC = newC.replace(/className="h-10 w-10 shrink-0 rounded-xl bg-gray-100 flex items-center justify-center"/g, 'className={cn("h-14 w-14 shrink-0 rounded-[20px] bg-white flex items-center justify-center shadow-[0_4px_16px_-4px_rgba(15,23,42,0.08)] border border-gray-100 transition-all duration-500", vcardPolicy === "MEMBERS_ONLY" ? "bg-gradient-to-br from-brand-500 to-indigo-500 border-none shadow-[0_8px_24px_-8px_rgba(99,102,241,0.5)] text-white group-hover:rotate-12 group-hover:scale-110" : "text-gray-400 group-hover:bg-gray-50")}')
newC = newC.replace(/className="h-5 w-5 text-gray-500"/g, 'className={cn("h-6 w-6 transition-colors", vcardPolicy === "MEMBERS_ONLY" ? "text-white" : "text-gray-400")}')

newC = newC.replace(/className="flex-1 text-left"/g, 'className="flex-1 text-left relative z-10 space-y-0.5"')
newC = newC.replace(/<p\n\s*className=\{cn\(\n\s*'text-sm font-semibold',\n\s*vcardPolicy === 'MEMBERS_ONLY' \? 'text-brand-700' : 'text-gray-800',\n\s*\)\}\n\s*>\n\s*Members only\n\s*<\/p>/g,
`<p
                  className={cn(
                    'text-[15px] font-extrabold tracking-tight transition-colors',
                    vcardPolicy === 'MEMBERS_ONLY' ? 'text-brand-700' : 'text-gray-800',
                  )}
                >
                  Members only
                </p>`)
newC = newC.replace(/<p className="text-xs text-gray-400 mt-0.5">\n\s*Only signed-in Dotly users can download your contact\.\n\s*<\/p>/g,
`<p className={cn("text-[13px] font-medium leading-snug transition-colors", vcardPolicy === 'MEMBERS_ONLY' ? 'text-brand-600/80' : 'text-gray-400')}>
                  Requires signed-in users to download your contact.
                </p>`)
newC = newC.replace(/<span\n\s*className=\{cn\(\n\s*'flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2',\n\s*vcardPolicy === 'MEMBERS_ONLY' \? 'bg-brand-500' : 'bg-gray-200',\n\s*\)\}/g,
`<span
                className={cn(
                  'relative z-10 flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-all duration-300 ease-out focus:outline-none focus:ring-4 focus:ring-brand-500/30',
                  vcardPolicy === 'MEMBERS_ONLY' 
                    ? 'bg-gradient-to-r from-brand-400 to-indigo-500 shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)]'
                    : 'bg-gray-200/80 shadow-inner',
                )}`)
newC = newC.replace(/className=\{cn\(\n\s*'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',\n\s*vcardPolicy === 'MEMBERS_ONLY' \? 'translate-x-5' : 'translate-x-0',\n\s*\)\}/g,
`className={cn(
                  'pointer-events-none flex h-6 w-6 transform items-center justify-center rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.15)] ring-0 transition-transform duration-300 ease-out',
                  vcardPolicy === 'MEMBERS_ONLY' ? 'translate-x-5 scale-110' : 'translate-x-0',
                )}`)

fs.writeFileSync(p, newC, 'utf8')
