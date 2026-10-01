import { useState, useEffect } from 'react';
import type { FilesAdapter } from '../../native/files';

function inferType(path: string): string {
  if (path.endsWith('.png')) return 'image/png';
  if (path.endsWith('.jpg') || path.endsWith('.jpeg')) return 'image/jpeg';
  if (path.endsWith('.gif')) return 'image/gif';
  if (path.endsWith('.webp')) return 'image/webp';
  return 'application/octet-stream';
}

export function useBlobUrl(nativeFiles: FilesAdapter, path: string | undefined): string | undefined {
  const [url, setUrl] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!path || path.startsWith('blob:') || path.startsWith('http')) {
      setUrl(path);
      return;
    }
    let cancelled = false;
    let objectUrl: string | undefined;
    const urlsRef: { current: string[] } = { current: [] };

    nativeFiles.loadBlob(path).then((bytes) => {
      if (cancelled) return;
      urlsRef.current.forEach((u) => URL.revokeObjectURL(u));
      urlsRef.current = [];
      if (!bytes) {
        setUrl(undefined);
        return;
      }
      const blob = new Blob([bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer], { type: inferType(path) });
      objectUrl = URL.createObjectURL(blob);
      urlsRef.current.push(objectUrl);
      setUrl(objectUrl);
    }).catch(() => {
      if (!cancelled) setUrl(undefined);
    });
    return () => {
      cancelled = true;
      urlsRef.current.forEach((u) => URL.revokeObjectURL(u));
      urlsRef.current = [];
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [nativeFiles, path]);

  return url;
}
