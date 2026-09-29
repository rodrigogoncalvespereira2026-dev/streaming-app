import { gzipSync } from 'node:zlib';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const DIST = 'dist';
const LIMIT = 50 * 1024; // 50 KB gzipped budget for runtime JS

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

let total = 0;
const rows = [];
for (const file of walk(DIST)) {
  if (!/\.(js|css)$/.test(file)) continue;
  const raw = readFileSync(file);
  const gz = gzipSync(raw).length;
  const isRuntimeJs = file.endsWith('.js') && !file.endsWith('sw.js');
  if (isRuntimeJs) total += gz;
  rows.push({ file: file.slice(DIST.length + 1), raw: raw.length, gz });
}

rows.sort((a, b) => b.gz - a.gz);
for (const r of rows) {
  console.log(`${r.file.padEnd(40)} ${String(r.raw).padStart(7)} B  ${String(r.gz).padStart(6)} B gz`);
}
console.log('\nRuntime JS (excl. sw.js): ' + (total / 1024).toFixed(1) + ' KB gzipped');
if (total > LIMIT) {
  console.error('Over the ' + (LIMIT / 1024) + ' KB budget by ' + ((total - LIMIT) / 1024).toFixed(1) + ' KB');
  process.exit(1);
}
