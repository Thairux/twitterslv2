// Native adapter: on-device inference (Sprint 7+).
// - Native (Android/iOS): llama-cpp-capacitor `initLlama` + `completion`.
// - Web (browser preview): the native bridge is absent, so this adapter runs a
//   clearly-labelled browser simulation against the downloaded blob. This keeps
//   the full local-model flow (download → select → run → reply) testable in a
//   browser without pretending real inference happened (`simulated: true`).
// Callers never branch on platform; the adapter owns it.

import type { FilesAdapter } from './files';

export interface LocalRunResult {
  text: string;
  /** True when the reply is a browser simulation, not real GGUF inference. */
  simulated: boolean;
  modelPath: string;
}

const SIM_POOL = [
  'hey! good to see you here.',
  'that is an interesting thought, tell me more.',
  'haha, classic island moment.',
  'i was just thinking the same thing!',
];

function isNative(): boolean {
  try {
    return (globalThis as any).Capacitor?.isNativePlatform?.() ?? false;
  } catch {
    return false;
  }
}

function pickSim(prompt: string): string {
  let h = 0;
  for (let i = 0; i < prompt.length; i++) h = (h * 31 + prompt.charCodeAt(i)) >>> 0;
  return SIM_POOL[h % SIM_POOL.length];
}

export async function runLocalModel(
  files: FilesAdapter,
  modelPath: string,
  prompt: string,
): Promise<LocalRunResult> {
  const blob = await files.loadBlob(modelPath);
  if (!blob) {
    throw new Error(
      `Model file not found on this device: ${modelPath}. Download it first from the Models tab.`,
    );
  }

  if (isNative()) {
    try {
      const llama = await import('llama-cpp-capacitor');
      const ctx = await llama.initLlama({ model: modelPath } as any);
      try {
        const res = await ctx.completion({ prompt, n_predict: 128 } as any);
        const text = typeof (res as { text?: unknown }).text === 'string'
          ? (res as { text: string }).text
          : '…';
        return { text, simulated: false, modelPath };
      } finally {
        try {
          await ctx.release();
        } catch {
          // ignore release failures
        }
      }
    } catch (err) {
      throw new Error(
        `On-device inference failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  // Web fallback: deterministic simulation, honestly labelled.
  await new Promise((r) => setTimeout(r, 300));
  const mb = (blob.byteLength / 1024 / 1024).toFixed(1);
  return {
    text: `[browser-sim] ${pickSim(prompt)} (model ${modelPath}, ${mb} MB on device)`,
    simulated: true,
    modelPath,
  };
}
