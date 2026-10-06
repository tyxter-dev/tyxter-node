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

describe('ProviderConnectionsResource', () => {
  it('GETs /v1/provider-connections with cursor params', async () => {
    const { client, calls } = withCapture({
      object: 'list',
      data: [],
      has_more: false,
      next_cursor: null,
    });

    await client.providerConnections.list({ limit: 10, starting_after: 'cur_1' });

    expect(calls[0]?.url).toBe('http://test/v1/provider-connections?limit=10&starting_after=cur_1');
    expect(calls[0]?.method).toBe('GET');
  });

  it('GETs aggregate provider connection readiness', async () => {
    const { client, calls } = withCapture({
      object: 'provider_connection_status',
      environment: 'production',
      channels: {
        whatsapp: { ready: true, status: 'connected', connection_id: 'pc_1', reason: null },
        instagram: { ready: false, status: 'missing', connection_id: null, reason: null },
        payments: {
          ready: false,
          status: 'selection_required',
          active_connection_id: null,
          active_mode: null,
          reason: 'selection_required',
        },
        agentic_payments: {
          ready: false,
          status: 'missing',
          connection_id: null,
          reason: null,
        },
      },
    });

    const result = await client.providerConnections.status();

    expect(calls[0]?.url).toBe('http://test/v1/provider-connections/status');
    expect(calls[0]?.method).toBe('GET');
    expect(result.object).toBe('provider_connection_status');
    expect(result.channels.payments.active_mode).toBeNull();
  });

  it('GETs Meta onboarding config through the nested meta helper', async () => {
    const { client, calls } = withCapture({
      object: 'meta_onboarding_config',
      mode: 'embedded_signup',
    });

    await client.providerConnections.meta.onboarding();

    expect(calls[0]?.url).toBe('http://test/v1/provider-connections/meta/onboarding');
    expect(calls[0]?.method).toBe('GET');
  });

  it('registers Meta credentials with optional idempotency key', async () => {
    const { client, calls } = withCapture({ object: 'provider_connection', id: 'pc_1' });

    await client.providerConnections.meta.register(
      {
        display_name: 'Acme WABA',
        waba_id: 'waba_1',
        phone_number_id: 'phone_1',
        access_token: 'EAAB-token',
      },
      'idem_register',
    );

    expect(calls[0]?.url).toBe('http://test/v1/provider-connections/meta');
    expect(calls[0]?.method).toBe('POST');
    expect(calls[0]?.headers['Idempotency-Key']).toBe('idem_register');
    expect(JSON.parse(calls[0]?.body ?? '{}')).toEqual({
      display_name: 'Acme WABA',
      waba_id: 'waba_1',
      phone_number_id: 'phone_1',
      access_token: 'EAAB-token',
    });
  });

  it('exchanges Meta OAuth code and rotates tokens', async () => {
    const { client, calls } = withCapture({ object: 'provider_connection', id: 'pc_1' });

    await client.providerConnections.meta.exchangeOAuth(
      { code: 'code_1', waba_id: 'waba_1', phone_number_id: 'phone_1' },
      'idem_oauth',
    );
    await client.providerConnections.rotateToken(
      'pc_1',
      { access_token: 'EAAB-new-token' },
      'idem_rotate',
    );

    expect(calls.map((call) => `${call.method} ${call.url}`)).toEqual([
      'POST http://test/v1/provider-connections/meta/oauth',
      'POST http://test/v1/provider-connections/pc_1/rotate',
    ]);
    expect(calls[0]?.headers['Idempotency-Key']).toBe('idem_oauth');
    expect(calls[1]?.headers['Idempotency-Key']).toBe('idem_rotate');
  });

  it('serializes a code-only Meta OAuth exchange without synthesizing a WABA', async () => {
    const { client, calls } = withCapture({ object: 'provider_connection', id: 'pc_1' });

    await client.providerConnections.meta.exchangeOAuth({ code: 'code_only' }, 'idem_code_only');

    expect(calls[0]).toMatchObject({
      method: 'POST',
      url: 'http://test/v1/provider-connections/meta/oauth',
      headers: { 'Idempotency-Key': 'idem_code_only' },
    });
    expect(JSON.parse(calls[0]?.body ?? '{}')).toEqual({ code: 'code_only' });
  });

  it('registers, rotates, refreshes, and lists Salvy through the nested helper', async () => {
    const { client, calls } = withCapture({ object: 'provider_connection', id: 'pc_salvy' });

    await client.providerConnections.salvy.register(
      {
        api_key: 'salvy-secret',
        continuation_terms_version: 'salvy_byok_v1',
      },
      'idem_salvy_register',
    );
    await client.providerConnections.salvy.rotate(
      'pc_salvy',
      { api_key: 'salvy-replacement' },
      'idem_salvy_rotate',
    );
    await client.providerConnections.salvy.refreshDiscovery('pc_salvy', 'idem_salvy_discovery');
    await client.providerConnections.salvy.listNumbers('pc_salvy', {
      limit: 10,
      starting_after: 'cursor_1',
    });

    expect(calls.map((call) => `${call.method} ${call.url}`)).toEqual([
      'POST http://test/v1/provider-connections/salvy',
      'POST http://test/v1/provider-connections/pc_salvy/salvy/rotate',
      'POST http://test/v1/provider-connections/pc_salvy/salvy/discovery',
      'GET http://test/v1/provider-connections/pc_salvy/salvy/numbers?limit=10&starting_after=cursor_1',
    ]);
    expect(calls[0]?.headers['Idempotency-Key']).toBe('idem_salvy_register');
    expect(calls[1]?.headers['Idempotency-Key']).toBe('idem_salvy_rotate');
    expect(calls[2]?.headers['Idempotency-Key']).toBe('idem_salvy_discovery');
    expect(JSON.parse(calls[0]?.body ?? '{}')).toEqual({
      api_key: 'salvy-secret',
      continuation_terms_version: 'salvy_byok_v1',
    });
    expect(JSON.parse(calls[2]?.body ?? '{}')).toEqual({});
  });

  it('completes a pending Meta registration without a request body', async () => {
    const { client, calls } = withCapture({
      object: 'provider_connection',
      id: 'pc_1',
      status: 'connected',
    });

    const result = await client.providerConnections.meta.completeRegistration(
      'pc_1',
      'idem_complete',
    );

    expect(calls[0]?.method).toBe('POST');
    expect(calls[0]?.url).toBe(
      'http://test/v1/provider-connections/pc_1/meta/complete-registration',
    );
    expect(calls[0]?.headers['Idempotency-Key']).toBe('idem_complete');
    // The credentials already live on the connection: sending a body would
    // advertise a payload the route does not accept.
    expect(calls[0]?.body).toBeUndefined();
    expect(result).toMatchObject({ id: 'pc_1', status: 'connected' });
  });

  it('retrieves and deletes a connection by id (dashboardless lifecycle)', async () => {
    const { client, calls } = withCapture({ object: 'provider_connection', id: 'pc_1' });

    await client.providerConnections.retrieve('pc_1');
    await client.providerConnections.delete('pc_1');

    expect(calls.map((call) => `${call.method} ${call.url}`)).toEqual([
      'GET http://test/v1/provider-connections/pc_1',
      'DELETE http://test/v1/provider-connections/pc_1',
    ]);
  });
});
