// Bootstrap: wires native adapters to API-layer instances.
// Keeps UI layer free of direct native imports.

import { openDatabase } from '../../native/db';
import * as nativeFiles from '../../native/files';
import { Database } from './db';
import { Store } from './store';
import { SocialStore } from './social-store';
import { DmStore } from './dm-store';
import { Secrets } from './secrets';
import { ModelClient } from './model-client';
import { ModelService } from './models';
import { SeedService } from './seed';

export async function bootstrap() {
  const nativeDb = await openDatabase('twittersl');
  const database = new Database(nativeDb);
  const store = new Store(database);
  const socialStore = new SocialStore(store);
  const dmStore = new DmStore(store);
  const secrets = new Secrets();
  let endpoint: string | null | undefined;
  let apiKey: string | null | undefined;
  let imageGenEndpoint: string | null | undefined;
  let captionEndpoint: string | null | undefined;
  try {
    endpoint = await secrets.getEndpoint();
    apiKey = await secrets.getApiKey();
    imageGenEndpoint = await secrets.getImageGenEndpoint();
    captionEndpoint = await secrets.getCaptionEndpoint();
  } catch (err) {
    console.error('Secrets initialization failed:', err);
    throw new Error('Secure storage unavailable. Please check device permissions and retry.');
  }
  const client = new ModelClient(endpoint ?? '', apiKey ?? undefined, {
    imageGenEndpoint: imageGenEndpoint || undefined,
    captionEndpoint: captionEndpoint || undefined,
  });
  const modelService = new ModelService(store, nativeFiles.default ?? nativeFiles, client);
  await new SeedService(store).seedIfEmpty();
  return { store, socialStore, dmStore, secrets, modelService, client, nativeFiles: nativeFiles.default ?? nativeFiles };
}
