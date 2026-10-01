import { Store } from './store';
import { searchRepos, listRepoGgufs } from './hf';
import type { FilesAdapter } from '@/native/files';
import type { DownloadedModelRow } from '@/store/schema';
import { z } from 'zod';

export type DownloadedModel = DownloadedModelRow;

const CatalogueEntrySchema = z.object({
  id: z.string().min(1),
  author: z.string().min(1),
  modelName: z.string().min(1),
  siblings: z.array(z.object({ filename: z.string(), size: z.number() })).optional(),
});

export type CatalogueEntry = z.infer<typeof CatalogueEntrySchema>;

export class ModelService {
  constructor(private store: Store, private files: FilesAdapter) {}

  async search(query: string): Promise<Array<{ id: string; author: string; modelName: string }>> {
    if (!query.trim()) return [];
    return searchRepos(query);
  }

  async listCatalogue(): Promise<CatalogueEntry[]> {
    const raw = [
      { id: 'Qwen/Qwen2.5-0.5B-Instruct-GGUF', author: 'Qwen', modelName: 'Qwen2.5-0.5B-Instruct-GGUF' },
      { id: 'TheBloke/Mistral-7B-Instruct-v0.2-GGUF', author: 'TheBloke', modelName: 'Mistral-7B-Instruct-v0.2-GGUF' },
      { id: 'MaziyarPanahi/Mistral-7B-Instruct-v0.3-GGUF', author: 'MaziyarPanahi', modelName: 'Mistral-7B-Instruct-v0.3-GGUF' },
      { id: 'QuantFactory/Meta-Llama-3.1-8B-Instruct-GGUF', author: 'QuantFactory', modelName: 'Meta-Llama-3.1-8B-Instruct-GGUF' },
    ];

    const downloads = await this.store.query<DownloadedModel>('SELECT id, repo, path FROM downloaded_models');
    const downloadedRepos = new Set(downloads.map((d) => d.repo));

    const validated: CatalogueEntry[] = [];
    for (const entry of raw) {
      if (downloadedRepos.has(entry.id)) continue;
      try {
        const parsed = CatalogueEntrySchema.parse(entry);
        try {
          const siblings = await listRepoGgufs(entry.id);
          parsed.siblings = siblings;
        } catch {
          // keep catalogue entry even if GGUF enumeration fails
        }
        validated.push(parsed);
      } catch {
        // skip invalid catalogue entries
      }
    }
    return validated;
  }

  async listDownloads(): Promise<DownloadedModel[]> {
    return this.store.query<DownloadedModel>(
      `SELECT id, repo, path, size_bytes AS sizeBytes, rec_ram_gb AS recRamGb
       FROM downloaded_models ORDER BY rowid DESC`,
    );
  }

  async deleteDownloadedModel(id: string): Promise<void> {
    await this.store.deleteDownloadedModel(id);
  }

  async getDownloadProgress(id: string) {
    return this.store.getDownloadProgress(id);
  }

  async listDownloadProgress() {
    return this.store.query<any>('SELECT id, repo, filename, path, size_bytes AS sizeBytes, downloaded_bytes AS downloadedBytes, status FROM download_progress');
  }

  async cancelDownload(id: string): Promise<void> {
    const progress = await this.store.getDownloadProgress(id);
    if (progress) {
      try {
        await this.files.deleteBlob(progress.path);
      } catch {
        // ignore cleanup failures
      }
      await this.store.upsertDownloadProgress({
        ...progress,
        status: 'cancelled',
        downloadedBytes: 0,
      });
    }
  }

  async downloadModel(
    repoId: string,
    filename: string,
    onProgress?: (downloadedBytes: number, totalBytes: number) => void,
  ): Promise<{ path: string; sizeBytes: number; recRamGb: number }> {
    const [author, ...nameParts] = repoId.split('/');
    const modelName = nameParts.join('/');
    const url = `https://huggingface.co/${encodeURIComponent(author)}/${encodeURIComponent(modelName)}/resolve/main/${encodeURIComponent(filename)}`;
    const id = `${repoId}/${filename}`;
    const path = `models/${id.replace(/\//g, '_')}`;

    const existing = await this.store.getDownloadProgress(id);
    const existingBytes = existing?.status === 'downloading' ? existing.downloadedBytes : 0;

    const headers: Record<string, string> = {};
    if (existingBytes > 0) {
      headers['Range'] = `bytes=${existingBytes}-`;
    }

    const res = await fetch(url, { headers });
    if (!res.ok && !(res.status === 206 && existingBytes > 0)) {
      throw new Error(`Failed to download model: ${res.status}`);
    }

    const contentRange = res.headers.get('content-range');
    let totalSize = 0;
    if (contentRange) {
      const match = contentRange.match(/\/(\d+)/);
      if (match) totalSize = parseInt(match[1], 10);
    } else {
      const contentLength = res.headers.get('content-length');
      if (contentLength) totalSize = parseInt(contentLength, 10);
    }

    const reader = res.body?.getReader();
    if (!reader) {
      throw new Error('Download stream unavailable');
    }

    const sizeGb = totalSize / 1024 / 1024 / 1024;
    const recRamGb = Math.ceil(sizeGb * 1.5 + 1.5);

    if (existingBytes === 0) {
      await this.store.upsertDownloadProgress({
        id,
        repo: repoId,
        filename,
        path,
        sizeBytes: totalSize,
        downloadedBytes: 0,
        status: 'downloading',
      });
    }

    let downloaded = existingBytes;
    const chunkSize = 1024 * 1024;
    let buffer = new Uint8Array(0);

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (!value) continue;

        buffer = new Uint8Array(buffer.length + value.length);
        buffer.set(value, buffer.length - value.length);

        while (buffer.length >= chunkSize) {
          const chunk = buffer.slice(0, chunkSize);
          await this.files.appendBlob(path, chunk);
          downloaded += chunk.length;
          buffer = buffer.slice(chunkSize);

          await this.store.upsertDownloadProgress({
            id,
            repo: repoId,
            filename,
            path,
            sizeBytes: totalSize,
            downloadedBytes: downloaded,
            status: 'downloading',
          });

          onProgress?.(downloaded, totalSize);
        }
      }

      if (buffer.length > 0) {
        await this.files.appendBlob(path, buffer);
        downloaded += buffer.length;
      }

      await this.store.upsertDownloadProgress({
        id,
        repo: repoId,
        filename,
        path,
        sizeBytes: totalSize,
        downloadedBytes: downloaded,
        status: 'complete',
      });

      await this.store.createDownloadedModel({
        id,
        repo: repoId,
        path,
        sizeBytes: downloaded,
        recRamGb,
      });

      await this.store.deleteDownloadProgress(id);
      return { path, sizeBytes: downloaded, recRamGb };
    } catch (error) {
      try {
        await this.files.deleteBlob(path);
      } catch {
        // ignore cleanup failures
      }
      await this.store.upsertDownloadProgress({
        id,
        repo: repoId,
        filename,
        path,
        sizeBytes: totalSize,
        downloadedBytes: downloaded,
        status: 'error',
      });
      throw error;
    }
  }
}
