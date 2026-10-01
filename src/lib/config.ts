// Lib: config — Model Endpoint URL, sidecars, feature flags (Sprint 2).
// Reads from native secrets first, falls back to Vite env, never hardcoded.
// Secrets come from native/secrets.ts (rule 07).

import { getModelEndpoint as _getModelEndpoint, getApiKey as _getApiKey } from '../native/secrets';

function getEnvEndpoint(): string {
  try {
    return (import.meta as any).env?.VITE_MODEL_ENDPOINT ?? '';
  } catch {
    return '';
  }
}

export interface AppConfig {
  modelEndpoint: string;
  apiKey: string | null;
  featureFlags: {
    enableSimulation: boolean;
    enableNotifications: boolean;
    enableMemory: boolean;
    enableBackgroundTasks: boolean;
  };
}

let cachedEndpoint: string | null = null;
let cachedApiKey: string | null = null;

async function resolveEndpoint(): Promise<string> {
  if (cachedEndpoint) return cachedEndpoint;
  cachedEndpoint = (await _getModelEndpoint()) || getEnvEndpoint();
  return cachedEndpoint;
}

async function resolveApiKey(): Promise<string | null> {
  if (cachedApiKey !== null) return cachedApiKey;
  cachedApiKey = await _getApiKey();
  return cachedApiKey;
}

export async function getModelEndpoint(): Promise<string> {
  return resolveEndpoint();
}

export async function getApiKey(): Promise<string | null> {
  return resolveApiKey();
}

export const config: AppConfig = {
  get modelEndpoint() {
    return cachedEndpoint ?? getEnvEndpoint();
  },
  get apiKey() {
    return cachedApiKey ?? null;
  },
  featureFlags: {
    enableSimulation: true,
    enableNotifications: true,
    enableMemory: true,
    enableBackgroundTasks: false,
  },
};

export async function refreshConfig(): Promise<void> {
  cachedEndpoint = null;
  cachedApiKey = null;
  await resolveEndpoint();
  await resolveApiKey();
}
