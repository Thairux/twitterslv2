export function BirdLogo() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      width="32"
      height="32"
      role="img"
      aria-label="TSL"
    >
      <title>TSL</title>
      <g fill="var(--accent)">
        <path d="M20 34 C20 24 28 16 38 16 C44 16 48 19 50 23 L55 25 L50 27 C51 28.5 51.5 30.5 51.5 32.5 C51.5 42 43 50 32 50 C26 50 21.5 48 18 44.5 L26 42 L19 39.5 C19.3 37.5 19.6 35.8 20 34 Z" />
        <path d="M28 34 C30 28 35 24 41 24 C43.5 28 43 33 40 37 C37 40.5 31.5 39.5 28 34 Z" fill="var(--accent-hover)" />
        <path d="M18 44.5 L8 48 L12 43 L10 40 L18 41 Z" />
        <circle cx="43" cy="23.5" r="2.2" fill="var(--bg)" />
      </g>
      <rect x="6" y="52" width="52" height="4" rx="2" fill="var(--accent)" opacity="0.45" />
      <g stroke="var(--accent)" strokeWidth="2.4" strokeLinecap="round">
        <line x1="30" y1="49" x2="30" y2="53" />
        <line x1="38" y1="49" x2="38" y2="53" />
      </g>
    </svg>
  );
}
