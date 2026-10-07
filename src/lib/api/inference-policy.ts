// API: inference-policy — Strict/Hybrid/Offline inference policy (3.0.0 S1).
// Strict (default): a CONFIGURED endpoint that fails produces NO pool
// content — skip + diagnose. Pools are only ever allowed when no endpoint
// is configured at all (classic local-first sim) or the mode is hybrid
// (pools with offline origin) / offline (pools by choice).
// Also: per-endpoint aggressive cooldown (429 starts at 2min, doubles,
// max 1h; connection errors 60s), fallback counters, shared live-client
// builder, and real inference validation mapping to 8 states.

import { ModelClient } from './model-client';
import { refreshConfig, getModelEndpoint, getApiKey, getSelectedModel } from '../config';
import { noteAmbientFallback, noteAmbientLive } from './ambient-status';
import { tryLocalChat } from './local-inference';

export type InferencePolicyMode = 'strict' | 'hybrid' | 'offline';

export type InferenceState =
  | 'READY_LIVE'
  | 'AUTH_FAILURE'
  | 'MODEL_FAILURE'
  | 'ENDPOINT_FAILURE'
  | 'TIMEOUT'
  | 'RATE_LIMITED'
  | 'LOCAL_READY'
  | 'LOCAL_FAILURE'
  | 'OFFLINE';

export const POLICY_KEY = 'inference_policy';
export const AMBIENT_LOCAL_KEY = 'ambient_local';

const COOLDOWN_BASE_MS = 2 * 60 * 1000;
const COOLDOWN_MAX_MS = 60 * 60 * 1000;
const CONN_COOLDOWN_MS = 60 * 1000;

interface StoreLike {
  getAgentConfig(key: string): Promise<{ key: string; value: string } | null>;
}

export async function getInferencePolicy(store: StoreLike): Promise<InferencePolicyMode> {
  try {
    const cfg = await store.getAgentConfig(POLICY_KEY);
    if (cfg && (cfg.value === 'strict' || cfg.value === 'hybrid' || cfg.value === 'offline')) {
      return cfg.value;
    }
  } catch {
    // fall through to default
  }
  return 'strict';
}

export async function ambientLocalEnabled(store: StoreLike): Promise<boolean> {
  try {
    const cfg = await store.getAgentConfig(AMBIENT_LOCAL_KEY);
    return cfg?.value === '1';
  } catch {
    return false;
  }
}

// --- Cooldown registry (in-memory; restarts reset) ---

const cooledUntil = new Map<string, number>();
const cooldownStreak = new Map<string, number>();

export function isCooled(endpoint: string): boolean {
  const until = cooledUntil.get(endpoint);
  return until !== undefined && Date.now() < until;
}

export function cooldownUntil(endpoint: string): number | null {
  const until = cooledUntil.get(endpoint);
  return until !== undefined && Date.now() < until ? until : null;
}

export function classifyError(err: unknown): InferenceState {
  const msg = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
  const name = err instanceof Error ? err.name : '';
  if (name === 'AuthError' || /401|403/.test(msg)) return 'AUTH_FAILURE';
  if (name === 'RateLimitError' || /429|Rate limited/i.test(msg)) return 'RATE_LIMITED';
  if (/abort|timeout|timed out/i.test(msg)) return 'TIMEOUT';
  if (name === 'ParseError' || /malformed|choices|model|400|404|422/i.test(msg)) return 'MODEL_FAILURE';
  return 'ENDPOINT_FAILURE';
}

function noteCooldown(endpoint: string, state: InferenceState): void {
  if (!endpoint) return;
  if (state === 'RATE_LIMITED') {
    const streak = (cooldownStreak.get(endpoint) ?? 0) + 1;
    cooldownStreak.set(endpoint, streak);
    const wait = Math.min(COOLDOWN_BASE_MS * 2 ** (streak - 1), COOLDOWN_MAX_MS);
    cooledUntil.set(endpoint, Date.now() + wait);
  } else if (state === 'ENDPOINT_FAILURE' || state === 'TIMEOUT') {
    cooledUntil.set(endpoint, Date.now() + CONN_COOLDOWN_MS);
  }
}

export function clearCooldown(endpoint: string): void {
  cooledUntil.delete(endpoint);
  cooldownStreak.delete(endpoint);
}

// --- Fallback counters (in-memory; aggregate-then-report) ---

const fallbackCounts = new Map<string, number>();

export function recordFallback(provider: string, reason: string): void {
  const key = `${provider} :: ${reason}`;
  fallbackCounts.set(key, (fallbackCounts.get(key) ?? 0) + 1);
}

export function getFallbackCounters(): Array<{ key: string; count: number }> {
  return [...fallbackCounts.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count);
}

/** Single call for every ambient failure site: diagnose + cool + count. */
export function reportAmbientFailure(where: string, err: unknown, client?: ModelClient): InferenceState {
  const state = classifyError(err);
  noteAmbientFallback(where, err);
  const endpoint = client?.chatEndpoint ?? '';
  noteCooldown(endpoint, state);
  recordFallback(endpoint || '(no endpoint)', state);
  return state;
}

// --- Shared live-client builder (one construction for all callers) ---

export async function buildLiveClient(): Promise<ModelClient | undefined> {
  try {
    await refreshConfig();
    const endpoint = (await getModelEndpoint()).trim();
    if (!endpoint) return undefined;
    if (isCooled(endpoint)) return undefined;
    const key = await getApiKey();
    const model = await getSelectedModel();
    return new ModelClient(endpoint, key ?? undefined, model ? { defaultModel: model } : {});
  } catch {
    return undefined;
  }
}

export interface ValidationResult {
  state: InferenceState;
  latencyMs: number;
  model?: string;
  error?: string;
}

/** Real minimal-chat validation: proves inference, not just reachability. */
export async function validateInference(
  client: Pick<ModelClient, 'chat' | 'defaultModel'>,
): Promise<ValidationResult> {
  const started = Date.now();
  try {
    await client.chat([{ role: 'user', content: 'Reply with exactly: OK' }]);
    noteAmbientLive();
    if (client.defaultModel) clearCooldown('');
    return { state: 'READY_LIVE', latencyMs: Date.now() - started, model: client.defaultModel };
  } catch (err) {
    const state = classifyError(err);
    return {
      state,
      latencyMs: Date.now() - started,
      model: client.defaultModel,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// --- Local chain (cloud → local → pools-per-mode) ---

/** Try on-device inference once. Returns live text or undefined. */
export async function tryAmbientLocal(
  messages: Array<{ role: string; content: string }>,
): Promise<{ text: string } | undefined> {
  try {
    const res = await tryLocalChat(messages);
    if (res.text) {
      noteAmbientLive();
      return { text: res.text };
    }
    noteAmbientFallback('ambient-local', res.error ?? 'local unavailable');
    return undefined;
  } catch (err) {
    noteAmbientFallback('ambient-local', err);
    return undefined;
  }
}

/** Test seam: reset all in-memory policy state. */
export function resetInferencePolicyState(): void {
  cooledUntil.clear();
  cooldownStreak.clear();
  fallbackCounts.clear();
}
