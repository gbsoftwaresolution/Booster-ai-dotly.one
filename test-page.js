const fs = require('fs');
const code = fs.readFileSync('apps/web/src/app/(dashboard)/settings/billing/components.tsx', 'utf8');
const React = require('react'); // Just to see if it parses if I used babel, but better to just look
