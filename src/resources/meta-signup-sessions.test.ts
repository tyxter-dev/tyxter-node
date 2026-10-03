import { describe, expect, it, vi } from 'vitest';

import { Tyxter } from '../client.js';

function capture() {
  const calls: Array<{
    url: string;
    method: string;
    headers: Record<string, string>;
    body?: string;
  }> = [];
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
      return new Response(
        JSON.stringify({
          id: 'mss_123',
          object: 'meta_signup_session',
          status: 'pending',
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    },
  ) as unknown as typeof fetch;
  return {
    calls,
    client: new Tyxter({
      apiKey: 'tx_live_aaaaaaaaaaaaaaaaaaaaaaaa',
      baseUrl: 'http://test',
      fetch: fetchImpl,
    }),
  };
}

describe('MetaSignupSessionsResource', () => {
  it('creates a hosted signup session with the required idempotency key', async () => {
    const { client, calls } = capture();

    await client.metaSignupSessions.create(
      {
        return_url: 'https://merchant.example/settings/whatsapp',
        end_customer_ref: 'merchant_42',
      },
      'idem_meta_signup_1',
    );

    expect(calls[0]).toMatchObject({
      url: 'http://test/v1/meta-signup-sessions',
      method: 'POST',
    });
    expect(calls[0]?.headers['Idempotency-Key']).toBe('idem_meta_signup_1');
    expect(JSON.parse(calls[0]?.body ?? '{}')).toEqual({
      return_url: 'https://merchant.example/settings/whatsapp',
      end_customer_ref: 'merchant_42',
    });
  });

  it('retrieves a session with an encoded id', async () => {
    const { client, calls } = capture();

    await client.metaSignupSessions.retrieve('mss_123/unsafe');

    expect(calls[0]?.url).toBe('http://test/v1/meta-signup-sessions/mss_123%2Funsafe');
    expect(calls[0]?.method).toBe('GET');
  });
});
