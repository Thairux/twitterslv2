// API: ambient-status — last live/fallback diagnostic for ambient generation.
// In-memory only (no Capacitor/SQLite/fetch): records the most recent reason
// an ambient path fell back to offline pools so Settings can show WHY instead
// of failing silently. Importable from domain-adjacent modules without cycles.

export interface AmbientStatus {
  /** True once any ambient path has succeeded via the endpoint. */
  live: boolean;
  lastError: string | null;
  lastWhere: string | null;
  at: string | null;
}

let status: AmbientStatus = { live: false, lastError: null, lastWhere: null, at: null };

export function noteAmbientLive(): void {
  status = { ...status, live: true };
}

export function noteAmbientFallback(where: string, err: unknown): void {
  const lastError = err instanceof Error ? err.message : String(err);
  status = { ...status, lastError, lastWhere: where, at: new Date().toISOString() };
  try {
    console.warn(`[ambient:${where}] live call failed, using offline pool: ${lastError}`);
  } catch {
    // logging must never break ambient work
  }
}

export function getAmbientStatus(): AmbientStatus {
  return { ...status };
}

export function resetAmbientStatus(): void {
  status = { live: false, lastError: null, lastWhere: null, at: null };
}
