import { describe, expect, it, vi } from 'vitest';
import { Tyxter } from '../client.js';

type CapturedCall = {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string | undefined;
};

function withCapture() {
  const calls: CapturedCall[] = [];
  const fetchImpl = vi.fn(
    async (
      url: string,
      init: {
        method?: string;
        headers?: Record<string, string>;
        body?: string;
        signal?: unknown;
      },
    ) => {
      calls.push({
        url,
        method: init.method ?? 'GET',
        headers: init.headers ?? {},
        body: init.body,
      });
      return new Response(JSON.stringify({ object: 'account_profile' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    },
  ) as unknown as typeof fetch;
  const client = new Tyxter({
    apiKey: 'tx_sandbox_aaaaaaaaaaaaaaaaaaaaaaaa',
    baseUrl: 'http://test',
    fetch: fetchImpl,
  });
  return { client, calls };
}

describe('AccountResource', () => {
  it('GETs /v1/account for current account profile', async () => {
    const { client, calls } = withCapture();
    await client.account.retrieve();
    expect(calls[0]?.url).toBe('http://test/v1/account');
    expect(calls[0]?.method).toBe('GET');
    expect(calls[0]?.headers['authorization']).toContain('tx_sandbox_');
    expect(calls[0]?.body).toBeUndefined();
  });

  it('GETs /v1/me for the whoami alias', async () => {
    const { client, calls } = withCapture();
    await client.account.me();
    expect(calls[0]?.url).toBe('http://test/v1/me');
    expect(calls[0]?.method).toBe('GET');
  });
});
