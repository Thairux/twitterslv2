// API: secrets — delegates to src/native/secrets.ts (Sprint 2).
// Never log or persist secrets elsewhere (rule 07).

export class Secrets {
  constructor(private native: typeof import('@/native/secrets')) {}

  async getEndpoint(): Promise<string | null> {
    return this.native.getModelEndpoint();
  }

  async setEndpoint(url: string): Promise<void> {
    await this.native.setModelEndpoint(url);
  }

  async getApiKey(): Promise<string | null> {
    return this.native.getApiKey();
  }

  async setApiKey(key: string): Promise<void> {
    await this.native.setApiKey(key);
  }

  async clearApiKey(): Promise<void> {
    await this.native.clearApiKey();
  }
}
