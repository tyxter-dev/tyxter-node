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
    object: 'data_retention_policy',
    retention_days: 90,
    data_export_enabled: true,
    updated_at: null,
  },
) {
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
    apiKey: 'tx_sandbox_aaaaaaaaaaaaaaaaaaaaaaaa',
    baseUrl: 'http://test',
    fetch: fetchImpl,
  });
  return { client, calls };
}

describe('DataRetentionResource', () => {
  it('GETs /v1/data-retention', async () => {
    const { client, calls } = withCapture();
    const policy = await client.dataRetention.get();
    expect(calls[0]?.url).toBe('http://test/v1/data-retention');
    expect(calls[0]?.method).toBe('GET');
    expect(policy).toMatchObject({ object: 'data_retention_policy', retention_days: 90 });
  });

  it('PATCHes /v1/data-retention with the body and an optional idempotency key', async () => {
    const { client, calls } = withCapture({
      object: 'data_retention_policy',
      retention_days: 30,
      data_export_enabled: true,
      updated_at: '2026-07-22T12:00:00.000Z',
    });
    const policy = await client.dataRetention.update(
      { retention_days: 30 },
      { idempotencyKey: 'idem_1' },
    );
    expect(calls[0]?.url).toBe('http://test/v1/data-retention');
    expect(calls[0]?.method).toBe('PATCH');
    expect(calls[0]?.headers['idempotency-key']).toBe('idem_1');
    expect(JSON.parse(calls[0]?.body ?? '{}')).toEqual({ retention_days: 30 });
    expect(policy).toMatchObject({ retention_days: 30 });
  });

  it('omits the idempotency header when no key is passed', async () => {
    const { client, calls } = withCapture();
    await client.dataRetention.update({ data_export_enabled: false });
    expect(calls[0]?.headers['idempotency-key']).toBeUndefined();
  });
});
