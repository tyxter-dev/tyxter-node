import { describe, expect, it, vi } from 'vitest';

import { Tyxter } from '../client.js';

type CapturedCall = {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
};

function withCapture(responseBody: unknown = paymentResponse()) {
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

describe('PaymentsResource', () => {
  it('POSTs payment create payloads and forwards write headers', async () => {
    const { client, calls } = withCapture();

    await client.payments.create(
      {
        amount_brl_centavos: 12990,
        description: 'Order #123',
        customer_name: 'Ana Silva',
        customer_tax_id: '12345678901',
        customer_phone: '+5511999999999',
        customer_email: 'ana@example.com',
        external_reference: 'ord_123',
        metadata: { cart_id: 'cart_123' },
      },
      { idempotencyKey: 'idem_payment', traceId: 'trc_payment' },
    );

    expect(calls[0]?.url).toBe('http://test/v1/payments');
    expect(calls[0]?.method).toBe('POST');
    expect(calls[0]?.headers['idempotency-key']).toBe('idem_payment');
    expect(calls[0]?.headers['tyxter-trace-id']).toBe('trc_payment');
    expect(JSON.parse(calls[0]?.body ?? '{}')).toMatchObject({
      amount_brl_centavos: 12990,
      customer_name: 'Ana Silva',
      customer_tax_id: '12345678901',
      external_reference: 'ord_123',
    });
  });

  it('GETs /v1/payments with cursor and status filters', async () => {
    const { client, calls } = withCapture({
      object: 'list',
      data: [],
      has_more: false,
      next_cursor: null,
    });

    await client.payments.list({
      limit: 25,
      starting_after: 'pay_1',
      status: 'link_generated',
    });

    expect(calls[0]?.url).toBe(
      'http://test/v1/payments?limit=25&starting_after=pay_1&status=link_generated',
    );
    expect(calls[0]?.method).toBe('GET');
  });

  it('GETs /v1/payments/:id for retrieve', async () => {
    const { client, calls } = withCapture();

    await client.payments.retrieve('pay_123');

    expect(calls[0]?.url).toBe('http://test/v1/payments/pay_123');
    expect(calls[0]?.method).toBe('GET');
  });

  it('queues cancellation with an empty body and retains the current response and write headers', async () => {
    const { client, calls } = withCapture();
    const current = await client.payments.cancel('pay_123', {
      idempotencyKey: 'cancel_key',
      traceId: 'trc_cancel',
    });
    expect(calls[0]).toMatchObject({
      url: 'http://test/v1/payments/pay_123/cancel',
      method: 'POST',
      body: '{}',
      headers: { 'idempotency-key': 'cancel_key', 'tyxter-trace-id': 'trc_cancel' },
    });
    expect(current.status).toBe('link_generated');
  });

  it('POSTs /v1/payments/:id/request-approval with optional body', async () => {
    const { client, calls } = withCapture(paymentResponse({ status: 'approval_requested' }));

    await client.payments.requestApproval(
      'pay_123',
      { note: 'Send payer back to checkout', metadata: { channel: 'whatsapp' } },
      { idempotencyKey: 'idem_approval' },
    );

    expect(calls[0]?.url).toBe('http://test/v1/payments/pay_123/request-approval');
    expect(calls[0]?.method).toBe('POST');
    expect(calls[0]?.headers['idempotency-key']).toBe('idem_approval');
    expect(JSON.parse(calls[0]?.body ?? '{}')).toEqual({
      note: 'Send payer back to checkout',
      metadata: { channel: 'whatsapp' },
    });
  });
});

function paymentResponse(overrides: Record<string, unknown> = {}) {
  return {
    id: 'pay_123',
    object: 'payment_request',
    status: 'link_generated',
    environment: 'sandbox',
    amount_brl: '129.90',
    currency: 'BRL',
    description: 'Order #123',
    customer_name: 'Ana Silva',
    customer_tax_id: '12345678901',
    customer_phone: '+5511999999999',
    customer_email: 'ana@example.com',
    external_reference: 'ord_123',
    metadata: { cart_id: 'cart_123' },
    payment_link_url: 'https://pay.example.com/pay_123',
    pix_copy_paste: '000201010212...',
    pix_qr_code_base64: 'iVBORw0KGgo=',
    provider: 'abacate_pay',
    provider_connection_id: 'pc_123',
    provider_payment_id: 'abacate_bill_123',
    provider_approval_id: null,
    provider_metadata: { pix_copy_paste: '000201010212...' },
    trace_id: 'trc_123',
    created_at: '2026-06-03T12:00:00.000Z',
    updated_at: '2026-06-03T12:00:00.000Z',
    link_generated_at: '2026-06-03T12:00:00.000Z',
    approval_requested_at: null,
    approved_at: null,
    paid_at: null,
    failed_at: null,
    expired_at: null,
    cancelled_at: null,
    ...overrides,
  };
}
