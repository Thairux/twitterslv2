import { describe, it, expect, beforeEach } from 'vitest';
import {
  getInferencePolicy,
  classifyError,
  isCooled,
  clearCooldown,
  recordFallback,
  getFallbackCounters,
  reportAmbientFailure,
  validateInference,
  buildLiveClient,
  resetInferencePolicyState,
} from '../../src/lib/api/inference-policy';
import { resetAmbientStatus } from '../../src/lib/api/ambient-status';

function namedError(name: string, message: string): Error {
  const e = new Error(message);
  e.name = name;
  return e;
}

function storeWith(policy: string | null) {
  return {
    async getAgentConfig(key: string) {
      if (policy === null) throw new Error('no storage');
      return { key, value: policy };
    },
  };
}

beforeEach(() => {
  resetInferencePolicyState();
  resetAmbientStatus();
});

describe('getInferencePolicy', () => {
  it('defaults to strict when storage is unavailable', async () => {
    await expect(getInferencePolicy(storeWith(null))).resolves.toBe('strict');
  });

  it('honors stored hybrid/offline/strict', async () => {
    await expect(getInferencePolicy(storeWith('hybrid'))).resolves.toBe('hybrid');
    await expect(getInferencePolicy(storeWith('offline'))).resolves.toBe('offline');
    await expect(getInferencePolicy(storeWith('strict'))).resolves.toBe('strict');
  });

  it('falls back to strict on unknown values', async () => {
    await expect(getInferencePolicy(storeWith('turbo'))).resolves.toBe('strict');
  });
});

describe('classifyError', () => {
  it('maps error classes to inference states', () => {
    expect(classifyError(namedError('AuthError', 'Auth failed (401)'))).toBe('AUTH_FAILURE');
    expect(classifyError(namedError('RateLimitError', 'Rate limited by endpoint'))).toBe('RATE_LIMITED');
    expect(classifyError(namedError('ParseError', 'Malformed response'))).toBe('MODEL_FAILURE');
    expect(classifyError(namedError('ConnectionError', 'Endpoint returned 404'))).toBe('MODEL_FAILURE');
    expect(classifyError(namedError('ConnectionError', 'Network error: dns'))).toBe('ENDPOINT_FAILURE');
    expect(classifyError(namedError('AbortError', 'aborted'))).toBe('TIMEOUT');
    expect(classifyError(new Error('boom'))).toBe('ENDPOINT_FAILURE');
  });
});

describe('cooldown', () => {
  it('cools aggressively on rate limits and recovers on clear', () => {
    const ep = 'https://gw.example';
    expect(isCooled(ep)).toBe(false);
    reportAmbientFailure('test', namedError('RateLimitError', 'Rate limited'), { chatEndpoint: ep } as never);
    expect(isCooled(ep)).toBe(true);
    clearCooldown(ep);
    expect(isCooled(ep)).toBe(false);
  });

  it('does not cool other endpoints', () => {
    reportAmbientFailure('test', namedError('RateLimitError', 'Rate limited'), { chatEndpoint: 'https://a.example' } as never);
    expect(isCooled('https://b.example')).toBe(false);
  });
});

describe('fallback counters', () => {
  it('aggregates per provider+reason', () => {
    recordFallback('https://gw.example', 'AUTH_FAILURE');
    recordFallback('https://gw.example', 'AUTH_FAILURE');
    recordFallback('https://gw.example', 'TIMEOUT');
    const counters = getFallbackCounters();
    expect(counters.find((c) => c.key === 'https://gw.example :: AUTH_FAILURE')?.count).toBe(2);
    expect(counters.find((c) => c.key === 'https://gw.example :: TIMEOUT')?.count).toBe(1);
  });
});

describe('validateInference', () => {
  it('reports READY_LIVE on success', async () => {
    const client = {
      defaultModel: 'm1',
      async chat() {
        return 'OK';
      },
    };
    await expect(validateInference(client)).resolves.toMatchObject({ state: 'READY_LIVE', model: 'm1' });
  });

  it('maps each failure class to its state', async () => {
    const failing = (err: Error) => ({
      async chat(): Promise<string> {
        throw err;
      },
    });
    await expect(validateInference(failing(namedError('AuthError', '401')))).resolves.toMatchObject({ state: 'AUTH_FAILURE' });
    await expect(validateInference(failing(namedError('RateLimitError', '429')))).resolves.toMatchObject({ state: 'RATE_LIMITED' });
    await expect(validateInference(failing(namedError('ParseError', 'bad')))).resolves.toMatchObject({ state: 'MODEL_FAILURE' });
    await expect(validateInference(failing(new Error('dns down')))).resolves.toMatchObject({ state: 'ENDPOINT_FAILURE' });
  });
});

describe('buildLiveClient', () => {
  it('never throws and returns undefined without storage', async () => {
    await expect(buildLiveClient()).resolves.toBeUndefined();
  });
});
