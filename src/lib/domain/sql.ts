// Pure SQL splitter (used by the web driver; native passes statements through).
// No imports — node-testable.
export function splitStatements(sql: string): string[] {
  const code = sql
    .split('\n')
    .filter((line) => !line.trimStart().startsWith('--'))
    .join('\n');
  const out: string[] = [];
  let cur = '';
  let inStr = false;
  for (let i = 0; i < code.length; i++) {
    const ch = code[i];
    if (ch === "'") {
      if (inStr && code[i + 1] === "'") {
        cur += "''";
        i += 1;
        continue;
      }
      inStr = !inStr;
      cur += ch;
      continue;
    }
    if (ch === ';' && !inStr) {
      if (cur.trim()) out.push(cur.trim());
      cur = '';
      continue;
    }
    cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out.filter((s) => s.length > 0);
}
