import { describe, expect, it, vi } from 'vitest';
import { Tyxter } from '../client.js';

type CapturedCall = {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string | undefined;
};

function withCapture(
  responseBody: unknown = { object: 'list', data: [], imported: 0, skipped: 0 },
) {
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

describe('ContactsResource.bulkImport', () => {
  it('POSTs /v1/contacts/bulk-import with the request body and forwards idempotency-key', async () => {
    const { client, calls } = withCapture();
    await client.contacts.bulkImport(
      { rows: [{ phone: '+5511999999991' }, { phone: '+5511999999992' }] },
      { idempotencyKey: 'idem_bulk_1' },
    );
    expect(calls[0]?.url).toBe('http://test/v1/contacts/bulk-import');
    expect(calls[0]?.method).toBe('POST');
    expect(calls[0]?.headers['idempotency-key']).toBe('idem_bulk_1');
    expect(calls[0]?.headers['authorization']).toContain('tx_sandbox_');
    const body = JSON.parse(calls[0]?.body ?? '{}') as Record<string, unknown>;
    expect(body).toEqual({ rows: [{ phone: '+5511999999991' }, { phone: '+5511999999992' }] });
  });

  it('forwards tyxter-trace-id when traceId option is supplied', async () => {
    const { client, calls } = withCapture();
    await client.contacts.bulkImport(
      { rows: [{ phone: '+5511999999991' }] },
      { traceId: 'trc_abc' },
    );
    expect(calls[0]?.headers['tyxter-trace-id']).toBe('trc_abc');
  });

  it('omits idempotency-key and tyxter-trace-id headers when no options supplied', async () => {
    const { client, calls } = withCapture();
    await client.contacts.bulkImport({ rows: [{ phone: '+5511999999991' }] });
    expect(calls[0]?.headers['idempotency-key']).toBeUndefined();
    expect(calls[0]?.headers['tyxter-trace-id']).toBeUndefined();
  });

  it('POSTs /v1/contacts/:id/export and forwards the idempotency key', async () => {
    const { client, calls } = withCapture();
    await client.contacts.export('ct_1', { idempotencyKey: 'idem-export' });
    expect(calls[0]?.url).toBe('http://test/v1/contacts/ct_1/export');
    expect(calls[0]?.method).toBe('POST');
    expect(calls[0]?.headers['idempotency-key']).toBe('idem-export');
  });

  it('DELETEs /v1/contacts/:id and forwards the idempotency key on erase', async () => {
    const { client, calls } = withCapture();
    await client.contacts.erase('ct_1', { idempotencyKey: 'idem-erase' });
    expect(calls[0]?.url).toBe('http://test/v1/contacts/ct_1');
    expect(calls[0]?.method).toBe('DELETE');
    expect(calls[0]?.headers['idempotency-key']).toBe('idem-erase');
  });
});
