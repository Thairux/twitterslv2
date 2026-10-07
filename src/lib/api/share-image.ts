// API: share-image — branded post PNG renderer (3.0.0 S5).
// Canvas-2D only, no dependencies: TSL plate header + wrapped body +
// footer. Used by the PostCard Share button (download) and anywhere a
// post leaves the app.

export interface ShareCard {
  body: string;
  authorName: string;
  timeLabel: string;
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const trial = line ? `${line} ${w}` : w;
    if (ctx.measureText(trial).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else {
      line = trial;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 24);
}

export function renderPostPNG(card: ShareCard): string {
  const W = 1080;
  const pad = 64;
  const canvas = document.createElement('canvas');
  const measure = canvas.getContext('2d');
  if (!measure) throw new Error('Canvas unavailable');
  measure.font = '600 44px Arial, sans-serif';
  const lines = wrapText(measure, card.body.slice(0, 560), W - pad * 2);
  const H = 300 + lines.length * 58 + 120;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');

  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, W, H);
  // Brand plate.
  ctx.fillStyle = 'rgba(123,47,247,0.55)';
  ctx.fillRect(pad + 24, 64 + 24, W - pad * 2, 120);
  ctx.fillStyle = '#f5d90a';
  ctx.fillRect(pad + 12, 64 + 12, W - pad * 2, 120);
  ctx.fillStyle = '#7b2ff7';
  ctx.fillRect(pad, 64, W - pad * 2, 120);
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 6;
  ctx.strokeRect(pad, 64, W - pad * 2, 120);
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 56px Arial, sans-serif';
  ctx.fillText('#tsl', pad + 32, 64 + 80);
  // Author + body.
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 44px Arial, sans-serif';
  ctx.fillText(card.authorName.slice(0, 40), pad, 300);
  ctx.fillStyle = '#a0a0a0';
  ctx.font = '400 32px Arial, sans-serif';
  ctx.fillText(card.timeLabel.slice(0, 40), pad, 344);
  ctx.fillStyle = '#ffffff';
  ctx.font = '400 44px Arial, sans-serif';
  lines.forEach((line, i) => {
    ctx.fillText(line, pad, 420 + i * 58);
  });
  ctx.fillStyle = '#f5d90a';
  ctx.font = '400 28px Arial, sans-serif';
  ctx.fillText('TSL island', pad, H - 48);
  return canvas.toDataURL('image/png');
}

export function downloadPostPNG(card: ShareCard, filename: string): void {
  const url = renderPostPNG(card);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
