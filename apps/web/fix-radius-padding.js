const fs = require('fs');

function processFile(fullPath) {
  if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
    let content = fs.readFileSync(fullPath, 'utf8');
    let original = content;

    // Standardize border radius
    content = content.replace(/rounded-\[3[0-9]px\]/g, 'rounded-[24px]');
    content = content.replace(/rounded-\[28px\]/g, 'rounded-[24px]');
    
    // Standardize empty state massive padding (px-8 py-16) to something a bit tighter and more uniform
    content = content.replace(/px-8 py-16/g, 'px-6 py-12');
    
    // Standardize dialog max-w-sm padding inside confirming modals
    // p-8 -> p-6 sm:p-8
    content = content.replace(/bg-white\/95 p-8 leading/g, 'bg-white/95 p-6 sm:p-8 leading');
    
    if (content !== original) {
      fs.writeFileSync(fullPath, content, 'utf8');
      console.log('Fixed border spacing in', fullPath);
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

// Target all dashboard CRM-related pages
try { processDirectory('src/app/(dashboard)/analytics'); } catch(e){}
try { processDirectory('src/app/(dashboard)/contacts'); } catch(e){}
try { processDirectory('src/app/(dashboard)/crm'); } catch(e){}
try { processDirectory('src/app/(dashboard)/deals'); } catch(e){}
try { processDirectory('src/app/(dashboard)/leads'); } catch(e){}
try { processDirectory('src/app/(dashboard)/pipelines'); } catch(e){}
try { processDirectory('src/app/(dashboard)/tasks'); } catch(e){}
try { processDirectory('src/app/(apps)/apps/crm'); } catch(e){}

