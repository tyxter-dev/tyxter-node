import { describe, expect, it, vi } from 'vitest';
import { Tyxter } from '../client.js';
import { TyxterApiError } from '../api-error.js';

type CapturedCall = {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string | undefined;
};

const messageResponseFixture = {
  id: 'msg_1',
  object: 'message',
  status: 'queued',
  environment: 'sandbox',
  created_at: '2024-01-01T00:00:00Z',
  trace_id: 'trace_abc',
};

const quickstartFixture = {
  object: 'sandbox_quickstart',
  environment: {
    id: 'env_sandbox',
    kind: 'sandbox',
    project_id: 'prj_123',
  },
  api_key: {
    id: 'ak_123',
    key_prefix: 'tx_sandbox_abc...',
    scopes: ['sandbox:write', 'webhooks:read'],
    can_create_api_keys: false,
    api_key_creation: 'dashboard_or_api_keys_endpoint',
  },
  sender: {
    default_sender_id: null,
    phone_number: null,
    display_name: null,
    status: null,
    outbound_messages_require_sender: true,
    inbound_simulation_requires_sender: false,
  },
  webhooks: {
    active_endpoint_count: 0,
    listen_endpoint: '/v1/webhook-events/listen',
    retrieve_listen_event_endpoint: '/v1/webhook-events/listen/:outbox_event_id',
    inbound_event_type: 'message.received',
    supported_listen_event_types: ['message.received'],
    signing_headers: {
      id: 'tyxter-webhook-id',
      timestamp: 'tyxter-webhook-timestamp',
      signature: 'tyxter-webhook-signature',
    },
  },
  templates: {
    approved_template_count: 0,
    default_template: null,
  },
  capabilities: {
    simulate_inbound: true,
    listen_for_webhooks: true,
    send_outbound_messages: false,
    send_template_messages: false,
  },
  missing_scopes: ['messages:send'],
};

