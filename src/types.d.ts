// Capacitor optional plugin type declarations (web fallback compiles without native deps).
declare module '@capacitor/community/secure-storage' {
  export const SecureStoragePlugin: {
    get: (opts: { key: string }) => Promise<{ value: string | null }>;
    set: (opts: { key: string; value: string }) => Promise<void>;
    remove: (opts: { key: string }) => Promise<void>;
  } | null;
}

declare module '@capacitor/background-task' {
  export const BackgroundTask: any;
}
