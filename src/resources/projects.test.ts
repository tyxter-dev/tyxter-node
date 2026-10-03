import { describe, expect, it, vi } from 'vitest';

import { TyxterApiError } from '../api-error.js';
import { Tyxter } from '../client.js';

type CapturedCall = {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string | undefined;
};

function withCapture(
  responseBody: unknown = {
    id: 'prj_1',
    object: 'project',
    name: 'Acme',
    slug: 'acme',
    default_language: 'pt_BR',
    profile: {},
    archived_at: null,
    created_at: '2026-08-27T00:00:00.000Z',
    updated_at: '2026-08-27T00:00:00.000Z',
    environments: [],
  },
) {
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

describe('ProjectsResource', () => {
  it('POSTs the canonical body and forwards an optional idempotency key', async () => {
    const { client, calls } = withCapture();

    await client.projects.create({ name: 'Acme', slug: 'acme' }, { idempotencyKey: 'idem_1' });

    expect(calls[0]?.url).toBe('http://test/v1/projects');
    expect(calls[0]?.method).toBe('POST');
    expect(calls[0]?.headers['idempotency-key']).toBe('idem_1');
    expect(JSON.parse(calls[0]?.body ?? '{}')).toEqual({ name: 'Acme', slug: 'acme' });
  });

  it('omits the optional idempotency header when no key is passed', async () => {
    const { client, calls } = withCapture();

    await client.projects.create({ name: 'Acme' });

    expect(calls[0]?.headers['idempotency-key']).toBeUndefined();
  });

  it('GETs the exact cursor-paginated project-list URL', async () => {
    const { client, calls } = withCapture({
      object: 'list',
      data: [],
      has_more: false,
      next_cursor: null,
    });

    await client.projects.list({ limit: 20, starting_after: 'cursor+/=' });

    expect(calls[0]?.url).toBe('http://test/v1/projects?limit=20&starting_after=cursor%2B%2F%3D');
    expect(calls[0]?.method).toBe('GET');
    expect(calls[0]?.body).toBeUndefined();
  });

  it('GETs one project by ID', async () => {
    const { client, calls } = withCapture();

    await client.projects.retrieve('prj_123');

    expect(calls[0]?.url).toBe('http://test/v1/projects/prj_123');
    expect(calls[0]?.method).toBe('GET');
  });

  it('preserves standard project errors as TyxterApiError values', async () => {
    const client = new Tyxter({
      apiKey: 'tx_sandbox_aaaaaaaaaaaaaaaaaaaaaaaa',
      baseUrl: 'http://test',
      fetch: vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              error: {
                type: 'not_found',
                code: 'project_not_found',
                message: 'Project not found.',
              },
            }),
            { status: 404, headers: { 'content-type': 'application/json' } },
          ),
      ) as unknown as typeof fetch,
    });

    const result = client.projects.retrieve('prj_missing');
    await expect(result).rejects.toBeInstanceOf(TyxterApiError);
    await expect(result).rejects.toMatchObject({
      status: 404,
      type: 'not_found',
      code: 'project_not_found',
    });
  });
});
