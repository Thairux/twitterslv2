import { createContext, useContext, type ReactNode } from 'react';
import type { Store } from './store';
import type { DmStore } from './dm-store';
import type { SocialStore } from './social-store';
import type { ModelService } from './models';
import type { FilesAdapter } from '../../native/files';

export interface ApiContextValue {
  store: Store;
  dmStore: DmStore;
  socialStore: SocialStore;
  modelService: ModelService;
  nativeFiles: FilesAdapter;
}

const ApiContext = createContext<ApiContextValue | null>(null);

export function ApiProvider({ store, dmStore, socialStore, modelService, nativeFiles, children }: { store: Store; dmStore: DmStore; socialStore: SocialStore; modelService: ModelService; nativeFiles: FilesAdapter; children: ReactNode }) {
  return (
    <ApiContext.Provider value={{ store, dmStore, socialStore, modelService, nativeFiles }}>
      {children}
    </ApiContext.Provider>
  );
}

export function useApi(): ApiContextValue {
  const ctx = useContext(ApiContext);
  if (!ctx) {
    throw new Error('useApi must be used within ApiProvider');
  }
  return ctx;
}

export function useStore(): Store {
  const { store } = useApi();
  return store;
}

export function useNativeFiles(): FilesAdapter {
  const { nativeFiles } = useApi();
  return nativeFiles;
}
