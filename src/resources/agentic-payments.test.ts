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

describe('AgenticPaymentsResource', () => {
  it('GETs /v1/agentic/banks with search and limit', async () => {
    const { client, calls } = withCapture({
      object: 'list',
      data: [],
      has_more: false,
      next_cursor: null,
    });

    await client.agenticPayments.listBanks({ search: 'itau', limit: 20 });

    expect(calls[0]?.url).toBe('http://test/v1/agentic/banks?search=itau&limit=20');
    expect(calls[0]?.method).toBe('GET');
  });

  it('POSTs /v1/agentic/authorizations and forwards write headers', async () => {
    const { client, calls } = withCapture();

    await client.agenticPayments.createAuthorization(
      {
        customer_tax_id: '12345678901',
        agent_reason: 'Recurring class payments',
        participant_id: 'part_123',
      },
      { idempotencyKey: 'idem_auth', traceId: 'trc_auth' },
    );

    expect(calls[0]?.url).toBe('http://test/v1/agentic/authorizations');
    expect(calls[0]?.method).toBe('POST');
    expect(calls[0]?.headers['idempotency-key']).toBe('idem_auth');
    expect(calls[0]?.headers['tyxter-trace-id']).toBe('trc_auth');
    expect(JSON.parse(calls[0]?.body ?? '{}')).toMatchObject({
      customer_tax_id: '12345678901',
      agent_reason: 'Recurring class payments',
    });
  });

  it('GETs /v1/agentic/authorizations with filters', async () => {
    const { client, calls } = withCapture({
      object: 'list',
      data: [],
      has_more: false,
      next_cursor: null,
    });

    await client.agenticPayments.listAuthorizations({
      limit: 25,
      starting_after: 'aauth_1',
      status: 'completed',
    });

    expect(calls[0]?.url).toBe(
      'http://test/v1/agentic/authorizations?limit=25&starting_after=aauth_1&status=completed',
    );
    expect(calls[0]?.method).toBe('GET');
  });

  it('GETs /v1/agentic/authorizations/:id for retrieve', async () => {
    const { client, calls } = withCapture();

    await client.agenticPayments.retrieveAuthorization('aauth_123');

    expect(calls[0]?.url).toBe('http://test/v1/agentic/authorizations/aauth_123');
    expect(calls[0]?.method).toBe('GET');
  });

  it('POSTs /v1/agentic/authorizations/:id/revoke with write headers', async () => {
    const { client, calls } = withCapture();

    await client.agenticPayments.revokeAuthorization('aauth_123', {
      idempotencyKey: 'idem_revoke',
    });

    expect(calls[0]?.url).toBe('http://test/v1/agentic/authorizations/aauth_123/revoke');
    expect(calls[0]?.method).toBe('POST');
    expect(calls[0]?.headers['idempotency-key']).toBe('idem_revoke');
  });

  it('POSTs /v1/agentic/payments and forwards write headers', async () => {
    const { client, calls } = withCapture();

    await client.agenticPayments.createPayment(
      {
        amount_brl_centavos: 5000,
        method: 'PIX_DICT',
        customer_tax_id: '12345678901',
        agent_reason: 'Class booking',
        pix_key: 'merchant@example.com',
      },
      { idempotencyKey: 'idem_pay', traceId: 'trc_pay' },
    );

    expect(calls[0]?.url).toBe('http://test/v1/agentic/payments');
    expect(calls[0]?.method).toBe('POST');
    expect(calls[0]?.headers['idempotency-key']).toBe('idem_pay');
    expect(calls[0]?.headers['tyxter-trace-id']).toBe('trc_pay');
    expect(JSON.parse(calls[0]?.body ?? '{}')).toMatchObject({
      amount_brl_centavos: 5000,
      method: 'PIX_DICT',
    });
  });

  it('GETs /v1/agentic/payments with filters', async () => {
    const { client, calls } = withCapture({
      object: 'list',
      data: [],
      has_more: false,
      next_cursor: null,
    });

    await client.agenticPayments.listPayments({
      limit: 10,
      status: 'paid',
    });

    expect(calls[0]?.url).toBe('http://test/v1/agentic/payments?limit=10&status=paid');
    expect(calls[0]?.method).toBe('GET');
  });

  it('GETs /v1/agentic/payments/:id for retrieve', async () => {
    const { client, calls } = withCapture();

    await client.agenticPayments.retrievePayment('apay_123');

    expect(calls[0]?.url).toBe('http://test/v1/agentic/payments/apay_123');
    expect(calls[0]?.method).toBe('GET');
  });

  it('POSTs /v1/agentic/payments/:id/cancel with write headers', async () => {
    const { client, calls } = withCapture();

    await client.agenticPayments.cancelPayment('apay_123', { idempotencyKey: 'idem_cancel' });

    expect(calls[0]?.url).toBe('http://test/v1/agentic/payments/apay_123/cancel');
    expect(calls[0]?.method).toBe('POST');
    expect(calls[0]?.headers['idempotency-key']).toBe('idem_cancel');
  });
});
