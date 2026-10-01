// Bootstrap: wires native adapters to API-layer instances.
// Keeps UI layer free of direct native imports.

import { openDatabase } from '../../native/db';
import * as nativeSecrets from '../../native/secrets';
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
  const secrets = new Secrets(nativeSecrets);
  let endpoint: string | undefined;
  let apiKey: string | null | undefined;
  try {
    endpoint = await nativeSecrets.getModelEndpoint();
    apiKey = await nativeSecrets.getApiKey();
  } catch (err) {
    console.error('Secrets initialization failed:', err);
    throw new Error('Secure storage unavailable. Please check device permissions and retry.');
  }
  const client = new ModelClient(endpoint, apiKey ?? undefined);
  const modelService = new ModelService(store, nativeFiles.default ?? nativeFiles);
  await new SeedService(store).seedIfEmpty();
  return { store, socialStore, dmStore, secrets, modelService, client, nativeFiles: nativeFiles.default ?? nativeFiles };
}
