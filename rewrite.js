const fs = require('fs');
let code = fs.readFileSync('packages/ui/src/templates/CreativeTemplate.tsx', 'utf8');
const search = `        {/* ── Portfolio strip ── */}`;
const endSearch = `        {/* Divider */}`;
const idx1 = code.indexOf(search);
const idx2 = code.indexOf(endSearch);

if (idx1 !== -1 && idx2 !== -1) {
  const replacement = `        {/* Media blocks */}
        {mediaBlocks && mediaBlocks.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <MediaBlockList blocks={mediaBlocks} accentColor={primary} />
          </div>
        )}\n\n`;
  code = code.substring(0, idx1) + replacement + code.substring(idx2);
  // Also strip the helper functions at the bottom since they are not used now.
  // Actually might be safer just to replace the block.
  fs.writeFileSync('packages/ui/src/templates/CreativeTemplate.tsx', code);
  console.log('Success');
} else {
  console.log('Failed to find ranges');
}
