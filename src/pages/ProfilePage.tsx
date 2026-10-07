// Pages (Sprint 5). Profile — spec alldemos/ocdemo/profile.html.
// React only — data flows through src/lib/api/ use-cases.

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Post } from '../lib/domain/post';
import type { UserProfile, Bookmark } from '../lib/api/store';
import { useApi } from '../lib/api';
import { useBlobUrl } from '../lib/api/use-blob-url';
import { PostCard } from '../components/PostCard';
import { usePolls } from '../lib/api/use-polls';
import { usePollVotes } from '../lib/api/use-poll-votes';

export function ProfilePage() {
  const { store, nativeFiles } = useApi();  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile>({ displayName: 'You', handle: '@you', bio: '' });
  const avatarUrl = useBlobUrl(nativeFiles, profile.avatarPath || undefined);
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [bio, setBio] = useState(profile.bio);
  const [tab, setTab] = useState<'posts' | 'bookmarks' | 'following' | 'followers' | 'media'>('posts');
  const [posts, setPosts] = useState<Post[]>([]);
  const [bookmarkPosts, setBookmarkPosts] = useState<Post[]>([]);
  const [bookmarkIds, setBookmarkIds] = useState<Record<string, string>>({});
  const [folders, setFolders] = useState<Array<{ id: string; name: string }>>([]);
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [folderOf, setFolderOf] = useState<Record<string, string>>({});
  const [newFolder, setNewFolder] = useState('');
  const [followingCount, setFollowingCount] = useState(0);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingList, setFollowingList] = useState<Array<{ id: string; handle: string; displayName: string; bio: string }>>([]);
  const [followerList, setFollowerList] = useState<Array<{ id: string; handle: string; displayName: string; bio: string }>>([]);

  async function refreshRelations() {
    try {
      const [followingIds, followerIds, all] = await Promise.all([
        store.listFollowing(),
        store.listFollowers(),
        store.listPersonas(),
      ]);
      setFollowingCount(followingIds.length);
      setFollowerCount(followerIds.length);
      const byId = new Map(all.map((p) => [p.id, p]));
      const detail = (id: string) => {
        const p = byId.get(id);
        return p
          ? { id: p.id, handle: p.handle, displayName: p.displayName, bio: p.bio }
          : { id, handle: id, displayName: id, bio: '' };
      };
      setFollowingList(followingIds.map(detail));
      setFollowerList(followerIds.map(detail));
    } catch (err) {
      console.error('Failed to load relations:', err);
    }
  }

  useEffect(() => {
    async function load() {
      try {
        const p = await store.getUserProfile();
        setProfile(p);
        setDisplayName(p.displayName);
        setBio(p.bio);
        const psts = await store.listPosts('user');
        setPosts(psts);
        const bm = await store.listBookmarks('user');
        const posts = await Promise.all(bm.map((b: Bookmark) => store.getPost(b.postId)));
        setBookmarkPosts(posts.filter((p): p is Post => p != null));
        setBookmarkIds(Object.fromEntries(bm.map((b) => [b.postId, b.id])));
        try {
          setFolders(await store.listBookmarkFolders());
          const mapping: Record<string, string> = {};
          for (const b of bm) {
            const f = await store.getBookmarkFolder(b.id).catch(() => null);
            if (f) mapping[b.postId] = f;
          }
          setFolderOf(mapping);
        } catch {
          // ignore
        }
        await refreshRelations();
      } catch (err) {
        console.error('Failed to load profile:', err);
      }
    }
    load();
  }, [store]);

  async function handleUnfollow(personaId: string) {
    try {
      await store.unfollow(personaId);
      await refreshRelations();
    } catch (err) {
      console.error('Unfollow failed:', err);
    }
  }

  async function handleFollowBack(personaId: string) {
    try {
      await store.follow(personaId);
      await refreshRelations();
    } catch (err) {
      console.error('Follow failed:', err);
    }
  }

  async function handleRemoveFollower(personaId: string) {
    try {
      await store.removeFollower(personaId);
      await refreshRelations();
    } catch (err) {
      console.error('Remove follower failed:', err);
    }
  }

  const handleSave = async () => {
    try {
      await store.updateUserProfile({
        displayName: displayName.slice(0, 24),
        handle: profile.handle,
        bio: bio.slice(0, 160),
        avatarPath: profile.avatarPath,
      });
      setProfile({
        displayName: displayName.slice(0, 24),
        handle: profile.handle,
        bio: bio.slice(0, 160),
        avatarPath: profile.avatarPath,
      });
      setEditing(false);
    } catch (err) {
      console.error('Failed to save profile:', err);
    }
  };

  const handleEdit = (postId: string) => {
    navigate(`/compose?edit=${encodeURIComponent(postId)}`);
  };

  const handleQuote = (postId: string) => {
    navigate(`/compose?quote=${encodeURIComponent(postId)}`);
  };

  const postPolls = usePolls(store, posts.map((p) => p.id));
  const bookmarkPolls = usePolls(store, bookmarkPosts.map((p) => p.id));
  const postVotes = usePollVotes(store, posts.map((p) => p.id));
  const bookmarkVotes = usePollVotes(store, bookmarkPosts.map((p) => p.id));

  return (
    <div className="content-area">
      <div style={{ position: 'relative', width: 80, height: 80, marginBottom: 16 }}>
        {avatarUrl ? (
          <img src={avatarUrl} alt="avatar" style={{ width: 80, height: 80, borderRadius: '50%', border: 'var(--border-width) solid var(--border)', objectFit: 'cover', display: 'block' }} data-testid="profile-avatar-img" />
        ) : (
          <div className="avatar" style={{ width: 80, height: 80, background: 'var(--accent)', color: 'var(--bg)', fontSize: 32 }}>
            {profile.displayName?.[0] ?? '?'}
          </div>
        )}
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="avatar"
            style={{ position: 'absolute', top: -5, right: -10, width: 28, height: 28, background: 'var(--card)', color: 'var(--text)', fontSize: 12 }}
          >
            Edit
          </button>
        )}
      </div>

      {editing ? (
        <div style={{ marginBottom: 16 }}>
          <label className="meta">Profile picture</label>
          <div className="field-row" style={{ marginBottom: 8 }}>
            <input
              type="file"
              accept="image/*"
              className="input-field"
              data-testid="avatar-input"
              onChange={async (e) => {
                try {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const bytes = new Uint8Array(await file.arrayBuffer());
                  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '');
                  const path = `avatars/${Date.now()}-${safeName}`;
                  await nativeFiles.saveBlob(path, bytes);
                  setProfile((prev) => ({ ...prev, avatarPath: path }));
                } catch (err) {
                  console.error('Avatar upload failed:', err);
                }
              }}
            />
          </div>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={24}
            className="input-field"
            style={{ width: '100%', marginBottom: 8 }}
          />
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={160}
            rows={3}
            className="input-field"
            style={{ width: '100%', marginBottom: 8, resize: 'vertical' }}
          />
          <div className="field-row">
            <button className="btn" onClick={handleSave}>Save</button>
            <button className="btn" onClick={() => { setEditing(false); setDisplayName(profile.displayName); setBio(profile.bio); }}>Cancel</button>
          </div>
        </div>
      ) : (
        <>
          <h2 className="page-title" style={{ marginBottom: 4 }}>{profile.displayName}</h2>
          <p className="meta">{profile.handle}</p>
          <p>{profile.bio}</p>
        </>
      )}

      <div
        className="post"
        style={{ display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer', background: '#000', marginBottom: 12 }}
        onClick={() => navigate('/tslp')}
        data-testid="profile-tslp-entry"
      >
        <div style={{ background: '#7b2ff7', border: '2px solid #000', boxShadow: '3px 3px 0 #f5d90a', padding: '2px 8px', fontWeight: 'bold', color: '#fff', fontSize: 13 }}>
          #tslp
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 'bold', fontSize: 13 }}>twitter sl personas — island admin</div>
          <div className="meta">Every persona's phone view, island DMs, dashboards, friend creator →</div>
        </div>
      </div>

      <div className="status-bar">
        <span><b>{posts.length}</b> Posts</span>
        <button className="btn" style={{ fontSize: 10, padding: '2px 8px' }} onClick={() => setTab('following')}>
          <b>{followingCount}</b> Following
        </button>
        <button className="btn" style={{ fontSize: 10, padding: '2px 8px' }} onClick={() => setTab('followers')}>
          <b>{followerCount}</b> Followers
        </button>
      </div>

      <div className="feed-tabs">
        {(['posts', 'bookmarks', 'following', 'followers', 'media'] as const).map((t) => (
          <button
            key={t}
            className={tab === t ? 'active' : ''}
            onClick={() => setTab(t)}
            data-testid={`profile-tab-${t}`}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'posts' && posts.map((post) => (
        <PostCard key={post.id} post={post} poll={postPolls.get(post.id)} onEdit={handleEdit} onQuote={handleQuote} onVote={async (optionId) => { try { await store.votePoll(optionId); } catch (err) { console.error('Vote failed:', err); } }} voted={postVotes[post.id]} />
      ))}

      {tab === 'media' && (
        <div className="tab-pane active-pane" data-testid="profile-media">
          {posts.filter((p) => p.imagePath || p.imageUrl).length === 0 && (
            <p className="meta">No media posts yet.</p>
          )}
          {posts.filter((p) => p.imagePath || p.imageUrl).map((post) => (
            <PostCard key={post.id} post={post} poll={postPolls.get(post.id)} onEdit={handleEdit} onQuote={handleQuote} onVote={async (optionId) => { try { await store.votePoll(optionId); } catch (err) { console.error('Vote failed:', err); } }} voted={postVotes[post.id]} />
          ))}
        </div>
      )}

      {tab === 'bookmarks' && (
        <div style={{ marginBottom: 8 }}>
          <div className="field-row" style={{ marginBottom: 4 }}>
            <button className={activeFolder === null ? 'active' : ''} onClick={() => setActiveFolder(null)} data-testid="folder-all">All</button>
            {folders.map((f) => (
              <button key={f.id} className={activeFolder === f.id ? 'active' : ''} onClick={() => setActiveFolder(f.id)} data-testid={`folder-${f.id}`}>
                {f.name}
              </button>
            ))}
          </div>
          <div className="field-row">
            <input
              type="text"
              value={newFolder}
              onChange={(e) => setNewFolder(e.target.value)}
              placeholder="New folder…"
              maxLength={40}
              className="input-field"
              data-testid="folder-input"
            />
            <button
              className="btn"
              disabled={!newFolder.trim()}
              onClick={async () => {
                try {
                  const id = await store.createBookmarkFolder(newFolder.trim());
                  setFolders((prev) => [...prev, { id, name: newFolder.trim() }]);
                  setNewFolder('');
                } catch (err) {
                  console.error('Folder create failed:', err);
                }
              }}
            >
              Add
            </button>
          </div>
        </div>
      )}
      {tab === 'bookmarks' && bookmarkPosts.filter((post) => !activeFolder || folderOf[post.id] === activeFolder).map((post) => (
        <div key={post.id}>
          <PostCard post={post} poll={bookmarkPolls.get(post.id)} onQuote={handleQuote} onVote={async (optionId) => { try { await store.votePoll(optionId); } catch (err) { console.error('Vote failed:', err); } }} voted={bookmarkVotes[post.id]} />
          {folders.length > 0 && (
            <select
              value={folderOf[post.id] ?? ''}
              onChange={async (e) => {
                try {
                  const bid = bookmarkIds[post.id];
                  if (!bid) return;
                  await store.setBookmarkFolder(bid, e.target.value || null);
                  setFolderOf((prev) => {
                    const next = { ...prev };
                    if (e.target.value) next[post.id] = e.target.value;
                    else delete next[post.id];
                    return next;
                  });
                } catch (err) {
                  console.error('Folder assign failed:', err);
                }
              }}
              className="input-field"
              style={{ fontSize: 11, marginTop: 2 }}
              aria-label="Bookmark folder"
              data-testid={`folder-select-${post.id}`}
            >
              <option value="">No folder</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          )}
        </div>
      ))}

      {tab === 'posts' && posts.length === 0 && (
        <p className="meta">No posts yet.</p>
      )}
      {tab === 'bookmarks' && bookmarkPosts.length === 0 && (
        <p className="meta">No bookmarks yet.</p>
      )}

      {tab === 'following' && (
        <div className="tab-pane active-pane" data-testid="following-list">
          {followingList.length === 0 && <p className="meta">You follow no one yet — find islanders in Search.</p>}
          {followingList.map((p) => (
            <div key={p.id} className="post" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <div style={{ minWidth: 0, cursor: 'pointer' }} onClick={() => navigate(`/messages/${encodeURIComponent(p.id)}`)}>
                <div style={{ fontWeight: 'bold' }}>{p.displayName}</div>
                <div className="meta">@{p.handle}</div>
              </div>
              <div className="field-row" style={{ flexShrink: 0, marginTop: 0 }}>
                <button className="btn" style={{ fontSize: 10, padding: '2px 8px' }} onClick={() => navigate(`/messages/${encodeURIComponent(p.id)}`)}>Message</button>
                <button className="btn" style={{ fontSize: 10, padding: '2px 8px' }} onClick={() => handleUnfollow(p.id)} data-testid={`unfollow-btn-${p.id}`}>Unfollow</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'followers' && (
        <div className="tab-pane active-pane" data-testid="followers-list">
          {followerList.length === 0 && <p className="meta">No followers yet.</p>}
          {followerList.map((p) => (
            <div key={p.id} className="post" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <div style={{ minWidth: 0, cursor: 'pointer' }} onClick={() => navigate(`/messages/${encodeURIComponent(p.id)}`)}>
                <div style={{ fontWeight: 'bold' }}>{p.displayName}</div>
                <div className="meta">@{p.handle}</div>
              </div>
              <div className="field-row" style={{ flexShrink: 0, marginTop: 0 }}>
                <button className="btn" style={{ fontSize: 10, padding: '2px 8px' }} onClick={() => navigate(`/messages/${encodeURIComponent(p.id)}`)}>Message</button>
                <button className="btn" style={{ fontSize: 10, padding: '2px 8px' }} onClick={() => handleFollowBack(p.id)}>Follow back</button>
                <button className="btn" style={{ fontSize: 10, padding: '2px 8px' }} onClick={() => handleRemoveFollower(p.id)} data-testid={`remove-follower-${p.id}`}>Remove</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
