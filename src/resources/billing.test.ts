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
    apiKey: 'tx_sandbox_aaaaaaaaaaaaaaaaaaaaaaaa',
    baseUrl: 'http://test',
    fetch: fetchImpl,
  });
  return { client, calls };
}

describe('BillingResource', () => {
  it('GETs /v1/billing/balance', async () => {
    const body = {
      object: 'credit_balance',
      production_blocked: false,
      organization_id: 'org_1',
      balance_brl: '42.5000',
      currency: 'brl',
      updated_at: '2026-04-24T12:00:00Z',
    };
    const { client, calls } = withCapture(body);
    const result = await client.billing.balance();
    expect(result).toEqual(body);
    expect(calls[0]?.url).toBe('http://test/v1/billing/balance');
    expect(calls[0]?.method).toBe('GET');
    expect(calls[0]?.headers['authorization']).toContain('tx_sandbox_');
  });

  it('GETs /v1/rate-cards/current', async () => {
    const { client, calls } = withCapture({
      id: 'rc_1',
      object: 'rate_card',
      name: 'Default BRL',
      currency: 'brl',
      effective_from: '2026-01-01T00:00:00Z',
      effective_to: null,
      entries: [],
    });
    await client.billing.currentRateCard();
    expect(calls[0]?.url).toBe('http://test/v1/rate-cards/current');
  });

  it('GETs /v1/rate-cards history through BillingResource.rateCards', async () => {
    const { client, calls } = withCapture({
      object: 'list',
      data: [],
      has_more: false,
      next_cursor: null,
    });

    await client.billing.rateCards.list({ limit: 5, starting_after: 'cursor_1' });

    expect(calls[0]?.url).toBe('http://test/v1/rate-cards?limit=5&starting_after=cursor_1');
    expect(calls[0]?.method).toBe('GET');
  });

  it('GETs /v1/billing/ledger with query params', async () => {
    const { client, calls } = withCapture({
      object: 'list',
      data: [],
      has_more: false,
      next_cursor: null,
    });
    await client.billing.listLedger({
      limit: 10,
      starting_after: 'cursor_1',
      environment: 'production',
      source_type: 'usage',
    });
    expect(calls[0]?.url).toBe(
      'http://test/v1/billing/ledger?limit=10&starting_after=cursor_1&environment=production&source_type=usage',
    );
  });

  it('GETs /v1/billing/ledger without query params when none given', async () => {
    const { client, calls } = withCapture({
      object: 'list',
      data: [],
      has_more: false,
      next_cursor: null,
    });
    await client.billing.listLedger();
    expect(calls[0]?.url).toBe('http://test/v1/billing/ledger');
  });

  it('lists and retrieves scoped phone renewals through BillingResource.phoneRenewals', async () => {
    const { client, calls } = withCapture({
      object: 'list',
      data: [],
      has_more: false,
      next_cursor: null,
    });

    await client.billing.phoneRenewals.list({
      limit: 10,
      starting_after: 'cur_renewal_1',
      status: 'funding_required',
    });
    await client.billing.phoneRenewals.retrieve('prc_1');

    expect(calls.map((call) => `${call.method} ${call.url}`)).toEqual([
      'GET http://test/v1/billing/phone-renewals?limit=10&starting_after=cur_renewal_1&status=funding_required',
      'GET http://test/v1/billing/phone-renewals/prc_1',
    ]);
  });

  it('lists management coverage through BillingResource.phoneManagement', async () => {
    const { client, calls } = withCapture({
      object: 'list',
      data: [],
      has_more: false,
      next_cursor: null,
      summary: { retained_count: 0, monthly_total_brl: '0', next_charge_at: null },
    });
    await client.billing.phoneManagement.list({ limit: 10, starting_after: 'cur_management_1' });
    expect(calls[0]?.url).toBe(
      'http://test/v1/billing/phone-management?limit=10&starting_after=cur_management_1',
    );
  });

  it('GETs /v1/billing/packages through BillingResource.packages', async () => {
    const { client, calls } = withCapture({
      object: 'list',
      data: [],
      has_more: false,
      next_cursor: null,
      available_packages: [],
    });

    await client.billing.packages.list({ limit: 10, status: 'succeeded' });

    expect(calls[0]?.url).toBe('http://test/v1/billing/packages?limit=10&status=succeeded');
    expect(calls[0]?.method).toBe('GET');
  });

  it('POSTs /v1/billing/packages/purchase with optional idempotency key', async () => {
    const { client, calls } = withCapture({
      id: 'topup_pkg_1',
      object: 'credit_topup',
      kind: 'package',
      status: 'pending',
      amount_brl: '500.00',
      payment_method: 'card',
      package_code: 'starter_30k',
      quota_messages: 30000,
      quota_remaining: 30000,
      stripe_payment_intent_id: 'pi_1',
      stripe_client_secret: 'pi_1_secret',
      created_at: '2026-05-05T12:00:00Z',
      completed_at: null,
    });

    await client.billing.packages.purchase(
      { package_code: 'starter_30k', payment_method: 'card' },
      'idem_1',
    );

    expect(calls[0]?.url).toBe('http://test/v1/billing/packages/purchase');
    expect(calls[0]?.method).toBe('POST');
    expect(calls[0]?.headers['Idempotency-Key']).toBe('idem_1');
    expect(JSON.parse(calls[0]?.body ?? '{}')).toEqual({
      package_code: 'starter_30k',
      payment_method: 'card',
    });
  });

  it('manages saved payment methods through nested resource helpers', async () => {
    const { client, calls } = withCapture({ object: 'list', data: [] });

    await client.billing.paymentMethods.createSetupIntent('idem_setup');
    await client.billing.paymentMethods.list();
    await client.billing.paymentMethods.save(
      { stripe_payment_method_id: 'pm_123', set_default: true },
      'idem_save',
    );
    await client.billing.paymentMethods.setDefault('pm_saved_1', 'idem_default');
    await client.billing.paymentMethods.delete('pm_saved_1', 'idem_delete');

    expect(calls.map((call) => `${call.method} ${call.url}`)).toEqual([
      'POST http://test/v1/billing/payment-methods/setup-intent',
      'GET http://test/v1/billing/payment-methods',
      'POST http://test/v1/billing/payment-methods',
      'POST http://test/v1/billing/payment-methods/pm_saved_1/default',
      'DELETE http://test/v1/billing/payment-methods/pm_saved_1',
    ]);
    expect(calls[0]?.headers['Idempotency-Key']).toBe('idem_setup');
    expect(JSON.parse(calls[2]?.body ?? '{}')).toEqual({
      stripe_payment_method_id: 'pm_123',
      set_default: true,
    });
    expect(calls[3]?.headers['Idempotency-Key']).toBe('idem_default');
    expect(calls[4]?.headers['Idempotency-Key']).toBe('idem_delete');
  });

  it('reads and updates auto top-up config through BillingResource.autoTopup', async () => {
    const { client, calls } = withCapture({
      object: 'auto_topup_config',
      enabled: false,
      threshold_brl: '50.00',
      amount_brl: '200.00',
      payment_method_id: null,
      last_triggered_at: null,
      updated_at: null,
    });

    await client.billing.autoTopup.retrieve();
    await client.billing.autoTopup.update(
      {
        enabled: true,
        threshold_brl: '50.00',
        amount_brl: '200.00',
        payment_method_id: 'pm_saved_1',
      },
      'idem_auto',
    );

    expect(calls.map((call) => `${call.method} ${call.url}`)).toEqual([
      'GET http://test/v1/billing/auto-topup',
      'PUT http://test/v1/billing/auto-topup',
    ]);
    expect(calls[1]?.headers['Idempotency-Key']).toBe('idem_auto');
    expect(JSON.parse(calls[1]?.body ?? '{}')).toEqual({
      enabled: true,
      threshold_brl: '50.00',
      amount_brl: '200.00',
      payment_method_id: 'pm_saved_1',
    });
  });

  it('lists and downloads invoices through BillingResource.invoices', async () => {
    const { client, calls } = withCapture({ object: 'list', data: [] });

    await client.billing.invoices.list();
    await client.billing.invoices.list({ limit: 5, project_id: 'prj_1' });
    await client.billing.invoices.download('inv_1');

    expect(calls.map((call) => `${call.method} ${call.url}`)).toEqual([
      'GET http://test/v1/invoices',
      'GET http://test/v1/invoices?limit=5&project_id=prj_1',
      'GET http://test/v1/invoices/inv_1/download',
    ]);
  });
});
