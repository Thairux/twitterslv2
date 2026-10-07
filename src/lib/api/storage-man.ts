// API: storage-man — blob inventory + orphan pruning (3.0.0 S6).
// listBlobs yields paths only; referenced paths come from SQLite truth.

import type { Store } from './store';
import type { FilesAdapter } from '../../native/files';

export interface StorageBreakdown {
  total: number;
  byPrefix: Record<string, number>;
  orphaned: string[];
}

export async function storageBreakdown(files: FilesAdapter, store: Store): Promise<StorageBreakdown> {
  const paths = await files.listBlobs().catch(() => [] as string[]);
  const byPrefix: Record<string, number> = {};
  for (const p of paths) {
    const prefix = p.includes('/') ? p.split('/')[0] : '(root)';
    byPrefix[prefix] = (byPrefix[prefix] ?? 0) + 1;
  }
  const referenced = new Set<string>();
  try {
    const posts = await store.query<{ image_path: string | null }>('SELECT image_path FROM posts WHERE image_path IS NOT NULL');
    for (const r of posts) if (r.image_path) referenced.add(r.image_path);
  } catch {
    // ignore
  }
  try {
    const profile = await store.getUserProfile();
    if (profile.avatarPath) referenced.add(profile.avatarPath);
  } catch {
    // ignore
  }
  try {
    const models = await store.query<{ path: string }>('SELECT path FROM downloaded_models');
    for (const m of models) if (m.path) referenced.add(m.path);
  } catch {
    // ignore
  }
  const orphaned = paths.filter((p) => !referenced.has(p) && (p.startsWith('media/') || p.startsWith('avatars/')));
  return { total: paths.length, byPrefix, orphaned };
}

export async function pruneOrphanedBlobs(files: FilesAdapter, store: Store): Promise<number> {
  const { orphaned } = await storageBreakdown(files, store);
  let pruned = 0;
  for (const p of orphaned.slice(0, 200)) {
    try {
      await files.deleteBlob(p);
      pruned += 1;
    } catch {
      // keep going
    }
  }
  return pruned;
}
