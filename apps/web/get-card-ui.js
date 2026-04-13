const fs = require('fs')
const content = fs.readFileSync('src/app/(apps)/apps/cards/page.tsx', 'utf8')
// Find something like <div className="card... or <Link href={\`/apps/cards/\${card.id}/edit\`} 
const match = content.match(/<Link\s+href=\{\`\/apps\/cards\/\$\{card\.id\}\/edit\`\}[\s\S]*?<\/Link>/)
if (match) console.log(match[0].slice(0, 1500))
else {
  const match2 = content.match(/<li[\s\S]*?<\/li>/)
  if (match2) console.log(match2[0].slice(0, 1500))
  else console.log("Not found")
}
