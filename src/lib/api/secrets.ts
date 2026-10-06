// API: secrets — delegates to src/native/secrets.ts (Sprint 2).
// Never log or persist secrets elsewhere (rule 07).

import { getModelEndpoint as _getModelEndpoint, setModelEndpoint as _setModelEndpoint, getApiKey as _getApiKey, setApiKey as _setApiKey, clearApiKey as _clearApiKey, getImageGenEndpoint as _getImageGenEndpoint, setImageGenEndpoint as _setImageGenEndpoint, getCaptionEndpoint as _getCaptionEndpoint, setCaptionEndpoint as _setCaptionEndpoint, getSelectedModel as _getSelectedModel, setSelectedModel as _setSelectedModel, getSelectedImageModel as _getSelectedImageModel, setSelectedImageModel as _setSelectedImageModel, getSelectedCaptionModel as _getSelectedCaptionModel, setSelectedCaptionModel as _setSelectedCaptionModel, getProviderEndpoint as _getProviderEndpoint, setProviderEndpoint as _setProviderEndpoint, getProviderApiKey as _getProviderApiKey, setProviderApiKey as _setProviderApiKey, clearProviderSecrets as _clearProviderSecrets } from '@/native/secrets';

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

  async getSelectedImageModel(): Promise<string | null> {
    return _getSelectedImageModel();
  }

  async setSelectedImageModel(modelId: string): Promise<void> {
    await _setSelectedImageModel(modelId);
  }

  async getSelectedCaptionModel(): Promise<string | null> {
    return _getSelectedCaptionModel();
  }

  async setSelectedCaptionModel(modelId: string): Promise<void> {
    await _setSelectedCaptionModel(modelId);
  }

  async getProviderEndpoint(id: string): Promise<string> {
    return _getProviderEndpoint(id);
  }

  async setProviderEndpoint(id: string, url: string): Promise<void> {
    await _setProviderEndpoint(id, url);
  }

  async getProviderApiKey(id: string): Promise<string | null> {
    return _getProviderApiKey(id);
  }

  async setProviderApiKey(id: string, key: string): Promise<void> {
    await _setProviderApiKey(id, key);
  }

  async clearProviderSecrets(id: string): Promise<void> {
    await _clearProviderSecrets(id);
  }
}
