// API: hf — HuggingFace search/list/parse (Sprint 7, port v1 lib/api/hf.ts).

export interface HfRepo {
  id: string;
  author: string;
  modelName: string;
  siblings?: Array<{ filename: string; size: number }>;
}

export interface HfGguf {
  filename: string;
  size: number;
}

const branchCache = new Map<string, string>();

export async function resolveDefaultBranch(repoId: string): Promise<string> {
  if (branchCache.has(repoId)) return branchCache.get(repoId)!;
  const [author, ...nameParts] = repoId.split('/');
  const modelName = nameParts.join('/');
  const url = `https://huggingface.co/api/models/${encodeURIComponent(author)}/${encodeURIComponent(modelName)}`;
  try {
    const res = await fetch(url);
    if (res.ok) {
      const json = (await res.json()) as Record<string, unknown>;
      const branch = String(json.branch ?? json.defaultBranch ?? 'main');
      branchCache.set(repoId, branch);
      return branch;
    }
  } catch {
    // fall through to default
  }
  branchCache.set(repoId, 'main');
  return 'main';
}

export async function searchRepos(query: string): Promise<HfRepo[]> {
  const url = `https://huggingface.co/api/models?search=${encodeURIComponent(query)}&full=true&limit=20`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HF search failed: ${res.status}`);
  }
  const json = (await res.json()) as Array<Record<string, unknown>>;
  return json.map((repo) => {
    const id = String(repo.id ?? '');
    const parts = id.split('/');
    const siblings = (repo.siblings as Array<{ rfilename: string; size?: number }> | undefined) ?? [];
    const ggufs = siblings
      .filter((f) => f.rfilename.endsWith('.gguf'))
      .map((f) => ({
        filename: f.rfilename.split('/').pop() ?? f.rfilename,
        size: f.size ?? 0,
      }));
    return {
      id,
      author: parts[0] ?? '',
      modelName: parts.slice(1).join('/') || id,
      siblings: ggufs,
    };
  });
}


export async function listRepoGgufs(repoId: string): Promise<HfGguf[]> {
  const [author, ...nameParts] = repoId.split('/');
  const modelName = nameParts.join('/');
  const branch = await resolveDefaultBranch(repoId);
  const url = `https://huggingface.co/api/models/${encodeURIComponent(author)}/${encodeURIComponent(modelName)}/tree/${branch}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HF file list failed: ${res.status}`);
  }
  const json = (await res.json()) as Array<{ path: string; size?: number }>;
  const ggufs = json
    .filter((f) => f.path.endsWith('.gguf'))
    .map((f) => ({
      filename: f.path.split('/').pop() ?? f.path,
      size: f.size ?? 0,
    }));
  if (ggufs.length === 0) {
    throw new Error('No GGUF files found in repo');
  }
  return ggufs;
}
