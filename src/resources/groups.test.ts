import { describe, expect, it, vi } from 'vitest';

import { TyxterApiError } from '../api-error.js';
import { Tyxter } from '../client.js';

function clientAnswering(status: number, body: unknown) {
  const calls: { url: string; method: string }[] = [];
  const inits: { body?: unknown; headers?: unknown }[] = [];
  const fetchImpl = vi.fn(
    async (url: string, init: { method?: string; body?: unknown; headers?: unknown }) => {
      calls.push({ url, method: init.method ?? 'GET' });
      inits.push({ body: init.body, headers: init.headers });
      return new Response(JSON.stringify(body), {
        status,
        headers: { 'content-type': 'application/json' },
      });
    },
  ) as unknown as typeof fetch;
  const client = new Tyxter({
    apiKey: 'tx_sandbox_aaaaaaaaaaaaaaaaaaaaaaaa',
    baseUrl: 'http://test',
    fetch: fetchImpl,
  });
  return { client, calls, inits };
}

describe('GroupsResource (WhatsApp Business groups, beta, #1214)', () => {
  it('reads eligibility with the phone_number_id query parameter', async () => {
    const answer = {
      object: 'group_eligibility',
      phone_number_id: 'pn_1',
      environment: 'sandbox',
      status: 'eligible',
      reasons: [],
      checked_at: null,
      check_requested_at: null,
    };
    const { client, calls } = clientAnswering(200, answer);

    await expect(client.groups.retrieveEligibility({ phone_number_id: 'pn_1' })).resolves.toEqual(
      answer,
    );
    expect(calls).toEqual([
      { url: 'http://test/v1/groups/eligibility?phone_number_id=pn_1', method: 'GET' },
    ]);
  });

  it('posts an eligibility check with the body and the Idempotency-Key header', async () => {
    const answer = {
      object: 'group_eligibility',
      phone_number_id: 'pn_1',
      environment: 'production',
      status: 'not_checked',
      reasons: [],
      checked_at: null,
      check_requested_at: '2026-10-04T12:00:00.000Z',
    };
    const { client, calls, inits } = clientAnswering(202, answer);

    await expect(
      client.groups.createEligibilityCheck(
        { phone_number_id: 'pn_1' },
        { idempotencyKey: 'key-1' },
      ),
    ).resolves.toEqual(answer);
    expect(calls).toEqual([{ url: 'http://test/v1/groups/eligibility-checks', method: 'POST' }]);
    expect(inits[0]?.body).toBe(JSON.stringify({ phone_number_id: 'pn_1' }));
    expect(inits[0]?.headers).toMatchObject({ 'idempotency-key': 'key-1' });
  });

  it('surfaces a foreign phone number as a typed 404 phone_number_not_found', async () => {
    const { client } = clientAnswering(404, {
      error: {
        type: 'not_found',
        code: 'phone_number_not_found',
        message: 'Phone number not found.',
      },
    });

    const error = await client.groups
      .retrieveEligibility({ phone_number_id: 'pn_other' })
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(TyxterApiError);
    expect(error).toMatchObject({ status: 404, code: 'phone_number_not_found' });
  });

  const group = {
    id: 'cmgroup0000000000000000001',
    object: 'group',
    status: 'pending',
    environment: 'sandbox',
    phone_number_id: 'pn_1',
    subject: 'Team',
    description: null,
    join_approval_mode: 'auto_approve',
    provider_group_id: null,
    invite_link: null,
    failure: null,
    created_at: '2026-10-05T12:00:00.000Z',
    updated_at: '2026-10-05T12:00:00.000Z',
    deleted_at: null,
  };

  it('creates a group with the body and the Idempotency-Key header', async () => {
    const { client, calls, inits } = clientAnswering(202, group);

    await expect(
      client.groups.create(
        { phone_number_id: 'pn_1', subject: 'Team' },
        { idempotencyKey: 'group-key-1' },
      ),
    ).resolves.toEqual(group);
    expect(calls).toEqual([{ url: 'http://test/v1/groups', method: 'POST' }]);
    expect(inits[0]?.body).toBe(JSON.stringify({ phone_number_id: 'pn_1', subject: 'Team' }));
    expect(inits[0]?.headers).toMatchObject({ 'idempotency-key': 'group-key-1' });
  });

  it('lists groups with the filter and cursor query parameters', async () => {
    const page = { object: 'list', data: [group], has_more: false, next_cursor: null };
    const { client, calls } = clientAnswering(200, page);

    await expect(
      client.groups.list({ phone_number_id: 'pn_1', status: 'pending', limit: 10 }),
    ).resolves.toEqual(page);
    expect(calls).toEqual([
      {
        url: 'http://test/v1/groups?phone_number_id=pn_1&status=pending&limit=10',
        method: 'GET',
      },
    ]);
  });

  it('retrieves a group by its Tyxter id, encoding the path segment', async () => {
    const { client, calls } = clientAnswering(200, group);

    await expect(client.groups.retrieve('cmgroup0000000000000000001')).resolves.toEqual(group);
    await client.groups.retrieve('https://chat.whatsapp.com/AbC');
    expect(calls).toEqual([
      { url: 'http://test/v1/groups/cmgroup0000000000000000001', method: 'GET' },
      { url: 'http://test/v1/groups/https%3A%2F%2Fchat.whatsapp.com%2FAbC', method: 'GET' },
    ]);
  });

  it('surfaces a personal-group id as a typed 422 personal_whatsapp_group_not_supported', async () => {
    const { client } = clientAnswering(422, {
      error: {
        type: 'validation_error',
        code: 'personal_whatsapp_group_not_supported',
        message: 'This looks like a personal WhatsApp group.',
        param: 'group_id',
      },
    });

    const error = await client.groups
      .retrieve('120363012345678901@g.us')
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(TyxterApiError);
    expect(error).toMatchObject({ status: 422, code: 'personal_whatsapp_group_not_supported' });
  });

  it('deletes a group by its encoded Tyxter id with the Idempotency-Key header', async () => {
    const deleting = { ...group, status: 'deleting' };
    const { client, calls, inits } = clientAnswering(202, deleting);

    await expect(
      client.groups.delete('cmgroup0000000000000000001', { idempotencyKey: 'del-1' }),
    ).resolves.toEqual(deleting);
    await client.groups.delete('120363012345678901@g.us');

    expect(calls).toEqual([
      { url: 'http://test/v1/groups/cmgroup0000000000000000001', method: 'DELETE' },
      { url: 'http://test/v1/groups/120363012345678901%40g.us', method: 'DELETE' },
    ]);
    expect(inits[0]?.body).toBeUndefined();
    expect(JSON.stringify(inits[0]?.headers)).toContain('del-1');
    expect(JSON.stringify(inits[1]?.headers)).not.toContain('idempotency-key');
  });

  it('surfaces a pending group as a typed 409 group_not_active', async () => {
    const { client } = clientAnswering(409, {
      error: { type: 'conflict', code: 'group_not_active', message: 'Still pending.' },
    });

    const error = await client.groups
      .delete('cmgroup0000000000000000001')
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(TyxterApiError);
    expect(error).toMatchObject({ status: 409, code: 'group_not_active' });
  });

  it('resets the invite link by the encoded Tyxter id with the Idempotency-Key header and no body', async () => {
    const accepted = { ...group, status: 'active' };
    const { client, calls, inits } = clientAnswering(202, accepted);

    await expect(
      client.groups.resetInviteLink('cmgroup0000000000000000001', { idempotencyKey: 'reset-1' }),
    ).resolves.toEqual(accepted);
    await client.groups.resetInviteLink('120363012345678901@g.us');

    expect(calls).toEqual([
      {
        url: 'http://test/v1/groups/cmgroup0000000000000000001/invite-link/reset',
        method: 'POST',
      },
      { url: 'http://test/v1/groups/120363012345678901%40g.us/invite-link/reset', method: 'POST' },
    ]);
    expect(inits[0]?.body).toBeUndefined();
    expect(JSON.stringify(inits[0]?.headers)).toContain('reset-1');
    expect(JSON.stringify(inits[1]?.headers)).not.toContain('idempotency-key');
  });

  it('surfaces a group that is not active as a typed 409 group_not_active', async () => {
    const { client } = clientAnswering(409, {
      error: { type: 'conflict', code: 'group_not_active', message: 'Not active.' },
    });

    const error = await client.groups
      .resetInviteLink('cmgroup0000000000000000001')
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(TyxterApiError);
    expect(error).toMatchObject({ status: 409, code: 'group_not_active' });
  });
});
