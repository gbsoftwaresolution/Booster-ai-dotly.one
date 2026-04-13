const fs = require('fs');
const glob = require('glob'); // Need to use standard fs since glob might not be installed, wait let's use plain fs recursive.

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = `${dir}/${file}`;
    if (fs.statSync(fullPath).isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.tsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let original = content;

      // 1. Remove the colorful blobs
      content = content.replace(/<div className="absolute -left-[^"]+ h-64 w-64 rounded-full bg-[^-]+-600\/30 blur-\[80px\]" \/>\n/g, '');
      content = content.replace(/<div className="absolute -right-[^"]+ bg-[^-]+-600\/30 blur-\[80px\]" \/>\n/g, '');
      content = content.replace(/<div className="absolute -right-10 bottom-0 h-64 w-64 rounded-full bg-indigo-600\/30 blur-\[80px\]" \/>\n/g, '');
      content = content.replace(/<div className="absolute -left-10 top-0 h-64 w-64 rounded-full bg-violet-600\/30 blur-\[80px\]" \/>\n/g, '');
      content = content.replace(/<div className="absolute -left-10 top-0 h-64 w-64 rounded-full bg-blue-600\/30 blur-\[80px\]" \/>\n/g, '');
      content = content.replace(/<div className="absolute -left-10 top-0 h-64 w-64 rounded-full bg-sky-600\/30 blur-\[80px\]" \/>\n/g, '');
      
      content = content.replace(/<div className="absolute -right-[a-zA-Z0-9]+[^>]+blur-\[80px\]"\s*\/>\n?/g, '');
      content = content.replace(/<div className="absolute -left-[a-zA-Z0-9]+[^>]+blur-\[80px\]"\s*\/>\n?/g, '');
      // Generic blob remover
      content = content.replace(/<div className="absolute[^>]+blur-\[80px\]"[^>]*>\s*<\/div>\n?/g, '');
      content = content.replace(/<div className="absolute[^>]+blur-\[80px\]"\s*\/>\n?/g, '');

      // Dot grid overlay (optional, but probably nice to remove or keep subtle, we'll keep it as it's just white dots, but if the bg is white, white dots are invisible!)
      // If we make bg white:
      content = content.replace(/(<div className="absolute left-1\/2 top-1\/2 h-full w-full -translate-x-1\/2 -translate-y-1\/2 opacity-)20(" style={{ backgroundImage: 'radial-gradient\(circle at center, )white( 1px, transparent 1px\)', backgroundSize: '24px 24px' }} \/>)/g, '$110$2slate-400$3');
      
      // 2. Replace the dark wrapper with light
      content = content.replace(/className="relative overflow-hidden rounded-\[36px\] bg-slate-900 px-[0-9]+ py-[0-9]+ shadow-2xl sm:px-[0-9]+ sm:py-[0-9]+ z-0"/g, 'className="relative overflow-hidden rounded-3xl border border-slate-200/60 bg-white/60 p-6 backdrop-blur-xl sm:p-8 mb-6 shadow-sm"');
      
      // 3. Fix text colors inside headers that used to be dark
      // `tracking-tight text-white` -> `tracking-tight text-slate-900`
      content = content.replace(/text-white( sm:text-4xl")/g, 'text-slate-900$1');
      content = content.replace(/text-white( sm:text-\[40px\]")/g, 'text-slate-900$1');
      // For spans with bg-clip-text:
      content = content.replace(/<span className="text-transparent bg-clip-text bg-gradient-to-r from-([a-z]+)-400 to-([a-z]+)-400">/g, '<span className="text-transparent bg-clip-text bg-gradient-to-r from-$1-600 to-$2-600">');
      
      // Text slate-400 / 300 to 500 / 600
      content = content.replace(/text-slate-400( sm:text-base")/g, 'text-slate-500$1');
      content = content.replace(/text-slate-300"/g, 'text-sky-600"'); // for the pills
      content = content.replace(/border-white\/10 bg-white\/5/g, 'border-sky-100 bg-sky-50/50');
      
      // Select fields in leads
      content = content.replace(/border-white\/10 bg-white\/10 px-4 py-3\.5 text-sm font-bold text-white transition-all hover:bg-white\/20 focus:border-violet-500 focus:bg-white\/20 focus:ring-\[3px\] focus:ring-violet-500\/20/g, 'border-slate-200/60 bg-white/60 px-4 py-3.5 text-sm font-bold text-slate-900 transition-all hover:bg-white focus:border-violet-500 focus:bg-white focus:ring-[3px] focus:ring-violet-500/20');
      
      // Buttons that were white text on white bg
      // E.g. inline-flex items-center justify-center rounded-2xl bg-white px-6 py-3.5 text-sm font-bold text-slate-900 hover:bg-slate-50
      content = content.replace(/bg-white px-[0-9] py-[0-9.]+ text-[a-z]+ font-bold text-slate-900/g, 'bg-slate-900 px-6 py-3.5 text-sm font-bold text-white hover:bg-slate-800');

      if (content !== original) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log('Fixed', fullPath);
      }
    }
  }
}

// Process crm and apps subdirectories
processDirectory('src/app/(dashboard)');
processDirectory('src/app/(apps)');
