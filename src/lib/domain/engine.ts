// Domain: engine types and offline pools (Sprint 3 — port v1 engine behavior).

export interface GenerationAttempt {
  personaId: string;
  prompt: string;
  model: string;
}

export interface GenResult {
  text: string;
  via: string;
  attempts: number;
}

export interface OfflinePool {
  friendReplies: string[];
  crowdReplies: string[];
}

export const OFFLINE_FRIEND_REPLIES: string[] = [
  'hey, you doing okay?',
  'sending good vibes your way',
  'hope your day is going well',
];

export const OFFLINE_CROWD_REPLIES: string[] = [
  'interesting thought',
  'nice post',
  'agree with this',
  'cool vibe',
  'respect',
  'haha nice',
];
