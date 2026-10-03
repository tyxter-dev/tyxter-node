import { describe, expect, it, vi } from 'vitest';

import { Tyxter } from '../client.js';

type CapturedCall = {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
};

function withCapture(responseBody: unknown = {}) {
  const calls: CapturedCall[] = [];
  const fetchImpl = vi.fn(
    async (
      url: string,
      init: { method?: string; headers?: Record<string, string>; body?: string },
    ) => {
      calls.push({
        url,
        method: init.method ?? 'GET',
        headers: init.headers ?? {},
        body: init.body,
      });
      return new Response(JSON.stringify(responseBody), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    },
  ) as unknown as typeof fetch;
  const client = new Tyxter({
    apiKey: 'tx_live_aaaaaaaaaaaaaaaaaaaaaaaa',
    baseUrl: 'http://test',
    fetch: fetchImpl,
  });
  return { client, calls };
}

describe('ProviderCredentialSetupSessionsResource', () => {
  it('creates a setup session with an idempotency key', async () => {
    const { client, calls } = withCapture({
      object: 'provider_credential_setup_session',
      request_id: 'pcs_123',
      target: 'openai.stt',
      status: 'pending',
    });

    await client.providerCredentialSetupSessions.create({ target: 'openai.stt' }, 'idem_setup_1');

    expect(calls[0]?.url).toBe('http://test/v1/provider-credential-setup-sessions');
    expect(calls[0]?.method).toBe('POST');
    expect(calls[0]?.headers['Idempotency-Key']).toBe('idem_setup_1');
    expect(JSON.parse(calls[0]?.body ?? '{}')).toEqual({ target: 'openai.stt' });
  });

  it('retrieves a setup session by request id', async () => {
    const { client, calls } = withCapture({
      object: 'provider_credential_setup_session',
      request_id: 'pcs_123',
      target: 'meta.whatsapp',
      status: 'completed',
    });

    await client.providerCredentialSetupSessions.retrieve('pcs_123/unsafe');

    expect(calls[0]?.url).toBe(
      'http://test/v1/provider-credential-setup-sessions/pcs_123%2Funsafe',
    );
    expect(calls[0]?.method).toBe('GET');
  });
});
