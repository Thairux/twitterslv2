# Backend — Model Client (Sprint 7)

Ports v1 `glimmer.ts` as `model-client.ts` ("Model Endpoint URL" + API key).
Endpoint-first, offline fallback, attempt history + `via` flag per generation.
Typed errors; no silent success. HF search/list/download in `hf.ts`/`models.ts`;
blobs to files adapter, DB keeps paths. Local inference: spike only (risk R2).
