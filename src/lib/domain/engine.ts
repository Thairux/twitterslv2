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
  'hey, you doing okay? been thinking about you',
  'sending good vibes your way across the lagoon',
  'hope your day is going well — tell me everything',
  'that made me smile, thank you for posting this',
  'i am always on your side, you know that right?',
  'ooh tell me more, i am listening',
  'proud of you, seriously',
  'this reminded me of that sunset we watched',
  'you always know exactly what to say',
  'saving this one to my favorite-shell collection',
  'come sit by the water and tell me the whole story',
  'your posts are the best part of my tide cycle',
];

export const OFFLINE_CROWD_REPLIES: string[] = [
  'interesting thought, never looked at it that way',
  'nice post, this belongs on the community board',
  'agree with this, the whole dock is talking about it',
  'cool vibe, very low-tide energy',
  'respect, dropping anchor on this take',
  'haha nice, spat out my coconut water',
  'this is going straight into the group chat',
  'big harbor energy in this post',
  'as a longtime lighthouse keeper: correct',
  'the pelicans have been saying this for weeks',
  'printing this and nailing it to the pier',
  'strong currents in these replies, love to see it',
  'my kind of island discourse',
  'say it louder for the boats in the back',
  'this post smells like rain and good decisions',
  'underrated take, boosting it up the mast',
  'the tide brought this post to me and i am grateful',
  'bookmarking this next to my treasure map',
  'finally someone said the quiet part out loud',
  'ten out of ten, no notes, just seashells',
];

/** Standalone persona posts (never replies): slice-of-island-life openers. */
export const OFFLINE_POST_STARTERS: string[] = [
  'sunrise over the lagoon today looked unreal, wish you all saw it',
  'low tide revealed a whole new sandbar near the east dock',
  'tried a new coconut recipe, ten out of ten would sip again',
  'the pelicans formed a perfect V this morning, taking it as a good omen',
  'found a message in a bottle, it just said: post more',
  'fishing boats came in early, the harbor smells like salt and victory',
  'who else heard drums from the far islet last night?',
  'traded three shells for the shiniest pebble, best deal of my life',
  'the lighthouse keeper waved at me today, feeling blessed',
  'new rule: every sunset gets a moment of silence and a cheer',
  'caught the biggest wave of the season, my arms are noodles now',
  'the night market has mango sticky rice again, this is not a drill',
  'seagull stole my sandwich and honestly? respect the hustle',
  'mapped three new tide pools, naming one after each of you',
  'the old dock creaks a new song every evening, still learning the words',
  'storm clouds gathering past the reef, batten down the group chat',
  'just watched dolphins race the ferry, dolphins won, obviously',
  'my hammock spot got claimed by a crab, negotiations ongoing',
  'full moon tonight, the whole lagoon turns to silver',
  'started a floating book club, first book got soggy, trying again',
  'the coral looks extra bright this week, the reef is happy',
  'someone left fresh pineapple at the crossroads stand, island magic',
  'morning swim hit different today, water was glass',
  'counted eleven sails on the horizon, busy day for the harbor',
];
