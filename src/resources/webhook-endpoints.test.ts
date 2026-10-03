import { describe, expect, it, vi } from 'vitest';
import { Tyxter } from '../client.js';
import type { WebhookEndpointResponse } from '../contracts.js';

type CapturedCall = {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string | undefined;
};

const endpointFixture: WebhookEndpointResponse = {
  id: 'whe_1',
  object: 'webhook_endpoint',
  url: 'https://example.com/hook',
  description: null,
  subscribed_events: ['message.delivered'],
  status: 'active',
  disabled_reason: null,
  disabled_detail: null,
  last_failure_at: null,
  last_success_at: null,
  environment: 'sandbox',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const testReceiptFixture = {
  object: 'webhook_test',
  webhook_event_id: 'whevt_1',
  webhook_endpoint_id: 'whe_1',
  status: 'pending',
};

function withCapture(responseBody: unknown = endpointFixture) {
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

describe('WebhookEndpointsResource', () => {
  it('POSTs /v1/webhook-endpoints and forwards idempotency-key', async () => {
    const { client, calls } = withCapture();
    await client.webhookEndpoints.create(
      { url: 'https://example.com/hook', subscribed_events: ['message.delivered'] },
      { idempotencyKey: 'idem_whe_1' },
    );
    expect(calls[0]?.url).toBe('http://test/v1/webhook-endpoints');
    expect(calls[0]?.method).toBe('POST');
    expect(calls[0]?.headers['idempotency-key']).toBe('idem_whe_1');
  });

  it('GETs /v1/webhook-endpoints list with cursor param', async () => {
    const listBody = { object: 'list', data: [], has_more: false, next_cursor: null };
    const { client, calls } = withCapture(listBody);
    await client.webhookEndpoints.list({ limit: 5, starting_after: 'whe_0' });
    expect(calls[0]?.url).toBe('http://test/v1/webhook-endpoints?limit=5&starting_after=whe_0');
    expect(calls[0]?.method).toBe('GET');
  });

  it('GETs /v1/webhook-endpoints/:id for retrieve', async () => {
    const disabledEndpoint: WebhookEndpointResponse = {
      ...endpointFixture,
      status: 'disabled',
      disabled_reason: 'unhealthy_consecutive_failures',
      disabled_detail: { last_status_code: null, failure_class: 'timeout' },
    };
    const { client, calls } = withCapture(disabledEndpoint);
    const endpoint = await client.webhookEndpoints.retrieve('whe_123');
    expect(calls[0]?.url).toBe('http://test/v1/webhook-endpoints/whe_123');
    expect(calls[0]?.method).toBe('GET');
    expect(endpoint.disabled_detail).toEqual({ last_status_code: null, failure_class: 'timeout' });
  });

  it('PATCHes /v1/webhook-endpoints/:id for update', async () => {
    const { client, calls } = withCapture();
    await client.webhookEndpoints.update('whe_123', { status: 'disabled' });
    expect(calls[0]?.url).toBe('http://test/v1/webhook-endpoints/whe_123');
    expect(calls[0]?.method).toBe('PATCH');
    const body = JSON.parse(calls[0]?.body ?? '{}') as Record<string, unknown>;
    expect(body).toMatchObject({ status: 'disabled' });
  });

  it('POSTs /v1/webhook-endpoints/:id/rotate-signing-secret', async () => {
    const { client, calls } = withCapture({
      ...endpointFixture,
      signing_secret: '9b1de2f3a4c5061728394a5b6c7d8e9f0a1b2c3d4e5f60718293a4b5c6d7e8f9',
    });
    await client.webhookEndpoints.rotateSigningSecret('whe_123');
    expect(calls[0]?.url).toBe('http://test/v1/webhook-endpoints/whe_123/rotate-signing-secret');
    expect(calls[0]?.method).toBe('POST');
  });

  it('POSTs an empty endpoint test request and forwards idempotency-key', async () => {
    const { client, calls } = withCapture(testReceiptFixture);

    const receipt = await client.webhookEndpoints.test('whe_123', {
      idempotencyKey: 'idem-test',
    });

    expect(receipt).toEqual(testReceiptFixture);
    expect(calls[0]?.url).toBe('http://test/v1/webhook-endpoints/whe_123/test');
    expect(calls[0]?.method).toBe('POST');
    expect(calls[0]?.body).toBeUndefined();
    expect(calls[0]?.headers['idempotency-key']).toBe('idem-test');
  });

  it('DELETEs /v1/webhook-endpoints/:id', async () => {
    const { client, calls } = withCapture();
    await client.webhookEndpoints.delete('whe_123');
    expect(calls[0]?.url).toBe('http://test/v1/webhook-endpoints/whe_123');
    expect(calls[0]?.method).toBe('DELETE');
  });

  it('forwards idempotency-key on update, rotate-signing-secret, and delete', async () => {
    const { client, calls } = withCapture({
      ...endpointFixture,
      signing_secret: '9b1de2f3a4c5061728394a5b6c7d8e9f0a1b2c3d4e5f60718293a4b5c6d7e8f9',
    });

    await client.webhookEndpoints.update(
      'whe_123',
      { status: 'disabled' },
      { idempotencyKey: 'idem-upd' },
    );
    await client.webhookEndpoints.rotateSigningSecret('whe_123', { idempotencyKey: 'idem-rot' });
    await client.webhookEndpoints.delete('whe_123', { idempotencyKey: 'idem-del' });

    expect(calls[0]?.headers['idempotency-key']).toBe('idem-upd');
    expect(calls[1]?.headers['idempotency-key']).toBe('idem-rot');
    expect(calls[2]?.headers['idempotency-key']).toBe('idem-del');
  });
});
