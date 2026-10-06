import { describe, expect, it, vi } from 'vitest';
import { Tyxter } from '../client.js';

type CapturedCall = {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string | undefined;
};

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

describe('FlowsResource', () => {
  it('POSTs /v1/flows on create', async () => {
    const { client, calls } = withCapture({});
    await client.flows.create(
      {
        name: 'lead_capture',
        flow_json: { version: '6.3', screens: [] },
      },
      { idempotencyKey: 'idem_flow_create_1' },
    );
    expect(calls[0]?.url).toBe('http://test/v1/flows');
    expect(calls[0]?.method).toBe('POST');
    expect(calls[0]?.headers['idempotency-key']).toBe('idem_flow_create_1');
  });

  it('POSTs /v1/flows/:id/publish', async () => {
    const { client, calls } = withCapture({});
    await client.flows.publish('flw_1');
    expect(calls[0]?.url).toBe('http://test/v1/flows/flw_1/publish');
    expect(calls[0]?.method).toBe('POST');
  });
});

describe('ContactsResource', () => {
  it('POSTs /v1/contacts/opt-out', async () => {
    const { client, calls } = withCapture({});
    await client.contacts.optOut({ phone: '+5511999999999' });
    expect(calls[0]?.url).toBe('http://test/v1/contacts/opt-out');
  });

  it('POSTs /v1/contacts/opt-in', async () => {
    const { client, calls } = withCapture({});
    await client.contacts.optIn({ phone: '+5511999999999' });
    expect(calls[0]?.url).toBe('http://test/v1/contacts/opt-in');
  });

  it('forwards idempotency-key on opt-in', async () => {
    const { client, calls } = withCapture({});
    await client.contacts.optIn({ phone: '+5511999999999' }, { idempotencyKey: 'idem_optin_1' });
    expect(calls[0]?.headers['idempotency-key']).toBe('idem_optin_1');
  });

  it('does not send idempotency-key on opt-in when not provided', async () => {
    const { client, calls } = withCapture({});
    await client.contacts.optIn({ phone: '+5511999999999' });
    expect(calls[0]?.headers['idempotency-key']).toBeUndefined();
  });

  it('forwards tyxter-trace-id on opt-in and opt-out when traceId is supplied', async () => {
    const { client, calls } = withCapture({});
    await client.contacts.optIn({ phone: '+5511999999999' }, { traceId: 'trc_optin_1' });
    expect(calls[0]?.headers['tyxter-trace-id']).toBe('trc_optin_1');

    await client.contacts.optOut({ phone: '+5511999999999' }, { traceId: 'trc_optout_1' });
    expect(calls[1]?.headers['tyxter-trace-id']).toBe('trc_optout_1');
  });
});

