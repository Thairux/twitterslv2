# design-tokens — TSL Neobrutalism

Load before any CSS/visual work. Tokens are law, verbatim from
`alldemos/ocdemo/` (see `src/styles/tokens.css`).

## Tokens
- Dark: `--bg #000000`, `--card #111111`, `--border #00ffcc`,
  `--text #00ffcc`, `--text-dim #009977`, `--accent #ff00ff`.
- Light: `--bg #ffdf00`, `--card #ffffff`, `--border #000000`,
  `--text #000000`, `--accent #ff00ff`. Same magenta accent both themes.
- `--border-width 3px`, `--radius 0px`, hard offset `--shadow`,
  mono uppercase type, press-down buttons (`translate(2px,2px)`).
- Phone column `max-width 450px`; sticky utility header; fixed bottom 4-tab bar.

No ad-hoc colors, radii, or shadows. New component? Derive from tokens.
