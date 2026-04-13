const fs = require('fs')

const p = 'apps/web/src/components/card-builder/AvatarUploader.tsx'
const c = fs.readFileSync(p, 'utf8')

let newC = c.replace('first?.focus()', 'first?.focus({ preventScroll: true })')
newC = newC.replace('first?.focus()', 'first?.focus({ preventScroll: true })')
newC = newC.replace('last?.focus()', 'last?.focus({ preventScroll: true })')
newC = newC.replace('className="relative z-10 w-full max-w-sm rounded-t-3xl sm:rounded-3xl bg-white p-5 shadow-2xl"', 'className="relative z-10 flex w-full max-w-sm flex-col max-h-[90dvh] rounded-t-[32px] sm:rounded-[32px] bg-white p-5 shadow-[0_-8px_40px_rgba(0,0,0,0.12)] mb-[env(safe-area-inset-bottom)] sm:mb-0"')

newC = newC.replace('        {tab === \'upload\' && <UploadTab cardId={cardId} onConfirm={handleConfirm} />}', '        <div className="flex-1 min-h-0 overflow-y-auto w-full">\n          {tab === \'upload\' && <UploadTab cardId={cardId} onConfirm={handleConfirm} />}\n        </div>')
newC = newC.replace('        {tab === \'camera\' && <CameraTab cardId={cardId} onConfirm={handleConfirm} />}', '        {tab === \'camera\' && <CameraTab cardId={cardId} onConfirm={handleConfirm} />}\n')

fs.writeFileSync(p, newC, 'utf8')
