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
    id: 'fbr_1',
    object: 'feedback_receipt',
    received_at: '2026-06-22T12:00:00.000Z',
    redacted: true,
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
        status: 201,
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

describe('FeedbackResource', () => {
  it('GETs API-origin feedback with exact cursor query encoding', async () => {
    const { client, calls } = withCapture({
      object: 'list',
      data: [],
      has_more: false,
      next_cursor: null,
    });

    await client.feedback.list({ after: 'cursor+/=', limit: 20 });

    expect(calls[0]?.url).toBe('http://test/v1/feedback?after=cursor%2B%2F%3D&limit=20');
    expect(calls[0]?.method).toBe('GET');
    expect(calls[0]?.body).toBeUndefined();
  });

  it('GETs one feedback report without a request body or idempotency header', async () => {
    const { client, calls } = withCapture({
      id: 'fbr_1',
      object: 'feedback_report',
      status: 'open',
      message_excerpt: 'Webhook delivery failed.',
      created_at: '2026-08-26T12:00:00.000Z',
      latest_resolution: null,
    });

    const report = await client.feedback.get('fbr_1');

    expect(calls[0]?.url).toBe('http://test/v1/feedback/fbr_1');
    expect(calls[0]?.method).toBe('GET');
    expect(calls[0]?.body).toBeUndefined();
    expect(calls[0]?.headers['idempotency-key']).toBeUndefined();
    expect(report).toMatchObject({ object: 'feedback_report', id: 'fbr_1' });
  });

  it('POSTs /v1/feedback with the body and an explicit idempotency key', async () => {
    const { client, calls } = withCapture();
    const receipt = await client.feedback.create(
      { message: 'messages.send failed.', related_error: { code: 'internal_error' } },
      { idempotencyKey: 'idem_1', traceId: 'trc_1' },
    );
    expect(calls[0]?.url).toBe('http://test/v1/feedback');
    expect(calls[0]?.method).toBe('POST');
    expect(calls[0]?.headers['idempotency-key']).toBe('idem_1');
    expect(calls[0]?.headers['tyxter-trace-id']).toBe('trc_1');
    expect(JSON.parse(calls[0]?.body ?? '{}')).toEqual({
      message: 'messages.send failed.',
      related_error: { code: 'internal_error' },
    });
    expect(receipt).toMatchObject({ object: 'feedback_receipt', redacted: true });
  });

  it('auto-generates an idempotency key when omitted (endpoint requires one)', async () => {
    const { client, calls } = withCapture();
    await client.feedback.create({ message: 'hi' });
    expect(calls[0]?.headers['idempotency-key']).toBeTruthy();
    expect(typeof calls[0]?.headers['idempotency-key']).toBe('string');
  });

  it('does not auto-attach headers, env, or config beyond what was passed', async () => {
    const { client, calls } = withCapture();
    await client.feedback.create({ message: 'hi' });
    const body = JSON.parse(calls[0]?.body ?? '{}');
    expect(Object.keys(body)).toEqual(['message']);
  });
});
