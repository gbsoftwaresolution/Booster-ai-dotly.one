const fs = require('fs');

function processFile(fullPath) {
  if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
    let content = fs.readFileSync(fullPath, 'utf8');
    let original = content;

    // 1. Remove colorful blobs
    content = content.replace(/<div className="absolute[^>]+blur-\[80px\]"[^>]*><\/div>\n?/g, '');
    content = content.replace(/<div className="absolute[^>]+blur-\[80px\]"\s*\/>\n?/g, '');

    // 2. Replace the dark wrapper with light
    content = content.replace(/className="relative overflow-hidden rounded-\[36px\] bg-slate-900 [^"]+ z-0"/g, 'className="relative overflow-hidden rounded-[24px] border border-slate-200/60 bg-white/60 p-4 sm:p-6 backdrop-blur-xl mb-6 shadow-sm"');
    
    // 3. Fix text colors inside headers that used to be dark
    content = content.replace(/text-white sm:text-4xl/g, 'text-slate-900 sm:text-4xl');
    content = content.replace(/text-white sm:text-\[40px\]/g, 'text-slate-900 sm:text-[40px]');
    content = content.replace(/text-transparent bg-clip-text bg-gradient-to-r from-([a-z]+)-400 to-([a-z]+)-400/g, 'text-transparent bg-clip-text bg-gradient-to-r from-$1-600 to-$2-600');
    content = content.replace(/text-slate-400 sm:text-base/g, 'text-slate-500 sm:text-base');
    
    // Pills
    content = content.replace(/border-white\/10 bg-white\/5/g, 'border-sky-100 bg-sky-50/50');
    content = content.replace(/text-slate-300">/g, 'text-sky-600">');
    // Button fixes (just a naive guess, if not working, we'll fix manually)
    content = content.replace(/rounded-2xl bg-white px-6 py-3\.5 text-sm font-bold text-slate-900/g, 'rounded-2xl bg-slate-900 px-6 py-3.5 text-sm font-bold text-white');
    
    content = content.replace(/border-white\/10 bg-white\/10 px-4 py-3\.5 text-sm font-bold text-white transition-all hover:bg-white\/20 focus:border-violet-500 focus:bg-white\/20 focus:ring-\[3px\] focus:ring-violet-500\/20/g, 'border-slate-200/60 bg-white/60 px-4 py-3.5 text-sm font-bold text-slate-900 transition-all hover:bg-white focus:border-violet-500 focus:bg-white focus:ring-[3px] focus:ring-violet-500/20');
    
    // Check dot grid
    content = content.replace(/radial-gradient\(circle at center, white 1px, transparent 1px\)/g, "radial-gradient(circle at center, #94a3b8 1px, transparent 1px)");
    
    if (content !== original) {
      fs.writeFileSync(fullPath, content, 'utf8');
      console.log('Fixed', fullPath);
    }
  }
}

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = `${dir}/${file}`;
    if (fs.statSync(fullPath).isDirectory()) {
      processDirectory(fullPath);
    } else {
      processFile(fullPath);
    }
  }
}

// Process crm and apps subdirectories
processDirectory('src/app/(dashboard)');
processDirectory('src/app/(apps)');
