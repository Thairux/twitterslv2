export interface FilesAdapter {
  saveBlob(path: string, bytes: Uint8Array): Promise<void>;
  loadBlob(path: string): Promise<Uint8Array | null>;
  deleteBlob(path: string): Promise<void>;
  listBlobs(prefix?: string): Promise<string[]>;
  appendBlob(path: string, bytes: Uint8Array): Promise<void>;
}

const memoryStore = new Map<string, Uint8Array>();

function isNative(): boolean {
  try {
    return (globalThis as any).Capacitor?.isNativePlatform?.() ?? false;
  } catch {
    return false;
  }
}

async function webLoadAll(): Promise<Map<string, Uint8Array>> {
  const dbs = await new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open('tsl-files', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('blobs');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  try {
    const all = new Map<string, Uint8Array>();
    await new Promise<void>((resolve, reject) => {
      const tx = dbs.transaction('blobs', 'readonly');
      const storeReq = tx.objectStore('blobs').getAllKeys();
      storeReq.onsuccess = async () => {
        const keys = storeReq.result as string[];
        try {
          const results = await Promise.all(
            keys.map((key) =>
              new Promise<any>((res, rej) => {
                const req2 = tx.objectStore('blobs').get(key);
                req2.onsuccess = () => res(req2.result);
                req2.onerror = () => rej(req2.error);
              }),
            ),
          );
          results.forEach((r, i) => {
            if (r instanceof Uint8Array) all.set(keys[i], r);
          });
          resolve();
        } catch (err) {
          reject(err);
        }
      };
      storeReq.onerror = () => reject(storeReq.error);
    });
    return all;
  } finally {
    dbs.close();
  }
}

async function webSave(key: string, value: Uint8Array): Promise<void> {
  const dbs = await new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open('tsl-files', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('blobs');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = dbs.transaction('blobs', 'readwrite');
      const req = tx.objectStore('blobs').put(value, key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
    memoryStore.set(key, value);
    const all = await ensureWebStore();
    all.set(key, value);
  } finally {
    dbs.close();
  }
}

async function webDelete(key: string): Promise<void> {
  const dbs = await new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open('tsl-files', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('blobs');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = dbs.transaction('blobs', 'readwrite');
      const req = tx.objectStore('blobs').delete(key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
    memoryStore.delete(key);
    const all = await ensureWebStore();
    all.delete(key);
  } finally {
    dbs.close();
  }
}

async function webList(prefix?: string): Promise<string[]> {
  const all = await webLoadAll();
  const keys = Array.from(all.keys());
  if (prefix) return keys.filter((k) => k.startsWith(prefix));
  return keys;
}

let webStorePromise: Promise<Map<string, Uint8Array>> | null = null;

async function ensureWebStore(): Promise<Map<string, Uint8Array>> {
  if (!webStorePromise) {
    webStorePromise = webLoadAll().then((store) => store).catch((err) => {
      webStorePromise = null;
      throw err;
    });
  }
  return webStorePromise;
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function fromBase64(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function fsWrite(path: string, data: Uint8Array): Promise<void> {
  const { Filesystem } = await import('@capacitor/filesystem');
  // NOTE: never pass `encoding` for binary data — the native plugin only
  // accepts text charsets (utf8/utf16/ascii) and rejects anything else with
  // "Unsupported encoding provided". Omitted encoding = base64 round-trip.
  await Filesystem.writeFile({
    path,
    data: toBase64(data),
    directory: (await import('@capacitor/filesystem')).FilesystemDirectory.Data,
    recursive: true,
  } as any);
}

async function fsAppend(path: string, data: Uint8Array): Promise<void> {
  const { Filesystem } = await import('@capacitor/filesystem');
  await Filesystem.appendFile({
    path,
    data: toBase64(data),
    directory: (await import('@capacitor/filesystem')).FilesystemDirectory.Data,
    recursive: true,
  } as any);
}

async function fsRead(path: string): Promise<Uint8Array> {
  const { Filesystem } = await import('@capacitor/filesystem');
  const { data } = await Filesystem.readFile({
    path,
    directory: (await import('@capacitor/filesystem')).FilesystemDirectory.Data,
  } as any);
  if (typeof data === 'string') {
    return fromBase64(data);
  }
  throw new Error(`Empty data for ${path}`);
}

async function fsDelete(path: string): Promise<void> {
  const { Filesystem } = await import('@capacitor/filesystem');
  await Filesystem.deleteFile({ path, directory: (await import('@capacitor/filesystem')).FilesystemDirectory.Data } as any);
}

async function fsList(prefix?: string): Promise<string[]> {
  const { Filesystem } = await import('@capacitor/filesystem');
  const result = await Filesystem.readdir({
    path: '',
    directory: (await import('@capacitor/filesystem')).FilesystemDirectory.Data,
  } as any);
  const files = (result.files ?? []).map((f: { name: string }) => f.name);
  if (prefix) return files.filter((n) => n.startsWith(prefix));
  return files;
}

const impl: FilesAdapter = {
  async saveBlob(path: string, bytes: Uint8Array): Promise<void> {
    if (isNative()) {
      await fsWrite(path, bytes);
    } else {
      await webSave(path, bytes);
    }
  },
  async loadBlob(path: string): Promise<Uint8Array | null> {
    if (isNative()) {
      return fsRead(path);
    }
    const all = await ensureWebStore();
    return all.get(path) ?? null;
  },
  async deleteBlob(path: string): Promise<void> {
    if (isNative()) {
      await fsDelete(path);
    } else {
      await webDelete(path);
    }
  },
  async listBlobs(prefix?: string): Promise<string[]> {
    if (isNative()) {
      return fsList(prefix);
    }
    return webList(prefix);
  },
  async appendBlob(path: string, bytes: Uint8Array): Promise<void> {
    if (isNative()) {
      // Native append is O(1) per chunk via the plugin — never read-modify-
      // rewrite the whole file (a 500MB model would mean 500 full rewrites).
      await fsAppend(path, bytes);
    } else {
      const existing = memoryStore.get(path) ?? new Uint8Array();
      const combined = new Uint8Array(existing.length + bytes.length);
      combined.set(existing, 0);
      combined.set(bytes, existing.length);
      memoryStore.set(path, combined);
      await webSave(path, combined);
    }
  },
};

export default impl;
