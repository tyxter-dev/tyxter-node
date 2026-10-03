import { describe, expect, it, vi } from 'vitest';
import { Tyxter } from '../client.js';

type CapturedCall = {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string | undefined;
};

const usageSummaryFixture = {
  object: 'usage_summary',
  currency: 'brl',
  period_start: '2024-01-01T00:00:00Z',
  period_end: '2024-01-31T23:59:59Z',
  buckets: [],
  group_by: null,
  total_cost_brl: '0.00',
};

function withCapture(responseBody: unknown = usageSummaryFixture) {
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
    apiKey: 'tx_sandbox_aaaaaaaaaaaaaaaaaaaaaaaa',
    baseUrl: 'http://test',
    fetch: fetchImpl,
  });
  return { client, calls };
}

describe('UsageResource', () => {
  it('GETs /v1/usage with period_start and period_end', async () => {
    const { client, calls } = withCapture();
    await client.usage.retrieve({
      period_start: '2024-01-01T00:00:00Z',
      period_end: '2024-01-31T23:59:59Z',
    });
    expect(calls[0]?.method).toBe('GET');
    expect(calls[0]?.url).toContain('/v1/usage');
    expect(calls[0]?.url).toContain('period_start=');
    expect(calls[0]?.url).toContain('period_end=');
  });

  it('includes environment filter when provided', async () => {
    const { client, calls } = withCapture();
    await client.usage.retrieve({
      period_start: '2024-01-01T00:00:00Z',
      period_end: '2024-01-31T23:59:59Z',
      environment: 'sandbox',
    });
    expect(calls[0]?.url).toContain('environment=sandbox');
  });

  it('includes group_by filter when provided', async () => {
    const { client, calls } = withCapture();
    await client.usage.retrieve({
      period_start: '2024-01-01T00:00:00Z',
      period_end: '2024-01-31T23:59:59Z',
      group_by: 'package_consumption',
    });
    expect(calls[0]?.url).toContain('group_by=package_consumption');
  });

  it('omits environment param when not provided', async () => {
    const { client, calls } = withCapture();
    await client.usage.retrieve({
      period_start: '2024-01-01T00:00:00Z',
      period_end: '2024-01-31T23:59:59Z',
    });
    expect(calls[0]?.url).not.toContain('environment=');
  });

  it('sends authorization header', async () => {
    const { client, calls } = withCapture();
    await client.usage.retrieve({
      period_start: '2024-01-01T00:00:00Z',
      period_end: '2024-01-31T23:59:59Z',
    });
    expect(calls[0]?.headers['authorization']).toBe('Bearer tx_sandbox_aaaaaaaaaaaaaaaaaaaaaaaa');
  });

  it('does not send a request body for GET', async () => {
    const { client, calls } = withCapture();
    await client.usage.retrieve({
      period_start: '2024-01-01T00:00:00Z',
      period_end: '2024-01-31T23:59:59Z',
    });
    expect(calls[0]?.body).toBeUndefined();
  });

  it('GETs /v1/usage/records with cursor and meter filters', async () => {
    const { client, calls } = withCapture({
      object: 'list',
      data: [],
      has_more: false,
      next_cursor: null,
    });
    await client.usage.listRecords({
      limit: 10,
      starting_after: 'use_0',
      environment: 'sandbox',
      meter_id: 'msg.outbound.template',
    });

    expect(calls[0]?.url).toBe(
      'http://test/v1/usage/records?limit=10&starting_after=use_0&environment=sandbox&meter_id=msg.outbound.template',
    );
    expect(calls[0]?.method).toBe('GET');
    expect(calls[0]?.body).toBeUndefined();
  });
});
