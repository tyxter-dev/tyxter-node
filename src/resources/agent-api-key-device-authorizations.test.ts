import { describe, expect, it, vi } from 'vitest';
import {
  AGENT_API_KEY_DEVICE_GRANT_TYPE,
  type AgentApiKeyDeviceTokenResponse,
} from '../contracts.js';
import { TyxterBootstrap } from '../client.js';

type CapturedCall = {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string | undefined;
};

function withCapture(responseBody: unknown, status = 200) {
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
        status,
        headers: { 'content-type': 'application/json' },
      });
    },
  ) as unknown as typeof fetch;
  const client = new TyxterBootstrap({
    baseUrl: 'http://test',
    fetch: fetchImpl,
  });
  return { client, calls };
}

describe('AgentApiKeyDeviceAuthorizationsResource', () => {
  it('creates an unauthenticated device authorization request', async () => {
    const { client, calls } = withCapture({
      object: 'agent_api_key_device_authorization',
      device_code: 'tyxter_device_123',
      user_code: 'ABCD-EFGH',
      verification_uri: 'https://app.example.test/device',
      verification_uri_complete: 'https://app.example.test/device?user_code=ABCD-EFGH',
      expires_in: 900,
      interval: 5,
    });

    await client.agentApiKeyDeviceAuthorizations.create({
      client_name: 'Local setup agent',
      environment: 'sandbox',
      scopes: ['messages:write', 'templates:read'],
    });

    expect(calls[0]?.url).toBe('http://test/v1/agent-api-key-device-authorizations');
    expect(calls[0]?.method).toBe('POST');
    expect(calls[0]?.headers.authorization).toBeUndefined();
    expect(calls[0]?.headers['content-type']).toBe('application/json');
    expect(JSON.parse(calls[0]?.body ?? '{}')).toMatchObject({
      client_name: 'Local setup agent',
      environment: 'sandbox',
      scopes: ['messages:write', 'templates:read'],
    });
  });

  it('polls the token endpoint without an Authorization header and accepts pending 202', async () => {
    const pending: AgentApiKeyDeviceTokenResponse = {
      object: 'agent_api_key_device_token',
      status: 'pending',
      interval: 5,
      expires_in: 600,
    };
    const { client, calls } = withCapture(pending, 202);

    const response = await client.agentApiKeyDeviceAuthorizations.token({
      grant_type: AGENT_API_KEY_DEVICE_GRANT_TYPE,
      device_code: 'tyxter_device_123',
    });

    expect(response).toEqual(pending);
    expect(calls[0]?.url).toBe('http://test/v1/agent-api-key-device-authorizations/token');
    expect(calls[0]?.method).toBe('POST');
    expect(calls[0]?.headers.authorization).toBeUndefined();
    expect(JSON.parse(calls[0]?.body ?? '{}')).toEqual({
      grant_type: AGENT_API_KEY_DEVICE_GRANT_TYPE,
      device_code: 'tyxter_device_123',
    });
  });
});
