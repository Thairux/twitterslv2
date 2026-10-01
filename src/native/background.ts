// Native adapter: background tasks (Sprint 2 stub, full impl Sprint 6).
// - Native: request permission + register background handler (stub).
// - Web: no-op (Sprint 6 spike: foreground tick on resume + scheduled notifs).

function isNative(): boolean {
  try {
    return (globalThis as any).Capacitor?.isNativePlatform?.() ?? false;
  } catch {
    return false;
  }
}

let registered = false;

async function nativeRegister(): Promise<void> {
  // @ts-ignore - optional plugin
  const { BackgroundTask } = await import('@capacitor/background-task');
  // Sprint 6 spike: actual background-fetch wiring deferred.
  console.info('[background] BackgroundTask plugin available; wiring deferred to Sprint 6');
  registered = true;
}

export async function registerBackgroundTask(): Promise<void> {
  if (!isNative()) {
    console.info('[background] registerBackgroundTask() — web no-op (Sprint 6 spike)');
    registered = true;
    return;
  }
  await nativeRegister();
}

export async function unregister(): Promise<void> {
  if (isNative()) {
    // TODO(S6): cancel native task identifier when plugin wiring lands.
    console.info('[background] unregister() — native stub');
  }
  registered = false;
}

export function isBackgroundRegistered(): boolean {
  return registered;
}
