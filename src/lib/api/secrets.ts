// API: secrets — delegates to src/native/secrets.ts (Sprint 2).
// Never log or persist secrets elsewhere (rule 07).

import { getModelEndpoint as _getModelEndpoint, setModelEndpoint as _setModelEndpoint, getApiKey as _getApiKey, setApiKey as _setApiKey, clearApiKey as _clearApiKey, getImageGenEndpoint as _getImageGenEndpoint, setImageGenEndpoint as _setImageGenEndpoint, getCaptionEndpoint as _getCaptionEndpoint, setCaptionEndpoint as _setCaptionEndpoint, getSelectedModel as _getSelectedModel, setSelectedModel as _setSelectedModel } from '@/native/secrets';

export class Secrets {
  async getEndpoint(): Promise<string | null> {
    return _getModelEndpoint();
  }

  async setEndpoint(url: string): Promise<void> {
    await _setModelEndpoint(url);
  }

  async getApiKey(): Promise<string | null> {
    return _getApiKey();
  }

  async setApiKey(key: string): Promise<void> {
    await _setApiKey(key);
  }

  async clearApiKey(): Promise<void> {
    await _clearApiKey();
  }

  async getImageGenEndpoint(): Promise<string | null> {
    return _getImageGenEndpoint();
  }

  async setImageGenEndpoint(url: string): Promise<void> {
    await _setImageGenEndpoint(url);
  }

  async getCaptionEndpoint(): Promise<string | null> {
    return _getCaptionEndpoint();
  }

  async setCaptionEndpoint(url: string): Promise<void> {
    await _setCaptionEndpoint(url);
  }

  async getSelectedModel(): Promise<string | null> {
    return _getSelectedModel();
  }

  async setSelectedModel(modelId: string): Promise<void> {
    await _setSelectedModel(modelId);
  }
}
