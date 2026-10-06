// Lib: config — Model Endpoint URL, sidecars, feature flags (Sprint 2).
// Reads from native secrets first, falls back to Vite env, never hardcoded.
// Secrets come from native/secrets.ts (rule 07).

import { getModelEndpoint as _getModelEndpoint, getApiKey as _getApiKey, getImageGenEndpoint as _getImageGenEndpoint, getCaptionEndpoint as _getCaptionEndpoint, getSelectedModel as _getSelectedModel, getSelectedImageModel as _getSelectedImageModel, getSelectedCaptionModel as _getSelectedCaptionModel } from '../native/secrets';

function getEnvEndpoint(): string {
  try {
    return (import.meta as any).env?.VITE_MODEL_ENDPOINT ?? '';
  } catch {
    return '';
  }
}

function getEnvImageGenEndpoint(): string {
  try {
    return (import.meta as any).env?.VITE_IMAGE_GEN_ENDPOINT ?? 'http://127.0.0.1:8188';
  } catch {
    return 'http://127.0.0.1:8188';
  }
}

function getEnvCaptionEndpoint(): string {
  try {
    return (import.meta as any).env?.VITE_CAPTION_ENDPOINT ?? 'http://127.0.0.1:8081';
  } catch {
    return 'http://127.0.0.1:8081';
  }
}

export interface AppConfig {
  modelEndpoint: string;
  apiKey: string | null;
  imageGenEndpoint: string;
  captionEndpoint: string;
  selectedModel: string | null;
  selectedImageModel: string | null;
  selectedCaptionModel: string | null;
  featureFlags: {
    enableSimulation: boolean;
    enableNotifications: boolean;
    enableMemory: boolean;
    enableBackgroundTasks: boolean;
    enableImageGeneration: boolean;
    enableCaptioning: boolean;
  };
}

let cachedEndpoint: string | null = null;
let cachedApiKey: string | null = null;
let cachedImageGenEndpoint: string | null = null;
let cachedCaptionEndpoint: string | null = null;
let cachedSelectedModel: string | null = null;
let cachedSelectedImageModel: string | null = null;
let cachedSelectedCaptionModel: string | null = null;

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

async function resolveImageGenEndpoint(): Promise<string> {
  if (cachedImageGenEndpoint) return cachedImageGenEndpoint;
  cachedImageGenEndpoint = (await _getImageGenEndpoint()) || getEnvImageGenEndpoint();
  return cachedImageGenEndpoint;
}

async function resolveCaptionEndpoint(): Promise<string> {
  if (cachedCaptionEndpoint) return cachedCaptionEndpoint;
  cachedCaptionEndpoint = (await _getCaptionEndpoint()) || getEnvCaptionEndpoint();
  return cachedCaptionEndpoint;
}

async function resolveSelectedModel(): Promise<string | null> {
  if (cachedSelectedModel !== null) return cachedSelectedModel;
  cachedSelectedModel = await _getSelectedModel();
  return cachedSelectedModel;
}

async function resolveSelectedImageModel(): Promise<string | null> {
  if (cachedSelectedImageModel !== null) return cachedSelectedImageModel;
  cachedSelectedImageModel = await _getSelectedImageModel();
  return cachedSelectedImageModel;
}

async function resolveSelectedCaptionModel(): Promise<string | null> {
  if (cachedSelectedCaptionModel !== null) return cachedSelectedCaptionModel;
  cachedSelectedCaptionModel = await _getSelectedCaptionModel();
  return cachedSelectedCaptionModel;
}

export async function getModelEndpoint(): Promise<string> {
  return resolveEndpoint();
}

export async function getApiKey(): Promise<string | null> {
  return resolveApiKey();
}

export async function getImageGenEndpoint(): Promise<string> {
  return resolveImageGenEndpoint();
}

export async function getCaptionEndpoint(): Promise<string> {
  return resolveCaptionEndpoint();
}

export async function getSelectedModel(): Promise<string | null> {
  return resolveSelectedModel();
}

export async function getSelectedImageModel(): Promise<string | null> {
  return resolveSelectedImageModel();
}

export async function getSelectedCaptionModel(): Promise<string | null> {
  return resolveSelectedCaptionModel();
}

export const config: AppConfig = {
  get modelEndpoint() {
    return cachedEndpoint ?? getEnvEndpoint();
  },
  get apiKey() {
    return cachedApiKey ?? null;
  },
  get imageGenEndpoint() {
    return cachedImageGenEndpoint ?? getEnvImageGenEndpoint();
  },
  get captionEndpoint() {
    return cachedCaptionEndpoint ?? getEnvCaptionEndpoint();
  },
  get selectedModel() {
    return cachedSelectedModel ?? null;
  },
  get selectedImageModel() {
    return cachedSelectedImageModel ?? null;
  },
  get selectedCaptionModel() {
    return cachedSelectedCaptionModel ?? null;
  },
  featureFlags: {
    enableSimulation: true,
    enableNotifications: true,
    enableMemory: true,
    enableBackgroundTasks: false,
    enableImageGeneration: true,
    enableCaptioning: true,
  },
};

export async function refreshConfig(): Promise<void> {
  cachedEndpoint = null;
  cachedApiKey = null;
  cachedImageGenEndpoint = null;
  cachedCaptionEndpoint = null;
  cachedSelectedModel = null;
  cachedSelectedImageModel = null;
  cachedSelectedCaptionModel = null;
  await resolveEndpoint();
  await resolveApiKey();
  await resolveImageGenEndpoint();
  await resolveCaptionEndpoint();
  await resolveSelectedModel();
  await resolveSelectedImageModel();
  await resolveSelectedCaptionModel();
}
