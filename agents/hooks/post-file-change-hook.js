// post-file-change-hook.js — append-only progress log (animv4 pattern).
// Usage: node agents/hooks/post-file-change-hook.js <sprint> <file> "<action>"
// Appends a JSONL row to "twitterslv2 docs/sprint-history/current-sprint.md"
// (created if missing). Folder has a space — always quote the path in shell.
// ESM (repo package.json has "type": "module").
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const [, , sprint, file, action] = process.argv;
if (!sprint || !file || !action) {
  console.error('Usage: node post-file-change-hook.js <sprint> <file> "<action>"');
  process.exit(1);
}

const here = path.dirname(fileURLToPath(import.meta.url));
const logPath = path.join(here, '..', '..', 'twitterslv2 docs', 'sprint-history', 'current-sprint.md');
const row =
  JSON.stringify({
    timestamp: new Date().toISOString(),
    sprint,
    file,
    action,
  }) + '\n';

fs.mkdirSync(path.dirname(logPath), { recursive: true });
fs.appendFileSync(logPath, row);
console.log(`logged: ${sprint} ${file} — ${action}`);
