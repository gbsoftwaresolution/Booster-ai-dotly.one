const fs = require('fs')
const p = 'apps/web/tailwind.config.ts'
let c = fs.readFileSync(p, 'utf8')

c = c.replace(/extend: \{/, 
`extend: {
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'float-delayed': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-15px)' },
        },
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        float: 'float 6s ease-in-out infinite',
        'float-delayed': 'float-delayed 7s ease-in-out infinite 2.5s',
        'fade-in-up': 'fade-in-up 0.5s ease-out forwards',
      },`)
fs.writeFileSync(p, c, 'utf8')
