import { describe, expect, it, vi } from 'vitest';
import { Tyxter } from '../client.js';

type CapturedCall = {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string | undefined;
};

const phoneFixture = {
  id: 'pn_test_1',
  object: 'phone_number' as const,
  source: 'byon' as const,
  status: 'active' as const,
  environment: 'sandbox' as const,
  display_name: null,
  ddd: '11',
  phone: '+5511999999999',
  provider_number_id: null,
  meta_phone_number_id: 'mpn_1',
  waba_id: null,
  quality_rating: 'unknown' as const,
  messaging_tier: 'unknown' as const,
  messaging_limit_tier: null,
  meta_throughput_tier: null,
  meta_quality_rating: null,
  verified_name: 'Sandbox support',
  pending_name_review: null,
  name_review: null,
  meta_health_synced_at: '2026-08-30T10:00:00.000Z',
  current_24h_unique_recipients: 0,
  remaining_messaging_allowance_estimate: null,
  verification_code: null,
  verification_code_received_at: null,
  monthly_fee_brl: null,
  error_code: null,
  error_message: null,
  created_at: '2026-04-27T10:00:00Z',
  updated_at: '2026-04-27T10:00:00Z',
  activated_at: '2026-04-27T10:01:00Z',
  released_at: null,
};

function withCapture(responseBody: unknown = phoneFixture) {
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

describe('PhoneNumbersResource', () => {
  it('list GETs /v1/phone-numbers with optional cursor query', async () => {
    const { client, calls } = withCapture({
      object: 'list',
      data: [phoneFixture],
      has_more: false,
      next_cursor: null,
    });
    await client.phoneNumbers.list({ limit: 10 });
    expect(calls[0]?.url).toBe('http://test/v1/phone-numbers?limit=10');
    expect(calls[0]?.method).toBe('GET');
  });

  it('retrieve GETs /v1/phone-numbers/:id', async () => {
    const { client, calls } = withCapture();
    await client.phoneNumbers.retrieve('pn_test_1');
    expect(calls[0]?.url).toBe('http://test/v1/phone-numbers/pn_test_1');
    expect(calls[0]?.method).toBe('GET');
  });

  it('preserves the canonical pending Meta-name review observation on reads', async () => {
    const { client } = withCapture({
      ...phoneFixture,
      pending_name_review: {
        requested_name: 'Tyxter Support',
        status: 'META_FUTURE_PENDING_VALUE',
        observed_at: '2026-09-01T10:00:00.000Z',
      },
    });

    const phone = await client.phoneNumbers.retrieve('pn_test_1');

    expect(phone.pending_name_review).toEqual({
      requested_name: 'Tyxter Support',
      status: 'META_FUTURE_PENDING_VALUE',
      observed_at: '2026-09-01T10:00:00.000Z',
    });
  });

  it('connect POSTs /v1/phone-numbers/connect with idempotency-key', async () => {
    const { client, calls } = withCapture();
    await client.phoneNumbers.connect(
      { phone: '+5511999999999', meta_phone_number_id: 'mpn_1' },
      { idempotencyKey: 'idem_connect_1' },
    );
    expect(calls[0]?.url).toBe('http://test/v1/phone-numbers/connect');
    expect(calls[0]?.method).toBe('POST');
    expect(calls[0]?.headers['idempotency-key']).toBe('idem_connect_1');
    const body = JSON.parse(calls[0]?.body ?? '{}') as Record<string, unknown>;
    expect(body.phone).toBe('+5511999999999');
    expect(body.meta_phone_number_id).toBe('mpn_1');
  });

  it('provision POSTs /v1/phone-numbers/provision', async () => {
    const { client, calls } = withCapture();
    await client.phoneNumbers.provision({ ddd: '11' });
    expect(calls[0]?.url).toBe('http://test/v1/phone-numbers/provision');
    expect(calls[0]?.method).toBe('POST');
  });

  it('disconnect DELETEs /v1/phone-numbers/:id', async () => {
    const { client, calls } = withCapture();
    await client.phoneNumbers.disconnect('pn_test_1');
    expect(calls[0]?.url).toBe('http://test/v1/phone-numbers/pn_test_1');
    expect(calls[0]?.method).toBe('DELETE');
  });

  it('availableRegions GETs /v1/phone-numbers/available-regions', async () => {
    const { client, calls } = withCapture({
      object: 'list',
      data: [{ ddd: '11', country: 'BR', monthly_fee_brl: '29.90' }],
    });
    await client.phoneNumbers.availableRegions();
    expect(calls[0]?.url).toBe('http://test/v1/phone-numbers/available-regions');
    expect(calls[0]?.method).toBe('GET');
  });

  it('list forwards the optional status filter', async () => {
    const { client, calls } = withCapture({ object: 'list', data: [] });
    await client.phoneNumbers.list({ status: 'active', limit: 5 });
    expect(calls[0]?.url).toBe('http://test/v1/phone-numbers?status=active&limit=5');
  });

  it('release POSTs /v1/phone-numbers/:id/release with idempotency-key', async () => {
    const { client, calls } = withCapture();
    await client.phoneNumbers.release('pn_test_1', { idempotencyKey: 'idem-release' });
    expect(calls[0]?.url).toBe('http://test/v1/phone-numbers/pn_test_1/release');
    expect(calls[0]?.method).toBe('POST');
    expect(calls[0]?.headers['idempotency-key']).toBe('idem-release');
  });

  it('transfer POSTs /v1/phone-numbers/:id/transfer with body and idempotency-key', async () => {
    const { client, calls } = withCapture();
    await client.phoneNumbers.transfer(
      'pn_test_1',
      {
        source_project_id: 'prj_a',
        source_environment_id: 'env_a',
        target_project_id: 'prj_b',
        target_environment_id: 'env_b',
        confirm_phone_number_id: 'pn_test_1',
      },
      { idempotencyKey: 'idem-transfer' },
    );
    expect(calls[0]?.url).toBe('http://test/v1/phone-numbers/pn_test_1/transfer');
    expect(calls[0]?.method).toBe('POST');
    expect(calls[0]?.headers['idempotency-key']).toBe('idem-transfer');
    expect(JSON.parse(calls[0]?.body ?? '{}')).toMatchObject({
      confirm_phone_number_id: 'pn_test_1',
      target_environment_id: 'env_b',
    });
  });
});
