// Components: PersonaAvatar — deterministic SVG identity (3.0.0 S4).
// Seed-hash geometry + per-persona accent replaces initial letters
// everywhere identity shows. Pure render, no store.

const ACCENTS = ['#7b2ff7', '#f5d90a', '#00c2a8', '#ff6b6b', '#4aa8ff', '#ff9f1c'];

function hashSeed(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function accentFor(seed: string): string {
  return ACCENTS[hashSeed(seed || '?') % ACCENTS.length];
}

export function PersonaAvatar({ seed, displayName, size = 40 }: { seed: string; displayName: string; size?: number }) {
  const h = hashSeed(`${seed}:${displayName}`);
  const bg = ACCENTS[h % ACCENTS.length];
  const fg = ACCENTS[(h >>> 3) % ACCENTS.length];
  const cx = 50;
  const cy = 50;
  const r1 = 18 + ((h >>> 5) % 14);
  const r2 = 8 + ((h >>> 9) % 10);
  const rot = h % 360;
  const initial = (displayName || '?')[0];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role="img"
      aria-label={displayName}
      style={{ borderRadius: '50%', border: '2px solid #000', flexShrink: 0, background: bg }}
      data-testid="persona-avatar"
    >
      <circle cx={cx} cy={cy} r={r1} fill={fg} opacity={0.85} />
      <g transform={`rotate(${rot} ${cx} ${cy})`}>
        <circle cx={cx} cy={cy - r1 / 2} r={r2} fill={bg} />
        <rect x={cx - 4} y={cy - r1} width={8} height={r1 * 2} fill={bg} opacity={0.7} />
      </g>
      <text x={cx} y={cy + 11} textAnchor="middle" fontSize={34} fontWeight="bold" fill="#000" opacity={0.9}>
        {initial}
      </text>
    </svg>
  );
}
