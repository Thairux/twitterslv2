// Native adapter: notifications (Sprint 2 stub, full impl Sprint 6).
// - Native: @capacitor/local-notifications (channels + quiet hours enforced in api layer).
// - Web: console.info stub (no-op, banner handled in app).

interface NotificationChannels {
  chat: boolean;
  mentions: boolean;
  quietHours: { start: number; end: number } | null;
}

let channels: NotificationChannels = { chat: true, mentions: true, quietHours: null };

function isNative(): boolean {
  try {
    return (globalThis as any).Capacitor?.isNativePlatform?.() ?? false;
  } catch {
    return false;
  }
}

async function nativeScheduleFriendPing(personaId: string, hour: number): Promise<void> {
  const { LocalNotifications } = await import('@capacitor/local-notifications');
  const id = hashId(personaId);
  await LocalNotifications.schedule({
    notifications: [
      {
        id,
        title: 'TwitterSL',
        body: `Your friend on the island is pinging you!`,
        schedule: { hour, minute: 0, repeating: true },
        sound: 'default',
      },
    ],
  } as any);
}

async function nativeCancelAll(): Promise<void> {
  const { LocalNotifications } = await import('@capacitor/local-notifications');
  await LocalNotifications.cancel({ notifications: [] } as any);
}

function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export async function scheduleFriendPing(personaId: string, hour: number): Promise<void> {
  if (isNative()) {
    await nativeScheduleFriendPing(personaId, hour);
  } else {
    console.info(`[notifications] scheduleFriendPing(personaId=${personaId}, hour=${hour})`);
  }
}

export async function cancelAll(): Promise<void> {
  if (isNative()) {
    await nativeCancelAll();
  } else {
    console.info('[notifications] cancelAll()');
  }
}

export function getChannels(): NotificationChannels {
  return { ...channels };
}

export function setChannels(next: Partial<NotificationChannels>): void {
  channels = { ...channels, ...next };
}
