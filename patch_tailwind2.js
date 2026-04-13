const fs = require('fs')
const p = 'apps/web/tailwind.config.ts'
let c = fs.readFileSync(p, 'utf8')

if (!c.includes('fade-in-up')) {
  c = c.replace(
    /float: \{\n\s*'0%, 100%': \{ transform: 'translateY\(0\)' \},\n\s*'50%': \{ transform: 'translateY\(-10px\)' \},\n\s*\}/,
    `float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        }`
  )
  c = c.replace(
    /float: 'float 6s ease-in-out infinite',/,
    `float: 'float 6s ease-in-out infinite',
        'fade-in-up': 'fade-in-up 0.5s ease-out forwards',`
  )
  fs.writeFileSync(p, c, 'utf8')
}
