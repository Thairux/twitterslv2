// API: local-inference — on-device GGUF inference via `llama-cpp-capacitor`.
// Falls back to WebLLM / Transformers.js on web when the native plugin is absent.
// The rest of the app never depends on local inference being present.

export interface LocalInferenceEngine {
  readonly available: boolean;
  readonly reason?: string;
  chat?(messages: Array<{ role: string; content: string }>, signal?: AbortSignal): Promise<string>;
}

function isNative(): boolean {
  try {
    return (globalThis as any).Capacitor?.isNativePlatform?.() ?? false;
  } catch {
    return false;
  }
}

async function createNativeEngine(): Promise<LocalInferenceEngine> {
  try {
    // @ts-ignore - optional native plugin; types may be incomplete
    const mod = await import('llama-cpp-capacitor');
    const LlamaCpp = (mod as any).LlamaCpp ?? (mod as any).default?.LlamaCpp;
    if (!LlamaCpp) {
      return { available: false, reason: 'LlamaCpp plugin not available' };
    }

    return {
      available: true,
      async chat(messages, signal) {
        try {
          const formatted = await LlamaCpp.getFormattedChat(messages);
          const prompt = typeof formatted === 'string' ? formatted : formatted?.prompt ?? '';
          const result = await LlamaCpp.completion({ prompt, signal });
          const text = typeof result === 'string' ? result : result?.text ?? '';
          return String(text);
        } catch (err) {
          throw new Error(`Native local inference failed: ${err instanceof Error ? err.message : String(err)}`);
        }
      },
    };
  } catch {
    return { available: false, reason: 'llama-cpp-capacitor is not installed' };
  }
}

async function createWebEngine(): Promise<LocalInferenceEngine> {
  const webLLM = (globalThis as any).webllm;
  if (webLLM && typeof webLLM.CreateMLCEngine === 'function') {
    try {
      const engine = await webLLM.CreateMLCEngine();
      return {
        available: true,
        async chat(messages, signal) {
          try {
            const result = await engine.chat.completions.create({ messages, signal });
            return result.choices?.[0]?.message?.content ?? '';
          } catch (err) {
            throw new Error(`WebLLM inference failed: ${err instanceof Error ? err.message : String(err)}`);
          }
        },
      };
    } catch {
      // fall through to transformers.js check
    }
  }

  const transformers = (globalThis as any).transformers;
  if (transformers && typeof transformers.pipeline === 'function') {
    return {
      available: true,
      async chat(messages) {
        const last = messages[messages.length - 1]?.content ?? '';
        try {
          const generator = await transformers.pipeline('text-generation', 'Xenova/LaMini-Flan-T5-783M');
          const out = await generator(last, { max_new_tokens: 256 });
          return String(out?.[0]?.generated_text ?? '');
        } catch (err) {
          throw new Error(`Transformers.js inference failed: ${err instanceof Error ? err.message : String(err)}`);
        }
      },
    };
  }

  return { available: false, reason: 'No web local inference runtime detected' };
}

let cachedEngine: LocalInferenceEngine | null = null;

export async function getLocalInferenceEngine(): Promise<LocalInferenceEngine> {
  if (cachedEngine) return cachedEngine;

  if (isNative()) {
    cachedEngine = await createNativeEngine();
  } else {
    cachedEngine = await createWebEngine();
  }

  return cachedEngine;
}

export async function tryLocalChat(
  messages: Array<{ role: string; content: string }>,
  signal?: AbortSignal,
): Promise<{ text?: string; error?: string }> {
  const engine = await getLocalInferenceEngine();
  if (!engine.available || !engine.chat) {
    return { error: engine.reason ?? 'Local inference unavailable' };
  }
  try {
    const text = await engine.chat(messages, signal);
    return { text };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

export async function listLocalModels(): Promise<string[]> {
  try {
    // @ts-ignore - optional native plugin; types may be incomplete
    const mod = await import('llama-cpp-capacitor');
    const LlamaCpp = (mod as any).LlamaCpp ?? (mod as any).default?.LlamaCpp;
    if (!LlamaCpp?.getAvailableModels) return [];
    const models = await LlamaCpp.getAvailableModels();
    return Array.isArray(models) ? models.map((m: any) => m?.path ?? m?.name ?? String(m)) : [];
  } catch {
    return [];
  }
}
