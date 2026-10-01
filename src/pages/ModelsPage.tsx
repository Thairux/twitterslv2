// Pages (Sprint 7). Models Hub — spec alldemos/ocdemo/models.html.
// React only — data flows through src/lib/api/ use-cases.

import { useState, useEffect } from 'react';
import type { ModelService } from '../lib/api/models';
import { listRepoGgufs } from '../lib/api/hf';

interface ModelsPageProps {
  modelService: ModelService;
}

type Tab = 'search' | 'cat' | 'down';

export function ModelsPage({ modelService }: ModelsPageProps) {
  const [tab, setTab] = useState<Tab>('search');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Array<{ id: string; author: string; modelName: string; siblings?: Array<{ filename: string; size: number }> }>>([]);
  const [searching, setSearching] = useState(false);
  const [downloads, setDownloads] = useState<Array<{ id: string; repo: string; path: string; sizeBytes: number; recRamGb: number }>>([]);
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null);
  const [files, setFiles] = useState<Array<{ filename: string; size: number }>>([]);
  const [selectedFile, setSelectedFile] = useState<string>('');
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [progressMap, setProgressMap] = useState<Record<string, { downloadedBytes: number; sizeBytes: number; status: string; filename?: string }>>({});
  const [error, setError] = useState('');
  const [catalogue, setCatalogue] = useState<Array<{ id: string; author: string; modelName: string; siblings?: Array<{ filename: string; size: number }> }>>([]);

  useEffect(() => {
    if (tab === 'down') {
      modelService.listDownloads().then(setDownloads).catch(() => setDownloads([]));
      modelService.listDownloadProgress().then((rows) => {
        const map: Record<string, { downloadedBytes: number; sizeBytes: number; status: string; filename?: string }> = {};
        for (const row of rows) {
          map[row.id] = {
            downloadedBytes: row.downloadedBytes,
            sizeBytes: row.sizeBytes,
            status: row.status,
            filename: row.filename,
          };
        }
        setProgressMap(map);
      }).catch(() => {});
    }
    if (tab === 'cat') {
      modelService.listCatalogue()
        .then(setCatalogue)
        .catch(() => setCatalogue([]));
    }
  }, [tab, modelService]);

  async function handleSearch() {
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    setError('');
    try {
      const res = await modelService.search(q);
      setResults(res);
    } catch {
      setError('Search failed. Please try again.');
      setResults([]);
    } finally {
      setSearching(false);
    }
  }

  async function openRepo(repoId: string) {
    const [author, ...nameParts] = repoId.split('/');
    const modelName = nameParts.join('/');
    const url = `https://huggingface.co/${encodeURIComponent(author)}/${encodeURIComponent(modelName)}`;
    try {
      window.open(url, '_blank');
    } catch {
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  }

  async function loadFiles(repoId: string) {
    setSelectedRepo(repoId);
    setLoadingFiles(true);
    setError('');
    try {
      const list = await listRepoGgufs(repoId);
      setFiles(list);
      setSelectedFile(list[0]?.filename ?? '');
    } catch (e) {
      setFiles([]);
      setSelectedFile('');
      setError(e instanceof Error ? e.message : 'Failed to load files');
    } finally {
      setLoadingFiles(false);
    }
  }

  function openSearchResultFiles(repoId: string, siblings?: Array<{ filename: string; size: number }>) {
    setSelectedRepo(repoId);
    setFiles(siblings ?? []);
    setSelectedFile(siblings?.[0]?.filename ?? '');
    setError('');
  }

  async function handleDownload(repoId: string) {
    const filename = selectedFile || files[0]?.filename;
    if (!filename) return;
    const downloadId = `${repoId}/${filename}`;
    setDownloading(downloadId);
    setError('');
    try {
      await modelService.downloadModel(
        repoId,
        filename,
        (downloadedBytes, totalBytes) => {
          setProgressMap((prev) => ({
            ...prev,
            [downloadId]: { downloadedBytes, sizeBytes: totalBytes, status: 'downloading' },
          }));
        },
      );
      if (tab === 'down') {
        await modelService.listDownloads().then(setDownloads).catch(() => {});
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Download failed');
    } finally {
      setDownloading(null);
    }
  }

  async function handleResume(repoId: string, filename: string) {
    const downloadId = `${repoId}/${filename}`;
    setDownloading(downloadId);
    setError('');
    try {
      await modelService.downloadModel(
        repoId,
        filename,
        (downloadedBytes, totalBytes) => {
          setProgressMap((prev) => ({
            ...prev,
            [downloadId]: { downloadedBytes, sizeBytes: totalBytes, status: 'downloading' },
          }));
        },
      );
      if (tab === 'down') {
        await modelService.listDownloads().then(setDownloads).catch(() => {});
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Resume failed');
    } finally {
      setDownloading(null);
    }
  }

  async function handleDelete(id: string) {
    setError('');
    try {
      await modelService.deleteDownloadedModel(id);
      setDownloads((prev) => prev.filter((d) => d.id !== id));
      setProgressMap((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    } catch {
      setError('Delete failed');
    }
  }

  function formatMb(bytes: number) {
    if (!bytes || bytes <= 0) return '—';
    return (bytes / 1024 / 1024).toFixed(1);
  }

  function formatGb(bytes: number) {
    if (!bytes || bytes <= 0) return '—';
    return (bytes / 1024 / 1024 / 1024).toFixed(2);
  }

  return (
    <div className="content-area">
      <h2 className="page-title">HF Models Hub</h2>
      <div className="feed-tabs">
        {(['search', 'cat', 'down'] as Tab[]).map((t) => (
          <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>
            {t === 'search' ? 'Search' : t === 'cat' ? 'Catalogue' : 'Downloads'}
          </button>
        ))}
      </div>

      {error && <p style={{ color: 'red', marginBottom: 12 }}>{error}</p>}

      {tab === 'search' && (
        <div className="tab-pane active-pane">
          <div className="field-row" style={{ marginBottom: 16 }}>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search HF (e.g. qwen, llava gguf)"
              className="input-field"
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <button className="btn" onClick={handleSearch} disabled={searching}>
              {searching ? '...' : 'Go'}
            </button>
          </div>
          <div>
            {results.map((r) => (
              <div key={r.id} className="model-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <div>
                    <b>{r.id}</b>
                    <div className="meta">Repo: {r.id}</div>
                  </div>
                  <div className="field-row">
                    <button className="btn" style={{ padding: '4px 8px', fontSize: 12 }} onClick={() => openRepo(r.id)}>Open</button>
                    <button className="btn" style={{ padding: '4px 8px', fontSize: 12 }} onClick={() => openSearchResultFiles(r.id, r.siblings)}>Files</button>
                  </div>
                </div>
                {selectedRepo === r.id && (
                  <div style={{ marginTop: 12 }}>
                    {loadingFiles ? (
                      <p className="meta">Loading files...</p>
                    ) : files.length === 0 ? (
                      <p className="meta">No GGUF files found.</p>
                    ) : (
                      <>
                        <label className="meta">GGUF file</label>
                        <div className="field-row" style={{ marginTop: 4, marginBottom: 8 }}>
                          <select
                            value={selectedFile}
                            onChange={(e) => setSelectedFile(e.target.value)}
                            className="input-field"
                          >
                            {files.map((f) => (
                              <option key={f.filename} value={f.filename}>
                                {f.filename} {formatMb(f.size)} MB
                              </option>
                            ))}
                          </select>
                          <button
                            className="btn"
                            onClick={() => handleDownload(r.id)}
                            disabled={downloading === `${r.id}/${selectedFile}`}
                          >
                            {downloading === `${r.id}/${selectedFile}` ? '...' : 'Download'}
                          </button>
                        </div>
                        {(() => {
                          const key = `${r.id}/${selectedFile}`;
                          const prog = progressMap[key];
                          if (!prog || prog.status === 'complete') return null;
                          const pct = prog.sizeBytes > 0 ? Math.min(100, (prog.downloadedBytes / prog.sizeBytes) * 100) : 0;
                          return (
                            <div style={{ marginTop: 8 }}>
                              <div style={{ height: 8, background: '#00000022', border: '2px solid #000' }}>
                                <div style={{ width: `${pct}%`, height: '100%', background: '#000' }} />
                              </div>
                              <div className="meta" style={{ marginTop: 4 }}>
                                {formatMb(prog.downloadedBytes)} / {formatMb(prog.sizeBytes)} MB ({pct.toFixed(0)}%)
                                {prog.status === 'error' && ' — interrupted'}
                              </div>
                              {prog.status === 'error' && (
                                <button className="btn" style={{ padding: '2px 6px', fontSize: 11, marginTop: 4 }} onClick={() => handleResume(r.id, selectedFile)}>
                                  Resume
                                </button>
                              )}
                            </div>
                          );
                        })()}
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
            {!searching && results.length === 0 && query.trim() && (
              <p className="meta">No results.</p>
            )}
          </div>
        </div>
      )}

      {tab === 'cat' && (
        <div className="tab-pane active-pane">
          {catalogue.map((c) => (
            <div key={c.id} className="model-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <div>
                  <b>{c.modelName}</b>
                  <div className="meta">Repo: {c.id}</div>
                </div>
                <div className="field-row">
                  <button className="btn" style={{ padding: '4px 8px', fontSize: 12 }} onClick={() => openRepo(c.id)}>Open</button>
                  <button className="btn" style={{ padding: '4px 8px', fontSize: 12 }} onClick={() => loadFiles(c.id)}>Files</button>
                </div>
              </div>
              {selectedRepo === c.id && (
                <div style={{ marginTop: 12 }}>
                  {loadingFiles ? (
                    <p className="meta">Loading files...</p>
                  ) : files.length === 0 ? (
                    <p className="meta">No GGUF files found.</p>
                  ) : (
                    <>
                      <label className="meta">GGUF file</label>
                      <div className="field-row" style={{ marginTop: 4, marginBottom: 8 }}>
                        <select
                          value={selectedFile}
                          onChange={(e) => setSelectedFile(e.target.value)}
                          className="input-field"
                        >
                          {files.map((f) => (
                            <option key={f.filename} value={f.filename}>
                              {f.filename} {formatMb(f.size)} MB
                            </option>
                          ))}
                        </select>
                        <button
                          className="btn"
                          onClick={() => handleDownload(c.id)}
                          disabled={downloading === `${c.id}/${selectedFile}`}
                        >
                          {downloading === `${c.id}/${selectedFile}` ? '...' : 'Download'}
                        </button>
                      </div>
                      {(() => {
                        const key = `${c.id}/${selectedFile}`;
                        const prog = progressMap[key];
                        if (!prog || prog.status === 'complete') return null;
                        const pct = prog.sizeBytes > 0 ? Math.min(100, (prog.downloadedBytes / prog.sizeBytes) * 100) : 0;
                        return (
                          <div style={{ marginTop: 8 }}>
                            <div style={{ height: 8, background: '#00000022', border: '2px solid #000' }}>
                              <div style={{ width: `${pct}%`, height: '100%', background: '#000' }} />
                            </div>
                            <div className="meta" style={{ marginTop: 4 }}>
                              {formatMb(prog.downloadedBytes)} / {formatMb(prog.sizeBytes)} MB ({pct.toFixed(0)}%)
                              {prog.status === 'error' && ' — interrupted'}
                            </div>
                            {prog.status === 'error' && (
                              <button className="btn" style={{ padding: '2px 6px', fontSize: 11, marginTop: 4 }} onClick={() => handleResume(c.id, selectedFile)}>
                                Resume
                              </button>
                            )}
                          </div>
                        );
                      })()}
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 'down' && (
        <div className="tab-pane active-pane">
          {downloads.length === 0 && <p className="meta">No downloaded models.</p>}
          {downloads.map((d) => (
            <div key={d.id} className="model-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, wordBreak: 'break-all' }}>
                    <b>{d.path}</b>
                  </div>
                  <div className="meta">
                    Repo: {d.repo} | Size: {formatGb(d.sizeBytes)} GB | Rec RAM: {d.recRamGb} GB
                  </div>
                </div>
                <button className="btn" style={{ padding: '4px 8px', fontSize: 12 }} onClick={() => handleDelete(d.id)}>Delete</button>
              </div>
              {(() => {
                const prog = progressMap[d.id];
                if (!prog || prog.status === 'complete') return null;
                const pct = prog.sizeBytes > 0 ? Math.min(100, (prog.downloadedBytes / prog.sizeBytes) * 100) : 0;
                return (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ height: 8, background: '#00000022', border: '2px solid #000' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: '#000' }} />
                    </div>
                    <div className="meta" style={{ marginTop: 4 }}>
                      {formatMb(prog.downloadedBytes)} / {formatMb(prog.sizeBytes)} MB ({pct.toFixed(0)}%)
                      {prog.status === 'error' && ' — interrupted'}
                    </div>
                    {prog.status === 'error' && (
                      <button className="btn" style={{ padding: '2px 6px', fontSize: 11, marginTop: 4 }} onClick={() => handleResume(d.repo, prog.filename ?? '')}>
                        Resume
                      </button>
                    )}
                  </div>
                );
              })()}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
