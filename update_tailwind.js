const fs = require('fs')
const p = 'apps/web/tailwind.config.ts'
let c = fs.readFileSync(p, 'utf8')

if (!c.includes('keyframes: {')) {
  c = c.replace(/extend: \{/, 
\`extend: {
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'float-delayed': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-15px)' },
        },
      },
      animation: {
        float: 'float 6s ease-in-out infinite',
        'float-delayed': 'float-delayed 7s ease-in-out infinite 2.5s',
      },\`)
  fs.writeFileSync(p, c, 'utf8')
}
