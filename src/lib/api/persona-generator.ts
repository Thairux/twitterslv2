// API: persona-generator — new persona synthesis (Sprint 7, consent-aware).
// Generates a persona description via the model endpoint, with offline fallback.

import type { ModelClient } from './model-client';
import type { Persona, PersonaRole } from '../domain/persona';

export interface GeneratedPersona {
  persona: Partial<Persona>;
  via: 'glimmer' | 'offline';
}

export async function generatePersona(
  modelClient: ModelClient,
  theme: string,
  existingRoles: string[] = [],
): Promise<GeneratedPersona> {
  const bannedRoles = ['friend', ...existingRoles];
  const prompt = `Generate a unique social persona for a microblogging simulation. Theme: ${theme}.
Do NOT use these roles: ${bannedRoles.join(', ')}.
Return ONLY a JSON object with these exact keys: { "displayName": string, "handle": string, "role": string, "vibe": string, "bio": string, "avatarSeed": string }.
Keep displayName and handle under 30 chars. Role should be one of: fan, peer, meme, troll, news.`;

  try {
    const text = await modelClient.chat([
      { role: 'system', content: 'You are a creative persona generator. Output only valid JSON, no markdown, no commentary.' },
      { role: 'user', content: prompt },
    ]);
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Model response did not contain JSON');
    }
    const parsed = JSON.parse(jsonMatch[0]) as {
      displayName: string;
      handle: string;
      role: string;
      vibe: string;
      bio: string;
      avatarSeed: string;
    };

    const validRoles = ['fan', 'peer', 'meme', 'troll', 'news'];
    const role = (validRoles.includes(parsed.role) ? parsed.role : 'peer') as PersonaRole;

    return {
      persona: {
        displayName: parsed.displayName || 'Anon',
        handle: parsed.handle || `@anon-${Date.now()}`,
        role,
        vibe: parsed.vibe || '',
        bio: parsed.bio || '',
        avatarSeed: parsed.avatarSeed || `seed-${Date.now()}`,
      },
      via: 'glimmer',
    };
  } catch {
    return {
      persona: {
        displayName: `Anon ${Math.floor(Math.random() * 1000)}`,
        handle: `@anon-${Math.floor(Math.random() * 1000)}`,
        role: 'peer',
        vibe: 'mysterious',
        bio: 'generated offline',
        avatarSeed: `seed-${Date.now()}`,
      },
      via: 'offline',
    };
  }
}
