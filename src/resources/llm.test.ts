import { describe, expect, it, vi } from 'vitest';
import { Tyxter } from '../client.js';

interface CapturedCall {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
}

function withCapture(responseBody: unknown) {
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
    apiKey: 'tx_live_x',
    baseUrl: 'http://test',
    fetch: fetchImpl,
  });
  return { client, calls };
}

describe('LLMResource', () => {
  it('covers the full route CRUD surface including PATCH', async () => {
    const { client, calls } = withCapture({});

    await client.llm.upsertRoute(
      { system_prompt: 'You handle ACME deliveries support.' },
      { idempotencyKey: 'idem_llm_route_upsert_1' },
    );
    await client.llm.getRoute();
    await client.llm.updateRoute({ fallback_response: 'updated' });
    await client.llm.updateRoute({ fallback_response: 'updated' }, { phone_number_id: 'pn_1' });
    await client.llm.deleteRoute({ idempotencyKey: 'idem_llm_route_delete_1' });

    expect(calls.map((call) => `${call.method} ${call.url}`)).toEqual([
      'PUT http://test/v1/llm-routes',
      'GET http://test/v1/llm-routes',
      'PATCH http://test/v1/llm-routes',
      'PATCH http://test/v1/llm-routes?phone_number_id=pn_1',
      'DELETE http://test/v1/llm-routes',
    ]);
    expect(calls[0]?.headers['idempotency-key']).toBe('idem_llm_route_upsert_1');
    expect(calls[4]?.headers['idempotency-key']).toBe('idem_llm_route_delete_1');
  });

  it('GETs /v1/llm-routes/prompt-versions and serializes the phone_number_id filter', async () => {
    const { client, calls } = withCapture({ object: 'list', data: [] });

    await client.llm.listRoutePromptVersions();
    await client.llm.listRoutePromptVersions({ phone_number_id: 'pn_1', limit: 5 });

    expect(calls[0]?.method).toBe('GET');
    expect(calls[0]?.url).toBe('http://test/v1/llm-routes/prompt-versions');
    expect(calls[1]?.url).toBe(
      'http://test/v1/llm-routes/prompt-versions?phone_number_id=pn_1&limit=5',
    );
  });

  it('GETs /v1/llm/responses with optional cursor/limit query', async () => {
    const { client, calls } = withCapture({ object: 'list', data: [] });

    await client.llm.listResponses();
    await client.llm.listResponses({ limit: 10, starting_after: 'lresp_5' });

    expect(calls[0]?.method).toBe('GET');
    expect(calls[0]?.url).toBe('http://test/v1/llm/responses');
    expect(calls[1]?.url).toBe('http://test/v1/llm/responses?limit=10&starting_after=lresp_5');
  });

  it('forwards trace and idempotency headers on complete', async () => {
    const { client, calls } = withCapture({ object: 'llm_completion' });

    await client.llm.complete(
      { messages: [{ role: 'user', content: 'hello' }] },
      { traceId: 'trc_llm_1', idempotencyKey: 'idem-llm-1' },
    );

    expect(calls[0]?.url).toBe('http://test/v1/llm/completions');
    expect(calls[0]?.method).toBe('POST');
    expect(calls[0]?.headers['tyxter-trace-id']).toBe('trc_llm_1');
    expect(calls[0]?.headers['idempotency-key']).toBe('idem-llm-1');
  });
});
