import { describe, expect, it, vi } from 'vitest';
import { Tyxter } from '../client.js';

type CapturedCall = {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string | undefined;
};

function withCapture(
  responseBody: unknown = {
    id: 'k_1',
    object: 'api_key',
    kind: 'standard',
    secret: 'tx_sandbox_x',
  },
) {
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
      return new Response(JSON.stringify(responseBody), {
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

describe('ApiKeysResource', () => {
  it('POSTs /v1/api-keys with body and forwards idempotency-key', async () => {
    const { client, calls } = withCapture();
    await client.apiKeys.create(
      { name: 'ci', environment: 'sandbox', scopes: ['messages:send'] },
      { idempotencyKey: 'idem_1' },
    );
    expect(calls[0]?.url).toBe('http://test/v1/api-keys');
    expect(calls[0]?.method).toBe('POST');
    expect(calls[0]?.headers['idempotency-key']).toBe('idem_1');
    expect(calls[0]?.headers['authorization']).toContain('tx_sandbox_');
  });

  it('sends POST body as JSON', async () => {
    const { client, calls } = withCapture();
    await client.apiKeys.create({
      name: 'mykey',
      environment: 'production',
      scopes: ['messages:send'],
    });
    const body = JSON.parse(calls[0]?.body ?? '{}') as Record<string, unknown>;
    expect(body).toMatchObject({ name: 'mykey', environment: 'production' });
  });

  it('forwards an optional target project id unchanged', async () => {
    const { client, calls } = withCapture();
    await client.apiKeys.create({
      name: 'target-project-key',
      environment: 'sandbox',
      project_id: 'prj_target',
      scopes: ['messages:send'],
    });

    expect(JSON.parse(calls[0]?.body ?? '{}')).toEqual({
      name: 'target-project-key',
      environment: 'sandbox',
      project_id: 'prj_target',
      scopes: ['messages:send'],
    });
  });

  it('GETs /v1/api-keys with pagination params', async () => {
    const listBody = { object: 'list', data: [], has_more: false, next_cursor: null };
    const { client, calls } = withCapture(listBody);
    await client.apiKeys.list({ limit: 10, starting_after: 'k_0' });
    expect(calls[0]?.url).toBe('http://test/v1/api-keys?limit=10&starting_after=k_0');
    expect(calls[0]?.method).toBe('GET');
  });

  it('GETs /v1/api-keys without query params when none given', async () => {
    const listBody = { object: 'list', data: [], has_more: false, next_cursor: null };
    const { client, calls } = withCapture(listBody);
    await client.apiKeys.list();
    expect(calls[0]?.url).toBe('http://test/v1/api-keys');
  });

  it('GETs /v1/api-keys/:id for retrieve', async () => {
    const { client, calls } = withCapture();
    await client.apiKeys.retrieve('k_123');
    expect(calls[0]?.url).toBe('http://test/v1/api-keys/k_123');
    expect(calls[0]?.method).toBe('GET');
  });

  it('PATCHes /v1/api-keys/:id for rename', async () => {
    const { client, calls } = withCapture();
    await client.apiKeys.rename('k_123', { name: 'Renamed CI key' });
    expect(calls[0]?.url).toBe('http://test/v1/api-keys/k_123');
    expect(calls[0]?.method).toBe('PATCH');
    expect(JSON.parse(calls[0]?.body ?? '{}')).toEqual({ name: 'Renamed CI key' });
  });

  it('DELETEs /v1/api-keys/:id for revoke', async () => {
    const { client, calls } = withCapture();
    await client.apiKeys.revoke('k_123');
    expect(calls[0]?.url).toBe('http://test/v1/api-keys/k_123');
    expect(calls[0]?.method).toBe('DELETE');
  });

  it('POSTs /v1/api-keys/:id/rotate for rotation', async () => {
    const { client, calls } = withCapture();
    await client.apiKeys.rotate('k_123');
    expect(calls[0]?.url).toBe('http://test/v1/api-keys/k_123/rotate');
    expect(calls[0]?.method).toBe('POST');
  });
});
