// Pages (Sprint 5). Profile — spec alldemos/ocdemo/profile.html.
// React only — data flows through src/lib/api/ use-cases.

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Post } from '../lib/domain/post';
import type { UserProfile, Bookmark } from '../lib/api/store';
import { useApi } from '../lib/api';
import { PostCard } from '../components/PostCard';
import { usePolls } from '../lib/api/use-polls';
import { usePollVotes } from '../lib/api/use-poll-votes';

export function ProfilePage() {
  const { store } = useApi();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile>({ displayName: 'You', handle: '@you', bio: '' });
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [bio, setBio] = useState(profile.bio);
  const [tab, setTab] = useState<'posts' | 'bookmarks'>('posts');
  const [posts, setPosts] = useState<Post[]>([]);
  const [bookmarkPosts, setBookmarkPosts] = useState<Post[]>([]);
  const [followingCount, setFollowingCount] = useState(0);

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
        const following = await store.listFollowing();
        setFollowingCount(following.length);
      } catch (err) {
        console.error('Failed to load profile:', err);
      }
    }
    load();
  }, [store]);

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
        <div className="avatar" style={{ width: 80, height: 80, background: 'var(--accent)', color: 'var(--bg)', fontSize: 32 }}>
          {profile.displayName?.[0] ?? '?'}
        </div>
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

      <div className="status-bar">
        <span><b>{posts.length}</b> Posts</span>
        <span><b>{followingCount}</b> Following</span>
        <span><b>0</b> Followers</span>
      </div>

      <div className="feed-tabs">
        <button
          className={tab === 'posts' ? 'active' : ''}
          onClick={() => setTab('posts')}
        >
          Posts
        </button>
        <button
          className={tab === 'bookmarks' ? 'active' : ''}
          onClick={() => setTab('bookmarks')}
        >
          Bookmarks
        </button>
      </div>

      {tab === 'posts' && posts.map((post) => (
        <PostCard key={post.id} post={post} poll={postPolls.get(post.id)} onEdit={handleEdit} onQuote={handleQuote} onVote={async (optionId) => { try { await store.votePoll(optionId); } catch (err) { console.error('Vote failed:', err); } }} voted={postVotes[post.id]} />
      ))}

      {tab === 'bookmarks' && bookmarkPosts.map((post) => (
        <PostCard key={post.id} post={post} poll={bookmarkPolls.get(post.id)} onQuote={handleQuote} onVote={async (optionId) => { try { await store.votePoll(optionId); } catch (err) { console.error('Vote failed:', err); } }} voted={bookmarkVotes[post.id]} />
      ))}

      {tab === 'posts' && posts.length === 0 && (
        <p className="meta">No posts yet.</p>
      )}
      {tab === 'bookmarks' && bookmarkPosts.length === 0 && (
        <p className="meta">No bookmarks yet.</p>
      )}
    </div>
  );
}
