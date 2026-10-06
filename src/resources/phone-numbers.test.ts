import { describe, expect, it, vi } from 'vitest';
import type { PhoneRenewalSummary } from '../contracts.js';
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

  it('imports a selected Salvy resource with its required idempotency key', async () => {
    const { client, calls } = withCapture({
      ...phoneFixture,
      salvy_management: null,
      renewal: null,
    });
    await client.phoneNumbers.importSalvy(
      {
        provider_connection_id: 'pc_salvy_1',
        provider_number_id: 'salvy_number_1',
        continuation_terms_version: 'salvy_byok_v1',
      },
      'idem_import_salvy_1',
    );
    expect(calls[0]?.url).toBe('http://test/v1/phone-numbers/import-salvy');
    expect(calls[0]?.method).toBe('POST');
    expect(calls[0]?.headers['Idempotency-Key']).toBe('idem_import_salvy_1');
  });

  it('queues complete Salvy registration with the selected Meta id and required idempotency key', async () => {
    const { client, calls } = withCapture({ ...phoneFixture, renewal: null });
    await client.phoneNumbers.completeSalvyRegistration(
      'pn_test_1',
      { meta_phone_number_id: 'meta_phone_own_waba' },
      'idem_complete_salvy_1',
    );
    expect(calls[0]?.url).toBe(
      'http://test/v1/phone-numbers/pn_test_1/salvy/complete-registration',
    );
    expect(calls[0]?.method).toBe('POST');
    expect(calls[0]?.headers['Idempotency-Key']).toBe('idem_complete_salvy_1');
    expect(JSON.parse(calls[0]?.body ?? '{}')).toEqual({
      meta_phone_number_id: 'meta_phone_own_waba',
    });
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

  it('convertToByon POSTs the empty mutation with its required idempotency key', async () => {
    const { client, calls } = withCapture();
    await client.phoneNumbers.convertToByon('pn_test_1', 'idem-convert-1');
    expect(calls[0]?.url).toBe('http://test/v1/phone-numbers/pn_test_1/convert-to-byon');
    expect(calls[0]?.method).toBe('POST');
    expect(calls[0]?.headers['Idempotency-Key']).toBe('idem-convert-1');
    expect(JSON.parse(calls[0]?.body ?? '{}')).toEqual({});
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

function risk(overrides: Partial<PhoneRenewalSummary> = {}): PhoneRenewalSummary {
  return {
    state: 'at_risk',
    reason_codes: ['insufficient_credit'],
    cycle_id: 'prc_1',
    amount_brl: '25.0000',
    currency: 'brl',
    next_renewal_at: '2026-10-01T00:00:00.000Z',
    release_cutoff_at: '2026-09-30T23:00:00.000Z',
    renewal_warning_48h_at: '2026-09-29T00:00:00.000Z',
    renewal_warning_24h_at: '2026-09-30T00:00:00.000Z',
    grace_selected_at: null,
    grace_ends_at: null,
    automatic_release_enabled: false,
    release_requested_at: null,
    recommended_action: 'add_credit_or_enable_auto_topup',
    evaluated_at: '2026-09-28T00:00:00.000Z',
    provider_evidence_observed_at: '2026-09-27T00:00:00.000Z',
    ...overrides,
  };
}

describe('phone renewal read compatibility', () => {
  it('traverses API-only scoped cursor pages and preserves current risk, unknown and null summaries on refresh', async () => {
    const active = { ...phoneFixture, source: 'salvy', environment: 'production', renewal: risk() };
    const unknown = {
      ...active,
      id: 'pn_unknown',
      renewal: risk({
        state: 'unknown',
        cycle_id: null,
        next_renewal_at: null,
        reason_codes: ['provider_timing_unknown', 'provider_state_unknown', 'cycle_not_ready'],
        recommended_action: null,
      }),
    };
    const bodies = [
      { object: 'list', data: [active], has_more: true, next_cursor: 'cursor_next' },
      {
        object: 'list',
        data: [unknown, { ...phoneFixture, id: 'pn_byon', renewal: null }],
        has_more: false,
        next_cursor: null,
      },
      active,
    ];
    const urls: string[] = [];
    const fetchImpl: typeof fetch = async (input) => {
      urls.push(String(input));
      return new Response(JSON.stringify(bodies.shift()), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    };
    const client = new Tyxter({
      apiKey: 'tx_live_fixture',
      baseUrl: 'http://test',
      fetch: fetchImpl,
    });
    const first = await client.phoneNumbers.list({ limit: 1 });
    const second = await client.phoneNumbers.list({ starting_after: first.next_cursor!, limit: 1 });
    expect(urls[1]).toContain('starting_after=cursor_next');
    expect([...first.data, ...second.data].map((phone) => phone.renewal?.state ?? null)).toEqual([
      'at_risk',
      'unknown',
      null,
    ]);
    expect((await client.phoneNumbers.retrieve(active.id)).renewal).toEqual(active.renewal);
    expect(urls).toHaveLength(3);
  });
  it('retains an older cached provision result without inventing renewal or warnings', async () => {
    const { client } = withCapture();
    const result = await client.phoneNumbers.provision(
      { ddd: '11' },
      { idempotencyKey: 'legacy-replay' },
    );
    expect(result).toEqual(phoneFixture);
    expect(result).not.toHaveProperty('renewal');
    expect(result).not.toHaveProperty('warnings');
  });
});
