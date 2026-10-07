// Components: StoriesStrip — 24h persona moments (3.0.0 S4).
// Avatar rings open a viewer; replies land in the author's DM thread;
// "+" opens the story composer. Views tracked honestly (user only).

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Store } from '../lib/api/store';
import { PersonaAvatar } from './PersonaAvatar';

export interface StoryItem {
  id: string;
  authorId: string;
  displayName: string;
  avatarSeed: string;
  body: string;
  imagePath?: string;
  createdAt: string;
  seen: boolean;
}

export function StoriesStrip({ store, stories, onChanged }: { store: Store; stories: StoryItem[]; onChanged: (storyId: string) => void }) {
  const navigate = useNavigate();
  const [viewing, setViewing] = useState<StoryItem | null>(null);
  const [reply, setReply] = useState('');

  async function openStory(s: StoryItem) {
    setViewing(s);
    setReply('');
    try {
      await store.markStoryViewed(s.id, 'user');
      onChanged(s.id);
    } catch {
      // ignore
    }
  }

  async function sendReply() {
    const text = reply.trim();
    if (!text || !viewing || viewing.authorId === 'user') return;
    try {
      await store.createDm({
        id: `dm_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        threadId: `user:${viewing.authorId}`,
        senderId: 'user',
        body: text,
        createdAt: new Date().toISOString(),
        origin: 'glimmer',
      });
      setViewing(null);
      navigate(`/messages/${encodeURIComponent(viewing.authorId)}`);
    } catch {
      // ignore
    }
  }

  if (stories.length === 0) return null;

  return (
    <div data-testid="stories-strip">
      <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 8, marginBottom: 8 }}>
        <div style={{ textAlign: 'center', flexShrink: 0, cursor: 'pointer' }} onClick={() => navigate('/compose?story=1')} data-testid="story-add">
          <div
            style={{
              width: 52, height: 52, borderRadius: '50%', border: '2px dashed var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 'bold',
            }}
          >
            +
          </div>
          <div className="meta" style={{ fontSize: 10 }}>Moment</div>
        </div>
        {stories.map((s) => (
          <div key={s.id} style={{ textAlign: 'center', flexShrink: 0, cursor: 'pointer' }} onClick={() => openStory(s)} data-testid={`story-${s.id}`}>
            <div style={{ borderRadius: '50%', padding: 2, border: s.seen ? '2px solid var(--border)' : '2px solid var(--accent)' }}>
              <PersonaAvatar seed={s.avatarSeed} displayName={s.displayName} size={48} />
            </div>
            <div className="meta" style={{ fontSize: 10, maxWidth: 56, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {s.authorId === 'user' ? 'You' : s.displayName}
            </div>
          </div>
        ))}
      </div>
      {viewing && (
        <div className="post" data-testid="story-viewer">
          <div style={{ fontWeight: 'bold' }}>{viewing.authorId === 'user' ? 'You' : viewing.displayName}</div>
          <div className="post-body" style={{ margin: '8px 0' }}>{viewing.body}</div>
          {viewing.authorId !== 'user' && (
            <div className="field-row">
              <input
                type="text"
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') sendReply(); }}
                placeholder="Reply in DM…"
                className="input-field"
                data-testid="story-reply-input"
              />
              <button className="btn" onClick={sendReply} disabled={!reply.trim()} data-testid="story-reply-send">
                Send
              </button>
            </div>
          )}
          <button className="btn" style={{ marginTop: 8, fontSize: 10, padding: '2px 8px' }} onClick={() => setViewing(null)}>
            Close
          </button>
        </div>
      )}
    </div>
  );
}
