import { describe, expect, it, vi } from 'vitest';

import { Tyxter } from '../client.js';

type CapturedCall = {
  readonly url: string;
  readonly method: string;
  readonly body: string | undefined;
  readonly response_status: number;
};

function withCapture() {
  const calls: CapturedCall[] = [];
  const fetchImpl = vi.fn(
    async (
      url: string,
      init: { method?: string; body?: string; headers?: Record<string, string>; signal?: unknown },
    ) => {
      const method = init.method ?? 'GET';
      const response_status = responseStatusFor(url, method);
      calls.push({ url, method, body: init.body, response_status });
      return new Response(JSON.stringify(responseFor(url, method)), {
        status: response_status,
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

function responseStatusFor(url: string, method: string): number {
  if (url.endsWith('/templates') && method === 'POST') return 201;
  if (url.endsWith('/templates/tmpl_1/submit') && method === 'POST') return 202;
  if (url.endsWith('/messages') && method === 'POST') return 202;
  return 200;
}

function templateResponse(status: 'draft' | 'submitted' | 'approved'): Record<string, unknown> {
  const submitted_at = status === 'draft' ? null : '2026-08-26T12:01:00Z';
  const approved_at = status === 'approved' ? '2026-08-26T12:02:00Z' : null;

  return {
    id: 'tmpl_1',
    object: 'template',
    name: 'order_tracking_update',
    language: 'pt_BR',
    category: 'utility',
    parameter_format: 'NAMED',
    status,
    environment: 'sandbox',
    components: [],
    provider_template_id: null,
    rejection_reason: null,
    provider_quality: 'unknown',
    authoring_signals: [],
    submitted_at,
    approved_at,
    created_at: '2026-08-26T12:00:00Z',
    updated_at: approved_at ?? submitted_at ?? '2026-08-26T12:00:00Z',
  };
}

function responseFor(url: string, method: string): Record<string, unknown> {
  if (url.endsWith('/templates/generate')) {
    return {
      object: 'template_generation',
      name: 'order_tracking_update',
      language: 'pt_BR',
      category: 'utility',
      parameter_format: 'NAMED',
      components: [],
      authoring_signals: [],
    };
  }
  if (url.endsWith('/messages')) {
    return {
      id: 'msg_1',
      object: 'message',
      status: 'accepted',
      channel: 'whatsapp',
      environment: 'sandbox',
      template_id: 'tmpl_1',
      template_version_id: 'tmplver_1',
      template_version: 1,
      created_at: '2026-08-26T12:00:00Z',
      trace_id: 'trc_1',
    };
  }
  if (url.endsWith('/templates/tmpl_1/submit') && method === 'POST') {
    return templateResponse('submitted');
  }
  if (url.endsWith('/templates/tmpl_1') && method === 'GET') {
    return templateResponse('approved');
  }
  return templateResponse('draft');
}

describe('TemplatesResource parameter formats', () => {
  it('mirrors named authoring through submitted then retrieved approval while keeping send format resolved', async () => {
    const { client, calls } = withCapture();

    const generated = await client.templates.generate({
      description: 'Tell a customer that an order is ready to track.',
      language: 'pt_BR',
      category: 'utility',
      parameter_format: 'NAMED',
    });
    const created = await client.templates.create({
      name: 'order_tracking_update',
      language: 'pt_BR',
      category: 'utility',
      parameter_format: 'NAMED',
      components: [
        {
          type: 'BODY',
          text: 'Olá {{customer_name}}, pedido {{order_id}}.',
          example: {
            body_text_named_params: [
              { param_name: 'customer_name', example: 'Ana' },
              { param_name: 'order_id', example: 'ORD-123' },
            ],
          },
        },
      ],
    });
    const submitted = await client.templates.submit(created.id);
    const approved = await client.templates.retrieve(created.id);
    await client.whatsapp.sendTemplate({
      from: 'phone_number_id',
      to: '+5511999999999',
      name: created.name,
      language: created.language,
      variables: { customer_name: 'Ana', order_id: 'ORD-123' },
    });

    expect(generated.parameter_format).toBe('NAMED');
    expect(created.parameter_format).toBe('NAMED');
    expect(created.status).toBe('draft');
    expect(submitted.parameter_format).toBe('NAMED');
    expect(submitted.status).toBe('submitted');
    expect(approved.status).toBe('approved');
    expect(approved.parameter_format).toBe('NAMED');

    const bodies = calls.map((call) => JSON.parse(call.body ?? '{}'));
    expect(calls[0]).toMatchObject({
      url: 'http://test/v1/templates/generate',
      method: 'POST',
      response_status: 200,
    });
    expect(bodies[0]).toMatchObject({ parameter_format: 'NAMED' });
    expect(calls[1]).toMatchObject({
      url: 'http://test/v1/templates',
      method: 'POST',
      response_status: 201,
    });
    expect(bodies[1]).toMatchObject({ parameter_format: 'NAMED' });
    expect(calls[2]).toMatchObject({
      url: 'http://test/v1/templates/tmpl_1/submit',
      method: 'POST',
      body: undefined,
      response_status: 202,
    });
    expect(calls[3]).toMatchObject({
      url: 'http://test/v1/templates/tmpl_1',
      method: 'GET',
      body: undefined,
      response_status: 200,
    });
    expect(calls[4]).toMatchObject({
      url: 'http://test/v1/messages',
      method: 'POST',
      response_status: 202,
    });
    expect(bodies[4]).toMatchObject({
      message: {
        type: 'template',
        template: { variables: { customer_name: 'Ana', order_id: 'ORD-123' } },
      },
    });
    expect(bodies[4]?.message?.template).not.toHaveProperty('parameter_format');
  });

  it('keeps create and generation callers compatible when they omit parameter_format', async () => {
    const { client, calls } = withCapture();

    await client.templates.generate({
      description: 'Tell a customer that their order has shipped.',
      language: 'pt_BR',
      category: 'utility',
    });
    await client.templates.create({
      name: 'order_shipped',
      language: 'pt_BR',
      category: 'utility',
      components: [{ type: 'BODY', text: 'Seu pedido saiu.' }],
    });

    expect(JSON.parse(calls[0]?.body ?? '{}')).not.toHaveProperty('parameter_format');
    expect(JSON.parse(calls[1]?.body ?? '{}')).not.toHaveProperty('parameter_format');
  });

  it('forwards explicit update and duplicate formats', async () => {
    const { client, calls } = withCapture();

    await client.templates.update('tmpl_1', { parameter_format: 'POSITIONAL' });
    await client.templates.duplicate('tmpl_1', { parameter_format: 'NAMED' });

    expect(JSON.parse(calls[0]?.body ?? '{}')).toMatchObject({ parameter_format: 'POSITIONAL' });
    expect(JSON.parse(calls[1]?.body ?? '{}')).toMatchObject({ parameter_format: 'NAMED' });
  });
});
