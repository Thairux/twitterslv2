import fs from 'node:fs';
import path from 'node:path';
const root = String.raw`C:\Users\ptmth\Desktop\main project\twitterslv2`;
function list(rel) {
  const base = path.join(root, rel);
  if (!fs.existsSync(base)) return 'MISSING';
  const out = [];
  function walk(dir, depth) {
    if (depth > 4) return;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const rel2 = path.join(dir, e.name).replace(root + path.sep, '');
      out.push(rel2);
      if (e.isDirectory()) walk(path.join(dir, e.name), depth + 1);
    }
  }
  walk(base, 0);
  return out;
}
console.log(JSON.stringify({ src: list('src'), docs: list('twitterslv2 docs'), agents: list('agents') }, null, 2));