describe('BatchesResource', () => {
  it('POSTs /v1/batches with trace id header', async () => {
    const { client, calls } = withCapture({});
    await client.batches.create(
      {
        from: 'pn_1',
        template: { name: 'order_update', language: 'pt_BR' },
        recipients: [{ to: '+5511999999999' }],
      },
      { traceId: 'trc_abc' },
    );
    expect(calls[0]?.url).toBe('http://test/v1/batches');
    expect(calls[0]?.headers['tyxter-trace-id']).toBe('trc_abc');
  });

  it('forwards idempotency-key on batches.create', async () => {
    const { client, calls } = withCapture({});
    await client.batches.create(
      {
        from: 'pn_1',
        template: { name: 'order_update', language: 'pt_BR' },
        recipients: [{ to: '+5511999999999' }],
      },
      { idempotencyKey: 'idem_batch_1' },
    );
    expect(calls[0]?.headers['idempotency-key']).toBe('idem_batch_1');
  });

  it('forwards both idempotency-key and trace-id when both are provided', async () => {
    const { client, calls } = withCapture({});
    await client.batches.create(
      {
        from: 'pn_1',
        template: { name: 'order_update', language: 'pt_BR' },
        recipients: [{ to: '+5511999999999' }],
      },
      { idempotencyKey: 'idem_batch_2', traceId: 'trc_xyz' },
    );
    expect(calls[0]?.headers['idempotency-key']).toBe('idem_batch_2');
    expect(calls[0]?.headers['tyxter-trace-id']).toBe('trc_xyz');
  });

  it('accepts an audience.contact_ids payload and POSTs it verbatim', async () => {
    const { client, calls } = withCapture({});
    await client.batches.create({
      from: 'pn_1',
      template: { name: 'order_update', language: 'pt_BR' },
      audience: { contact_ids: ['ct_1', 'ct_2'] },
    });
    expect(calls[0]?.url).toBe('http://test/v1/batches');
    expect(calls[0]?.method).toBe('POST');
    const body = JSON.parse(calls[0]?.body ?? '{}') as Record<string, unknown>;
    expect(body).toEqual({
      from: 'pn_1',
      template: { name: 'order_update', language: 'pt_BR' },
      audience: { contact_ids: ['ct_1', 'ct_2'] },
    });
    expect((body as { recipients?: unknown }).recipients).toBeUndefined();
  });

  it('accepts a saved audience_id payload and POSTs it verbatim', async () => {
    const { client, calls } = withCapture({});
    await client.batches.create({
      from: 'pn_1',
      template: { name: 'order_update', language: 'pt_BR' },
      audience_id: 'aud_1',
    });
    const body = JSON.parse(calls[0]?.body ?? '{}') as Record<string, unknown>;
    expect(body).toEqual({
      from: 'pn_1',
      template: { name: 'order_update', language: 'pt_BR' },
      audience_id: 'aud_1',
    });
  });

  it.each([
    ['pause', 'POST', '/v1/batches/mb_1/pause'],
    ['resume', 'POST', '/v1/batches/mb_1/resume'],
    ['cancel', 'POST', '/v1/batches/mb_1/cancel'],
    ['failures', 'GET', '/v1/batches/mb_1/failures'],
  ] as const)('%s calls the batch operation endpoint', async (methodName, method, path) => {
    const { client, calls } = withCapture({});

    await client.batches[methodName]('mb_1');

    expect(calls[0]?.method).toBe(method);
    expect(calls[0]?.url).toBe(`http://test${path}`);
  });

  it.each([['pause'], ['resume'], ['cancel']] as const)(
    '%s forwards the idempotency key header',
    async (methodName) => {
      const { client, calls } = withCapture({});

      await client.batches[methodName]('mb_1', { idempotencyKey: `idem-${methodName}` });

      expect(calls[0]?.headers['idempotency-key']).toBe(`idem-${methodName}`);
    },
  );
});

describe('AudiencesResource', () => {
  it('POSTs /v1/audiences on create', async () => {
    const { client, calls } = withCapture({});
    await client.audiences.create(
      { name: 'Launch list', contact_ids: ['ct_1', 'ct_2'] },
      { idempotencyKey: 'idem_aud_1', traceId: 'trc_aud_1' },
    );
    expect(calls[0]?.url).toBe('http://test/v1/audiences');
    expect(calls[0]?.method).toBe('POST');
    expect(calls[0]?.headers['idempotency-key']).toBe('idem_aud_1');
    expect(calls[0]?.headers['tyxter-trace-id']).toBe('trc_aud_1');
  });

  it.each([
    ['list', 'GET', '/v1/audiences?limit=10'],
    ['retrieve', 'GET', '/v1/audiences/aud_1'],
    ['update', 'PATCH', '/v1/audiences/aud_1'],
    ['delete', 'DELETE', '/v1/audiences/aud_1'],
  ] as const)('%s calls the audience endpoint', async (methodName, method, path) => {
    const { client, calls } = withCapture({});

    if (methodName === 'list') await client.audiences.list({ limit: 10 });
    if (methodName === 'retrieve') await client.audiences.retrieve('aud_1');
    if (methodName === 'update') await client.audiences.update('aud_1', { name: 'Updated' });
    if (methodName === 'delete') await client.audiences.delete('aud_1');

    expect(calls[0]?.method).toBe(method);
    expect(calls[0]?.url).toBe(`http://test${path}`);
  });
});

