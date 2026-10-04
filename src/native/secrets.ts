// Native adapter: secrets (Sprint 2).
// Model Endpoint URL + API keys live here ONLY — never SQLite/logs (rule 07).
// - Native: Capacitor Preferences (non-sensitive) + secure storage (keys).
// - Web: localStorage fallback namespaced `tsl-*`.

const WEB_NS = 'tsl-';
const KEY_ENDPOINT = `${WEB_NS}endpoint`;
const KEY_APIKEY = `${WEB_NS}apikey`;
const KEY_IMAGE_GEN_ENDPOINT = `${WEB_NS}image-gen-endpoint`;
const KEY_CAPTION_ENDPOINT = `${WEB_NS}caption-endpoint`;
const KEY_SELECTED_MODEL = `${WEB_NS}selected-model`;

const WEB_SECRET = 'tsl-web-obfuscation-key';

function obfuscate(value: string): string {
  let result = '';
  for (let i = 0; i < value.length; i++) {
    result += String.fromCharCode(value.charCodeAt(i) ^ WEB_SECRET.charCodeAt(i % WEB_SECRET.length));
  }
  return btoa(result);
}

function deobfuscate(value: string): string {
  const binary = atob(value);
  let result = '';
  for (let i = 0; i < binary.length; i++) {
    result += String.fromCharCode(binary.charCodeAt(i) ^ WEB_SECRET.charCodeAt(i % WEB_SECRET.length));
  }
  return result;
}

function isNative(): boolean {
  try {
    return (globalThis as any).Capacitor?.isNativePlatform?.() ?? false;
  } catch {
    return false;
  }
}

async function prefGet(key: string): Promise<string | null> {
  const { Preferences } = await import('@capacitor/preferences');
  const { value } = await Preferences.get({ key });
  return value ?? null;
}

async function prefSet(key: string, value: string): Promise<void> {
  const { Preferences } = await import('@capacitor/preferences');
  await Preferences.set({ key, value });
}

async function secureGet(key: string): Promise<string | null> {
  try {
    const mod = await import('@capacitor/community/secure-storage');
    const { SecureStoragePlugin } = mod;
    if (!SecureStoragePlugin) return null;
    const { value } = await SecureStoragePlugin.get({ key });
    return value ?? null;
  } catch {
    return null;
  }
}

async function secureSet(key: string, value: string): Promise<void> {
  try {
    const mod = await import('@capacitor/community/secure-storage');
    const { SecureStoragePlugin } = mod;
    if (!SecureStoragePlugin) {
      await prefSet(key, value);
      return;
    }
    await SecureStoragePlugin.set({ key, value });
  } catch {
    await prefSet(key, value);
  }
}

async function secureDel(key: string): Promise<void> {
  try {
    const mod = await import('@capacitor/community/secure-storage');
    const { SecureStoragePlugin } = mod;
    if (SecureStoragePlugin) await SecureStoragePlugin.remove({ key });
  } catch {
    // ignore
  }
}

export async function getModelEndpoint(): Promise<string> {
  if (isNative()) return (await prefGet(KEY_ENDPOINT)) ?? '';
  const raw = localStorage.getItem(KEY_ENDPOINT);
  if (!raw) return '';
  try {
    return deobfuscate(raw);
  } catch {
    return '';
  }
}

export async function setModelEndpoint(url: string): Promise<void> {
  if (isNative()) {
    await prefSet(KEY_ENDPOINT, url);
  } else {
    localStorage.setItem(KEY_ENDPOINT, obfuscate(url));
  }
}

export async function getApiKey(): Promise<string | null> {
  if (isNative()) return await secureGet(KEY_APIKEY);
  const raw = localStorage.getItem(KEY_APIKEY);
  if (!raw) return null;
  try {
    return deobfuscate(raw);
  } catch {
    return null;
  }
}

export async function setApiKey(key: string): Promise<void> {
  if (isNative()) {
    await secureSet(KEY_APIKEY, key);
  } else {
    localStorage.setItem(KEY_APIKEY, obfuscate(key));
  }
}

export async function clearApiKey(): Promise<void> {
  if (isNative()) {
    await secureDel(KEY_APIKEY);
  } else {
    localStorage.removeItem(KEY_APIKEY);
  }
}

export async function getImageGenEndpoint(): Promise<string> {
  if (isNative()) return (await prefGet(KEY_IMAGE_GEN_ENDPOINT)) ?? '';
  const raw = localStorage.getItem(KEY_IMAGE_GEN_ENDPOINT);
  if (!raw) return '';
  try {
    return deobfuscate(raw);
  } catch {
    return '';
  }
}

export async function setImageGenEndpoint(url: string): Promise<void> {
  if (isNative()) {
    await prefSet(KEY_IMAGE_GEN_ENDPOINT, url);
  } else {
    localStorage.setItem(KEY_IMAGE_GEN_ENDPOINT, obfuscate(url));
  }
}

export async function getCaptionEndpoint(): Promise<string> {
  if (isNative()) return (await prefGet(KEY_CAPTION_ENDPOINT)) ?? '';
  const raw = localStorage.getItem(KEY_CAPTION_ENDPOINT);
  if (!raw) return '';
  try {
    return deobfuscate(raw);
  } catch {
    return '';
  }
}

export async function setCaptionEndpoint(url: string): Promise<void> {
  if (isNative()) {
    await prefSet(KEY_CAPTION_ENDPOINT, url);
  } else {
    localStorage.setItem(KEY_CAPTION_ENDPOINT, obfuscate(url));
  }
}

export async function getSelectedModel(): Promise<string | null> {
  if (isNative()) return await prefGet(KEY_SELECTED_MODEL);
  const raw = localStorage.getItem(KEY_SELECTED_MODEL);
  return raw ?? null;
}

export async function setSelectedModel(modelId: string): Promise<void> {
  if (isNative()) {
    await prefSet(KEY_SELECTED_MODEL, modelId);
  } else {
    localStorage.setItem(KEY_SELECTED_MODEL, modelId);
  }
}