function withCapture(responseBody: unknown = messageResponseFixture) {
  const calls: CapturedCall[] = [];
  const fetchImpl = vi.fn(
    async (
      url: string,
      init: { method?: string; headers?: Record<string, string>; body?: string; signal?: unknown },
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

describe('SandboxResource', () => {
  it('GETs /v1/sandbox/quickstart', async () => {
    const { client, calls } = withCapture(quickstartFixture);
    const result = await client.sandbox.quickstart();

    expect(calls[0]?.url).toBe('http://test/v1/sandbox/quickstart');
    expect(calls[0]?.method).toBe('GET');
    expect(calls[0]?.body).toBeUndefined();
    expect(result.webhooks.inbound_event_type).toBe('message.received');
    expect(result.api_key.can_create_api_keys).toBe(false);
  });

  it('POSTs /v1/sandbox/inbound-messages', async () => {
    const { client, calls } = withCapture();
    await client.sandbox.inboundMessages.create({
      from: '+5511999990000',
      to: '+5511888880000',
      type: 'text',
      text: { body: 'hello' },
    });
    expect(calls[0]?.url).toBe('http://test/v1/sandbox/inbound-messages');
    expect(calls[0]?.method).toBe('POST');
  });

  it('POSTs an unsupported/unknown inbound simulation with its provider_type block (#686)', async () => {
    const { client, calls } = withCapture();
    await client.sandbox.inboundMessages.create({
      from: '+5511999990000',
      to: '+5511888880000',
      type: 'unsupported',
      unsupported: { provider_type: 'video_note' },
    });
    expect(calls[0]?.url).toBe('http://test/v1/sandbox/inbound-messages');
    expect(JSON.parse(calls[0]?.body ?? '{}')).toMatchObject({
      type: 'unsupported',
      unsupported: { provider_type: 'video_note' },
    });

    // The blocks are optional: the shortest rehearsal names only the type and
    // lets the simulator fill the descriptor.
    await client.sandbox.inboundMessages.create({
      from: '+5511999990000',
      to: '+5511888880000',
      type: 'unknown',
    });
    expect(JSON.parse(calls[1]?.body ?? '{}')).toMatchObject({ type: 'unknown' });
  });

  it('POSTs /v1/sandbox/templates/:id/status', async () => {
    const { client, calls } = withCapture({
      id: 'tmpl_1',
      object: 'template',
      status: 'rejected',
    });
    await client.sandbox.templates.setStatus(
      'tmpl 1',
      { status: 'rejected', rejection_reason: 'Policy mismatch' },
      { traceId: 'trace_template_status' },
    );
    expect(calls[0]?.url).toBe('http://test/v1/sandbox/templates/tmpl%201/status');
    expect(calls[0]?.method).toBe('POST');
    expect(calls[0]?.headers['tyxter-trace-id']).toBe('trace_template_status');
    expect(JSON.parse(calls[0]?.body ?? '{}')).toMatchObject({
      status: 'rejected',
      rejection_reason: 'Policy mismatch',
    });
  });

  it('POSTs /v1/sandbox/payments/:id/status with encoded id, body, and write headers', async () => {
    const { client, calls } = withCapture({ id: 'pay_1', object: 'payment', status: 'paid' });
    await client.sandbox.payments.setStatus(
      'pay 1',
      { status: 'paid' },
      { idempotencyKey: 'idem_pay_1', traceId: 'trace_pay_status' },
    );
    expect(calls[0]?.url).toBe('http://test/v1/sandbox/payments/pay%201/status');
    expect(calls[0]?.method).toBe('POST');
    expect(calls[0]?.headers['idempotency-key']).toBe('idem_pay_1');
    expect(calls[0]?.headers['tyxter-trace-id']).toBe('trace_pay_status');
    expect(JSON.parse(calls[0]?.body ?? '{}')).toMatchObject({ status: 'paid' });
  });

  it('does not send write headers on sandbox payment status when not provided', async () => {
    const { client, calls } = withCapture({ id: 'pay_1', object: 'payment', status: 'paid' });
    await client.sandbox.payments.setStatus('pay_1', { status: 'paid' });
    expect(calls[0]?.headers['idempotency-key']).toBeUndefined();
    expect(calls[0]?.headers['tyxter-trace-id']).toBeUndefined();
  });

  it('POSTs /v1/sandbox/llm/failure with body and write headers', async () => {
    const { client, calls } = withCapture({
      armed: true,
      failure: 'auth_failed',
      expires_at: null,
    });
    const result = await client.sandbox.llm.setFailure(
      { failure: 'auth_failed' },
      { idempotencyKey: 'idem_llm_failure_1', traceId: 'trace_llm_failure' },
    );
    expect(calls[0]?.url).toBe('http://test/v1/sandbox/llm/failure');
    expect(calls[0]?.method).toBe('POST');
    expect(calls[0]?.headers['idempotency-key']).toBe('idem_llm_failure_1');
    expect(calls[0]?.headers['tyxter-trace-id']).toBe('trace_llm_failure');
    expect(JSON.parse(calls[0]?.body ?? '{}')).toMatchObject({ failure: 'auth_failed' });
    expect(result).toMatchObject({ armed: true, failure: 'auth_failed', expires_at: null });
  });

  it('sends the ttl_seconds body field and no write headers when not provided', async () => {
    const { client, calls } = withCapture({
      armed: true,
      failure: 'timeout',
      expires_at: '2024-01-01T00:01:00Z',
    });
    await client.sandbox.llm.setFailure({ failure: 'timeout', ttl_seconds: 60 });
    expect(JSON.parse(calls[0]?.body ?? '{}')).toMatchObject({
      failure: 'timeout',
      ttl_seconds: 60,
    });
    expect(calls[0]?.headers['idempotency-key']).toBeUndefined();
    expect(calls[0]?.headers['tyxter-trace-id']).toBeUndefined();
  });

  it('throws TyxterApiError when arming with a production key is rejected', async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            error: {
              type: 'validation_error',
              code: 'sandbox_llm_failure_sandbox_only',
              message: 'Sandbox LLM failure fixtures can only be armed with a sandbox key.',
              request_id: 'req_llm_1',
              trace_id: 'trc_llm_1',
            },
          }),
          { status: 400, headers: { 'content-type': 'application/json' } },
        ),
    ) as unknown as typeof fetch;
    const client = new Tyxter({
      apiKey: 'tx_live_aaaaaaaaaaaaaaaaaaaaaaaa',
      baseUrl: 'http://test',
      fetch: fetchImpl,
    });

    await expect(
      client.sandbox.llm.setFailure({ failure: 'provider_down' }),
    ).rejects.toBeInstanceOf(TyxterApiError);
  });

  it('forwards idempotency-key header', async () => {
    const { client, calls } = withCapture();
    await client.sandbox.inboundMessages.create(
      { from: '+5511999990000', to: '+5511888880000', type: 'text' },
      { idempotencyKey: 'idem_sandbox_1' },
    );
    expect(calls[0]?.headers['idempotency-key']).toBe('idem_sandbox_1');
  });

  it('forwards tyxter-trace-id header', async () => {
    const { client, calls } = withCapture();
    await client.sandbox.inboundMessages.create(
      { from: '+5511999990000', to: '+5511888880000', type: 'text' },
      { traceId: 'trace_custom_1' },
    );
    expect(calls[0]?.headers['tyxter-trace-id']).toBe('trace_custom_1');
  });

  it('does not send idempotency-key when not provided', async () => {
    const { client, calls } = withCapture();
    await client.sandbox.inboundMessages.create({
      from: '+5511999990000',
      to: '+5511888880000',
      type: 'text',
    });
    expect(calls[0]?.headers['idempotency-key']).toBeUndefined();
  });

  it('sends the message body as JSON', async () => {
    const { client, calls } = withCapture();
    await client.sandbox.inboundMessages.create({
      from: '+5511999990000',
      to: '+5511888880000',
      type: 'text',
      text: { body: 'ping' },
    });
    const body = JSON.parse(calls[0]?.body ?? '{}') as Record<string, unknown>;
    expect(body).toMatchObject({ from: '+5511999990000', type: 'text' });
  });
});