describe('TemplatesResource', () => {
  it('calls template lifecycle endpoints', async () => {
    const { client, calls } = withCapture({});
    await client.templates.update('tmpl_1', {
      components: [{ type: 'BODY', text: 'Updated {{1}}', example: { body_text: [['Maria']] } }],
    });
    await client.templates.duplicate('tmpl_1', { name: 'order_update_copy' });
    await client.templates.analytics('tmpl_1');
    await client.templates.estimateCost('tmpl_1', { recipients: 100 });
    await client.templates.delete('tmpl_1');

    expect(calls.map((call) => `${call.method} ${call.url}`)).toEqual([
      'PATCH http://test/v1/templates/tmpl_1',
      'POST http://test/v1/templates/tmpl_1/duplicate',
      'GET http://test/v1/templates/tmpl_1/analytics',
      'POST http://test/v1/templates/tmpl_1/estimate-cost',
      'DELETE http://test/v1/templates/tmpl_1',
    ]);
    const body = JSON.parse(calls[3]?.body ?? '{}') as Record<string, unknown>;
    expect(body).toMatchObject({ recipients: 100 });
  });

  it.each([
    ['create', 'POST', '/v1/templates'],
    ['update', 'PATCH', '/v1/templates/tmpl_1'],
    ['submit', 'POST', '/v1/templates/tmpl_1/submit'],
    ['duplicate', 'POST', '/v1/templates/tmpl_1/duplicate'],
  ] as const)('%s forwards the idempotency key header', async (methodName, method, path) => {
    const { client, calls } = withCapture({});
    const options = { idempotencyKey: `idem-tpl-${methodName}` };

    if (methodName === 'create')
      await client.templates.create(
        { name: 'order_update', language: 'pt_BR', category: 'utility', components: [] },
        options,
      );
    if (methodName === 'update') await client.templates.update('tmpl_1', { name: 'x' }, options);
    if (methodName === 'submit') await client.templates.submit('tmpl_1', options);
    if (methodName === 'duplicate') await client.templates.duplicate('tmpl_1', {}, options);

    expect(calls[0]?.method).toBe(method);
    expect(calls[0]?.url).toBe(`http://test${path}`);
    expect(calls[0]?.headers['idempotency-key']).toBe(`idem-tpl-${methodName}`);
  });
});

describe('display-name advisory responses', () => {
  it('passes warning objects through phone provision/connect and Meta registration with the retry key', async () => {
    const warnings = [
      {
        code: 'display_name_promotional_word',
        field: 'display_name',
        message: 'Consider removing promotional words.',
      },
    ];
    const { client, calls } = withCapture({ warnings });
    expect(
      (await client.phoneNumbers.provision({ ddd: '11' }, { idempotencyKey: 'advice_1' })).warnings,
    ).toEqual(warnings);
    expect(
      (
        await client.phoneNumbers.connect(
          { phone: '+5511999999999', meta_phone_number_id: 'mpn_1' },
          { idempotencyKey: 'advice_2' },
        )
      ).warnings,
    ).toEqual(warnings);
    expect(
      (
        await client.providerConnections.registerMeta(
          {
            display_name: 'Clara Monteiro Oficial',
            waba_id: 'waba_1',
            phone_number_id: 'mpn_1',
            access_token: 'synthetic-token',
          },
          'advice_3',
        )
      ).warnings,
    ).toEqual(warnings);
    expect(
      calls.map((call) => call.headers['idempotency-key'] ?? call.headers['Idempotency-Key']),
    ).toEqual(['advice_1', 'advice_2', 'advice_3']);
  });
});
