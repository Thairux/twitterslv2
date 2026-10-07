import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { SocialStore } from '../lib/api/social-store';
import { useApi } from '../lib/api';
import { usePersonaNames } from '../lib/api/use-persona-names';
import { timeAgo } from '../components/PostCard';
import { buildProviderClient } from '../lib/api/providers';
import { buildLiveClient, getInferencePolicy, reportAmbientFailure } from '../lib/api/inference-policy';

interface GazettePageProps {
  socialStore: SocialStore;
}

export function GazettePage({ socialStore }: GazettePageProps) {
  const { store, secrets } = useApi();
  const [posts, setPosts] = useState<Array<{ id: string; authorId: string; body: string; createdAt: string }>>([]);
  const [digest, setDigest] = useState<string | null>(null);
  const [digestNote, setDigestNote] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const names = usePersonaNames(store);

  useEffect(() => {
    async function load() {
      try {
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const all = await socialStore.rankFeed('user');
        const recent = all.filter((p) => new Date(p.createdAt) >= new Date(oneDayAgo));
        setPosts(recent);
        // Model-written digest when live; honest list + note otherwise.
        try {
          const policy = await getInferencePolicy(store).catch(() => 'strict' as const);
          if (policy !== 'offline' && recent.length > 0) {
            const client = (await buildProviderClient(store, secrets, 'chat').catch(() => undefined)) ?? (await buildLiveClient());
            if (client) {
              const brief = recent.slice(0, 8).map((p) => `${p.authorId}: ${p.body.slice(0, 100)}`).join('\n');
              const text = await client.chat([
                { role: 'user', content: `Write a 3-sentence island gazette digest of these posts. Names as-is, no hashtags:\n${brief}` },
              ]);
              setDigest(text);
            }
          }
        } catch (err) {
          const state = reportAmbientFailure('gazette:digest', err, undefined);
          setDigestNote(`Digest unavailable (${state}) — showing the raw day list.`);
        }
      } catch {
        setPosts([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [socialStore, store, secrets]);

  return (
    <div className="content-area">
      <h2 className="page-title">While you were away</h2>
      {loading && <p className="meta">Loading…</p>}
      {digest && (
        <div className="post" data-testid="gazette-digest">
          <div style={{ fontWeight: 'bold' }}>Island digest</div>
          <div className="post-body" style={{ marginTop: 4 }}>{digest}</div>
        </div>
      )}
      {digestNote && <p className="meta">{digestNote}</p>}
      {posts.map((p) => (
        <div key={p.id} className="post">
          <div className="post-header">
            <span style={{ fontWeight: 'bold' }}>{p.authorId === 'user' ? 'You' : (names.get(p.authorId) ?? p.authorId)}</span>
            <Link to={`/post/${p.id}`} className="time" style={{ textDecoration: 'none' }}>{timeAgo(p.createdAt)}</Link>
          </div>
          <Link to={`/post/${p.id}`} className="post-body">{p.body}</Link>
        </div>
      ))}
      {posts.length === 0 && <p className="meta">Nothing new in the last 24 hours.</p>}
    </div>
  );
}
