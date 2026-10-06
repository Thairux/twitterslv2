// Pages (Sprint 9). Compose — supports new post, quote post, edit post, and polls.

import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useApi } from '../lib/api';
import { useBlobUrl } from '../lib/api/use-blob-url';
import { MAX_POST_LEN } from '../lib/domain/post';
import { respondToPost } from '../lib/api/activity';
import { generateImage } from '../lib/api/image';

export function ComposePage() {
  const { store, socialStore, nativeFiles, client } = useApi();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const quoteId = searchParams.get('quote');
  const editId = searchParams.get('edit');

  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);
  const [quotePost, setQuotePost] = useState<{ id: string; body: string } | null>(null);
  const [editPost, setEditPost] = useState<{ id: string; body: string } | null>(null);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);
  const [imagePath, setImagePath] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState('');
  const [draftRestored, setDraftRestored] = useState(false);
  const previewUrl = useBlobUrl(nativeFiles, imagePath || undefined);
  const [aiPrompt, setAiPrompt] = useState('');
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        if (quoteId) {
          const post = await store.getPost(quoteId);
          if (post) setQuotePost({ id: post.id, body: post.body });
        }
        if (editId) {
          const post = await store.getPost(editId);
          if (post && post.authorId === 'user') {
            setEditPost({ id: post.id, body: post.body });
            setBody(post.body);
          }
        }
        if (!quoteId && !editId) {
          const draft = await store.getDraft('compose-main');
          if (draft?.body) {
            setBody(draft.body);
            setDraftRestored(true);
          }
        }
      } catch (err) {
        console.error('Failed to load compose data:', err);
      }
    }
    load();
  }, [store, quoteId, editId]);

  // Autosave draft (new posts only) — survives killed composer.
  useEffect(() => {
    if (quoteId || editId) return;
    if (!body.trim()) return;
    const timer = setTimeout(() => {
      store.saveDraft('compose-main', body).catch(() => {});
    }, 1000);
    return () => clearTimeout(timer);
  }, [store, body, quoteId, editId]);

  async function discardDraft() {
    try {
      await store.deleteDraft('compose-main');
    } catch {
      // ignore
    }
    setBody('');
    setDraftRestored(false);
  }

  const updateOption = (idx: number, value: string) => {
    setPollOptions((prev) => prev.map((o, i) => (i === idx ? value : o)));
  };

  const addOption = () => setPollOptions((prev) => [...prev, '']);
  const removeOption = (idx: number) => setPollOptions((prev) => prev.filter((_, i) => i !== idx));

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;
      const bytes = new Uint8Array(await file.arrayBuffer());
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '');
      const path = `media/${Date.now()}-${safeName}`;
      await nativeFiles.saveBlob(path, bytes);
      setImagePath(path);
    } catch (err) {
      console.error('Image upload failed:', err);
    }
  };

  const handleGenerateImage = async () => {
    if (!aiPrompt.trim() || generating) return;
    setGenerating(true);
    try {
      const result = await generateImage(aiPrompt.trim(), 'user', undefined);
      if (result.via === 'local-model' && result.path) {
        setImagePath(result.path);
      } else {
        console.warn('Image generation returned placeholder; not attaching to post');
      }
    } catch (err) {
      console.error('Image generation failed:', err);
    } finally {
      setGenerating(false);
    }
  };

  const handleSubmit = async () => {
    const trimmed = body.trim();
    if (!trimmed || saving) return;
    setSaving(true);
    try {
      if (editPost) {
        await store.updatePost(editPost.id, {
          body: trimmed.slice(0, MAX_POST_LEN),
          edited: true,
        });
        navigate(`/post/${editPost.id}`);
        return;
      }
      const id = `p-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
      const cleanImageUrl = imageUrl.trim();
      await store.createPost({
        id,
        authorId: 'user',
        body: trimmed.slice(0, MAX_POST_LEN),
        createdAt: new Date().toISOString(),
        likes: 0,
        reposts: 0,
        origin: 'offline',
        quotedPostId: quoteId ?? undefined,
        edited: false,
        aiGenerated: false,
        imagePath: imagePath ?? undefined,
        imageUrl: /^https?:\/\//.test(cleanImageUrl) ? cleanImageUrl : undefined,
      });
      const validOptions = pollOptions.map((o) => o.trim()).filter(Boolean);
      if (pollQuestion.trim() && validOptions.length >= 2) {
        const pollId = `poll-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
        await store.createPoll(
          { id: pollId, postId: id, question: pollQuestion.trim() },
          validOptions.map((label, idx) => ({ id: `opt-${idx}-${Date.now()}`, label })),
        );
      }

      // Friend-first replies + likes land within seconds (persisted, staggered).
      respondToPost(socialStore, store, client, id, trimmed);
      try {
        await store.deleteDraft('compose-main');
      } catch {
        // ignore
      }

      if (quoteId) {
        navigate(`/post/${quoteId}`);
      } else {
        navigate('/');
      }
    } catch (err) {
      console.error('Failed to submit post:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="content-area">
      <h2 className="page-title">{editPost ? 'Edit Post' : quotePost ? 'Quote Post' : 'Compose'}</h2>
      {quotePost && (
        <div className="post" style={{ marginBottom: 12, opacity: 0.8 }}>
          <div className="post-body">{quotePost.body}</div>
        </div>
      )}
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={editPost ? 'Edit your post...' : "What's happening?"}
        maxLength={MAX_POST_LEN}
        rows={4}
        className="input-field"
        style={{ width: '100%', marginBottom: 8 }}
      />
      <div className="field-row" style={{ marginBottom: 8 }}>
        <input type="file" accept="image/*" onChange={handleImageChange} className="input-field" />
        {previewUrl && <img src={previewUrl} alt="preview" style={{ width: 48, height: 48, objectFit: 'cover', border: '2px solid var(--border)' }} />}
      </div>
      <div className="field-row" style={{ marginBottom: 8 }}>
        <input
          type="url"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="Or paste an image URL (https://…)"
          className="input-field"
          style={{ flex: 1 }}
        />
      </div>
      <div className="field-row" style={{ marginBottom: 8 }}>
        <input
          type="text"
          value={aiPrompt}
          onChange={(e) => setAiPrompt(e.target.value)}
          placeholder="Describe an image to generate..."
          className="input-field"
          style={{ flex: 1 }}
        />
        <button className="btn" onClick={handleGenerateImage} disabled={generating || !aiPrompt.trim()}>
          {generating ? 'Generating�' : 'Generate'}
        </button>
      </div>
      <label style={{ fontWeight: 'bold' }}>Poll (optional)</label>
      <input
        type="text"
        value={pollQuestion}
        onChange={(e) => setPollQuestion(e.target.value)}
        placeholder="Poll question"
        maxLength={140}
        className="input-field"
        style={{ width: '100%', marginBottom: 8 }}
      />
      {pollOptions.map((opt, idx) => (
        <div key={idx} className="field-row" style={{ marginBottom: 4 }}>
          <input
            type="text"
            value={opt}
            onChange={(e) => updateOption(idx, e.target.value)}
            placeholder={`Option ${idx + 1}`}
            maxLength={80}
            className="input-field"
          />
          {pollOptions.length > 2 && (
            <button className="btn" onClick={() => removeOption(idx)} style={{ fontSize: 10, padding: '2px 8px' }}>Remove</button>
          )}
        </div>
      ))}
      <button className="btn" onClick={addOption} style={{ marginBottom: 12 }}>Add option</button>
      <div className="field-row">
        <button className="btn" onClick={handleSubmit} disabled={saving || !body.trim()}>
          {saving ? 'Saving…' : (editPost ? 'Update' : 'Post')}
        </button>
        <button className="btn" onClick={() => navigate(-1)}>Cancel</button>
        {!quoteId && !editId && (body.trim() || draftRestored) && (
          <button className="btn" style={{ fontSize: 10, padding: '2px 8px' }} onClick={discardDraft} data-testid="draft-discard">
            Discard draft
          </button>
        )}
      </div>
      {draftRestored && <p className="meta" data-testid="draft-restored">Draft restored.</p>}
      <p className="meta">{body.length}/{MAX_POST_LEN}</p>
    </div>
  );
}
