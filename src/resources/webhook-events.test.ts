import { describe, expect, it, vi } from 'vitest';
import { Tyxter } from '../client.js';

type CapturedCall = {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string | undefined;
};

const eventFixture = {
  id: 'wev_1',
  object: 'webhook_event',
  endpoint_id: 'whe_1',
  type: 'message.delivered',
  source_type: 'message',
  source_id: 'msg_1',
  payload: {},
  status: 'delivered',
  trace_id: 'trace_abc',
  created_at: '2024-01-01T00:00:00Z',
  attempts: [],
};

const resendFixture = {
  id: 'att_2',
  status: 'pending',
  attempt: 2,
  status_code: null,
  response_body_redacted: null,
  error_message: null,
  next_retry_at: null,
  created_at: '2024-01-02T00:00:00Z',
};

function withCapture(responseBody: unknown = eventFixture) {
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

describe('WebhookEventsResource', () => {
  it('GETs /v1/webhook-events list with pagination', async () => {
    const listBody = { object: 'list', data: [], has_more: false, next_cursor: null };
    const { client, calls } = withCapture(listBody);
    await client.webhookEvents.list({ limit: 20, starting_after: 'wev_0' });
    expect(calls[0]?.url).toBe('http://test/v1/webhook-events?limit=20&starting_after=wev_0');
    expect(calls[0]?.method).toBe('GET');
  });

  it('GETs /v1/webhook-events list with filters', async () => {
    const listBody = { object: 'list', data: [], has_more: false, next_cursor: null };
    const { client, calls } = withCapture(listBody);
    await client.webhookEvents.list({
      event_types: ['message.sent', 'message.failed'],
      webhook_endpoint_id: 'wep_123',
      status: 'failed',
    });
    expect(calls[0]?.url).toBe(
      'http://test/v1/webhook-events?event_types=message.sent&event_types=message.failed&webhook_endpoint_id=wep_123&status=failed',
    );
  });

  it('GETs /v1/webhook-events list without params when none given', async () => {
    const listBody = { object: 'list', data: [], has_more: false, next_cursor: null };
    const { client, calls } = withCapture(listBody);
    await client.webhookEvents.list();
    expect(calls[0]?.url).toBe('http://test/v1/webhook-events');
  });

  it('GETs /v1/webhook-events/listen with long-poll query params', async () => {
    const listBody = {
      object: 'webhook_event_listen',
      data: [],
      has_more: false,
      next_cursor: null,
      next_poll_after_ms: 1000,
    };
    const { client, calls } = withCapture(listBody);
    await client.webhookEvents.listen({
      cursor: 'evt_0',
      start_at: 'tail',
      event_types: ['message.delivered', 'message.failed'],
      wait_ms: 1000,
      webhook_endpoint_id: 'wep_123',
      listen_session_id: 'wls_123',
    });
    expect(calls[0]?.url).toBe(
      'http://test/v1/webhook-events/listen?cursor=evt_0&start_at=tail&event_types=message.delivered&event_types=message.failed&wait_ms=1000&webhook_endpoint_id=wep_123&listen_session_id=wls_123',
    );
    expect(calls[0]?.method).toBe('GET');
  });

  it('GETs /v1/webhook-events/:id for retrieve', async () => {
    const { client, calls } = withCapture();
    await client.webhookEvents.retrieve('wev_123');
    expect(calls[0]?.url).toBe('http://test/v1/webhook-events/wev_123');
    expect(calls[0]?.method).toBe('GET');
  });

  it('GETs /v1/webhook-events/listen/:id for sandbox listen replay retrieval', async () => {
    const { client, calls } = withCapture();
    await client.webhookEvents.retrieveListenEvent('outbox 123', {
      webhook_endpoint_id: 'wep_123',
      listen_session_id: 'wls_123',
    });
    expect(calls[0]?.url).toBe(
      'http://test/v1/webhook-events/listen/outbox%20123?webhook_endpoint_id=wep_123&listen_session_id=wls_123',
    );
    expect(calls[0]?.method).toBe('GET');
  });

  it('POSTs /v1/webhook-events/listen-sessions to open a production listen window', async () => {
    const { client, calls } = withCapture({
      id: 'wls_123',
      object: 'webhook_listen_session',
      environment: 'production',
      status: 'active',
      expires_at: '2026-05-29T13:05:00.000Z',
      disabled_at: null,
      created_at: '2026-05-29T13:00:00.000Z',
      trace_id: 'trc_123',
      poll_endpoint: '/v1/webhook-events/listen',
      retrieve_endpoint: '/v1/webhook-events/listen/:outbox_event_id',
    });
    await client.webhookEvents.createListenSession({
      ttl_seconds: 120,
      reason: 'prod receive smoke',
    });
    expect(calls[0]?.url).toBe('http://test/v1/webhook-events/listen-sessions');
    expect(calls[0]?.method).toBe('POST');
    expect(JSON.parse(calls[0]?.body ?? '{}')).toEqual({
      ttl_seconds: 120,
      reason: 'prod receive smoke',
    });
  });

  it('DELETEs /v1/webhook-events/listen-sessions/:id to close a production listen window', async () => {
    const { client, calls } = withCapture({
      id: 'wls_123',
      object: 'webhook_listen_session',
      environment: 'production',
      status: 'disabled',
      expires_at: '2026-05-29T13:05:00.000Z',
      disabled_at: '2026-05-29T13:01:00.000Z',
      created_at: '2026-05-29T13:00:00.000Z',
      trace_id: 'trc_123',
      poll_endpoint: '/v1/webhook-events/listen',
      retrieve_endpoint: '/v1/webhook-events/listen/:outbox_event_id',
    });
    await client.webhookEvents.disableListenSession('wls 123');
    expect(calls[0]?.url).toBe('http://test/v1/webhook-events/listen-sessions/wls%20123');
    expect(calls[0]?.method).toBe('DELETE');
  });

  it('POSTs /v1/webhook-events/:id/resend', async () => {
    const { client, calls } = withCapture(resendFixture);
    await client.webhookEvents.resend('wev_123');
    expect(calls[0]?.url).toBe('http://test/v1/webhook-events/wev_123/resend');
    expect(calls[0]?.method).toBe('POST');
  });

  it('forwards idempotency-key on resend and bulk-resend', async () => {
    const { client, calls } = withCapture(resendFixture);

    await client.webhookEvents.resend('wev_123', { idempotencyKey: 'idem-resend' });
    await client.webhookEvents.bulkResend({ status: 'failed' }, { idempotencyKey: 'idem-bulk' });

    expect(calls[0]?.headers['idempotency-key']).toBe('idem-resend');
    expect(calls[1]?.headers['idempotency-key']).toBe('idem-bulk');
  });

  it('POSTs /v1/webhook-events/bulk-resend with filters', async () => {
    const { client, calls } = withCapture({
      object: 'webhook_bulk_resend',
      requested: 1,
      enqueued: 1,
      skipped: 0,
      attempts: [resendFixture],
    });
    await client.webhookEvents.bulkResend({
      event_type: 'message.failed',
      status: 'failed',
      limit: 25,
    });
    expect(calls[0]?.url).toBe('http://test/v1/webhook-events/bulk-resend');
    expect(calls[0]?.method).toBe('POST');
    expect(JSON.parse(calls[0]?.body ?? '{}')).toEqual({
      event_type: 'message.failed',
      status: 'failed',
      limit: 25,
    });
  });

  it('sends authorization header on all requests', async () => {
    const { client, calls } = withCapture();
    await client.webhookEvents.retrieve('wev_1');
    expect(calls[0]?.headers['authorization']).toBe('Bearer tx_sandbox_aaaaaaaaaaaaaaaaaaaaaaaa');
  });
});
