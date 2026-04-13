const fs = require('fs');

const files = [
  'src/app/(dashboard)/deals/page.tsx',
  'src/app/(dashboard)/leads/components.tsx',
  'src/app/(dashboard)/crm/custom-fields/page.tsx',
  'src/app/(dashboard)/pipelines/page.tsx',
  'src/app/(apps)/apps/crm/page.tsx'
];

for (const file of files) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;

    // Generic fixes for text that shouldn't be white anymore on light glassmorphic backgrounds
    
    // Quick tools:
    // e.g. "tracking-tight text-white" -> text-slate-900
    content = content.replace(/tracking-tight text-white/g, 'tracking-tight text-slate-900');
    // e.g. text-white -> text-slate-900
    // But be careful: buttons might legitimately be text-white like "bg-slate-900 text-white"
    // Let's manually replace specific bad strings:
    content = content.replace(/text-slate-300/g, 'text-slate-500'); 
    
    // Deals page specific
    content = content.replace(/<p className="mt-1 flex items-baseline gap-2 text-2xl font-bold tracking-tight text-white">/g, '<p className="mt-1 flex items-baseline gap-2 text-2xl font-bold tracking-tight text-slate-900">');
    content = content.replace(/text-\[10px\] font-bold uppercase tracking-wider text-slate-400/g, 'text-[10px] font-bold uppercase tracking-wider text-slate-500');
    content = content.replace(/border-white\/10 bg-white\/5/g, 'border-slate-200/50 bg-slate-50');

    // Leads page specific
    content = content.replace(/text-white sm:text-4xl/g, 'text-slate-900 sm:text-4xl');

    // CRM page specific
    content = content.replace(/h1 className="text-3xl font-extrabold tracking-tight text-white/g, 'h1 className="text-3xl font-extrabold tracking-tight text-slate-900');
    content = content.replace(/<p className="mt-3 max-w-xl text-sm font-medium text-slate-400/g, '<p className="mt-3 max-w-xl text-sm font-medium text-slate-500');

    // Pipelines specific
    content = content.replace(/text-3xl font-extrabold tracking-tight text-white/g, 'text-3xl font-extrabold tracking-tight text-slate-900');
    
    // Custom Fields
    content = content.replace(/<h1 className="text-3xl font-extrabold tracking-tight text-white/g, '<h1 className="text-3xl font-extrabold tracking-tight text-slate-900');
    
    // General fixes for anything matching exactly: text-white that looks like a title
    content = content.replace(/font-bold text-white/g, 'font-bold text-slate-900');
    
    // EXCEPT FOR BUTTONS. Restore legitimate buttons:
    // If a button is `bg-slate-900`, `bg-indigo-600`, `bg-sky-500`, `bg-rose-500`, `bg-red-600`, it should have text-white
    content = content.replace(/text-slate-900 shadow-md transition-all hover:bg-slate-800/g, 'text-white shadow-md transition-all hover:bg-slate-800');
    content = content.replace(/text-slate-900 transition-colors hover:bg-sky-600/g, 'text-white transition-colors hover:bg-sky-600');
    content = content.replace(/text-slate-900 shadow-md transition-all hover:bg-sky-600/g, 'text-white shadow-md transition-all hover:bg-sky-600');
    content = content.replace(/text-slate-900 shadow-md transition-all hover:bg-rose-600/g, 'text-white shadow-md transition-all hover:bg-rose-600');
    content = content.replace(/bg-red-[65]00([^>]+)text-slate-900/g, 'bg-red-600$1text-white');
    content = content.replace(/bg-sky-500([^>]+)text-slate-900/g, 'bg-sky-500$1text-white');
    content = content.replace(/bg-indigo-600([^>]+)text-slate-900/g, 'bg-indigo-600$1text-white');
    content = content.replace(/bg-slate-900([^>]+)text-slate-900/g, 'bg-slate-900$1text-white');
    
    if (content !== original) {
      fs.writeFileSync(file, content, 'utf8');
      console.log('Fixed text colors in', file);
    }
  }
}
