// API: persona-context — structured persona state for prompts (3.0.0 S3).
// Graph-led: relationships drive behavior weights, state drives voice.
// Reads relationships + persona_state + recent memories; all best-effort
// (empty maps when tables are fresh). No writes except through Store.

import type { Store } from './store';

export interface PersonaContext {
  /** Short blurb appended to generation prompts ('' when unknown). */
  blurb: string;
  /** True when the persona is inside its sleep window right now. */
  asleep: boolean;
}

const REL_VOICE: Record<string, string> = {
  FRIEND: 'you are close friends — warm, teasing, loyal',
  FOLLOWS: 'you follow them and look up to them a little',
  LIKES: 'you genuinely like them',
  DISLIKES: 'you find them mildly annoying — dry, never cruel',
  ADMIRE: 'you admire them openly',
  RIVAL: 'you are rivals — sharp debate energy, good sport, never mean',
  DEBATES: 'you love a good-natured argument with them',
  KNOWS: 'you know them in passing',
};

function hourNow(): number {
  return new Date().getHours();
}

function sleepWindow(state: Record<string, unknown>): { wake: number; sleep: number } | null {
  try {
    const raw = state.active_hours as { wake?: unknown; sleep?: unknown } | undefined;
    if (!raw || typeof raw.wake !== 'number' || typeof raw.sleep !== 'number') return null;
    return { wake: raw.wake, sleep: raw.sleep };
  } catch {
    return null;
  }
}

export function isAsleepAt(state: Record<string, unknown>, hour: number): boolean {
  const win = sleepWindow(state);
  if (!win) return false;
  if (win.sleep >= 24) return false;
  if (win.wake <= win.sleep) return hour < win.wake || hour >= win.sleep;
  // Overnight window (e.g. wake 22, sleep 6): awake [wake,24)+[0,sleep).
  return hour >= win.sleep && hour < win.wake;
}

/** Load contexts for a batch of personas (single pass, JS-joined). */
export async function loadPersonaContexts(
  store: Pick<Store, 'listRelationships' | 'getPersonaState' | 'query'>,
  personaIds: string[],
  opts: { nowHour?: number } = {},
): Promise<Map<string, PersonaContext>> {
  const out = new Map<string, PersonaContext>();
  for (const id of personaIds) out.set(id, { blurb: '', asleep: false });
  try {
    const [rels, memRows] = await Promise.all([
      store.listRelationships().catch(() => [] as Array<{ aId: string; bId: string; rel: string; weight: number }>),
      store.query<{ persona_id: string; fact: string }>('SELECT persona_id, fact FROM memories').catch(
        () => [] as Array<{ persona_id: string; fact: string }>,
      ),
    ]);
    const relByPair = new Map<string, { rel: string; weight: number }>();
    for (const r of rels) relByPair.set(`${r.aId}>${r.bId}`, { rel: r.rel, weight: r.weight });
    const memByPersona = new Map<string, string[]>();
    for (const m of memRows) {
      const list = memByPersona.get(m.persona_id) ?? [];
      if (list.length < 3) list.push(m.fact);
      memByPersona.set(m.persona_id, list);
    }
    const hour = opts.nowHour ?? hourNow();
    await Promise.all(
      personaIds.map(async (id) => {
        let state: Record<string, unknown> = {};
        try {
          state = await store.getPersonaState(id);
        } catch {
          state = {};
        }
        const parts: string[] = [];
        const mood = typeof state.mood === 'string' ? state.mood : '';
        const interests = Array.isArray(state.interests) ? state.interests.filter((x): x is string => typeof x === 'string').slice(0, 4) : [];
        const goals = Array.isArray(state.goals) ? state.goals.filter((x): x is string => typeof x === 'string').slice(0, 2) : [];
        if (mood) parts.push(`mood: ${mood}`);
        if (interests.length > 0) parts.push(`into: ${interests.join(', ')}`);
        if (goals.length > 0) parts.push(`wants: ${goals.join('; ')}`);
        const ties: string[] = [];
        for (const [key, v] of relByPair) {
          if (!key.startsWith(`${id}>`)) continue;
          const other = key.slice(id.length + 1);
          const voice = REL_VOICE[v.rel] ?? `connected (${v.rel})`;
          ties.push(`${other} (${voice})`);
          if (ties.length >= 3) break;
        }
        if (ties.length > 0) parts.push(`ties: ${ties.join('; ')}`);
        const mems = memByPersona.get(id) ?? [];
        if (mems.length > 0) parts.push(`remembers: ${mems.join('; ')}`);
        out.set(id, {
          blurb: parts.length > 0 ? ` [${parts.join(' | ')}]` : '',
          asleep: isAsleepAt(state, hour),
        });
      }),
    );
  } catch {
    // contexts stay empty; generation proceeds stateless
  }
  return out;
}
