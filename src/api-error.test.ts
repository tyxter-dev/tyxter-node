import { describe, expect, it, vi } from 'vitest';
import { Tyxter } from './client.js';
import { TyxterApiError } from './api-error.js';

function withErrorResponse(status: number, body: unknown) {
  const fetchImpl = vi.fn(async () => {
    return new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    });
  }) as unknown as typeof fetch;
  return new Tyxter({
    apiKey: 'tx_sandbox_aaaaaaaaaaaaaaaaaaaaaaaa',
    baseUrl: 'http://test',
    fetch: fetchImpl,
  });
}

describe('TyxterApiError', () => {
  it('throws TyxterApiError with structured fields on Tyxter error response', async () => {
    const client = withErrorResponse(429, {
      error: {
        type: 'rate_limited',
        code: 'transcription_retry_rate_limited',
        message: 'Wait before replaying this retry command.',
        retry_after_ms: 60_000,
        request_id: 'req_123',
        trace_id: 'trc_456',
      },
    });

    try {
      await client.messages.list();
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(TyxterApiError);
      const apiErr = err as TyxterApiError;
      expect(apiErr.status).toBe(429);
      expect(apiErr.type).toBe('rate_limited');
      expect(apiErr.code).toBe('transcription_retry_rate_limited');
      expect(apiErr.message).toBe('Wait before replaying this retry command.');
      expect(apiErr.retryAfterMs).toBe(60_000);
      expect(apiErr.retryable).toBeUndefined();
      expect(apiErr.requestId).toBe('req_123');
      expect(apiErr.traceId).toBe('trc_456');
      expect(apiErr.name).toBe('TyxterApiError');
      expect(apiErr.details).toBeUndefined();
    }
  });

  it('exposes bounded listen-session conflict details while preserving the original body', async () => {
    const response = {
      error: {
        type: 'conflict',
        code: 'webhook_listen_session_active_exists',
        message: 'A production webhook listen session is already active for this environment.',
        details: {
          active_session: {
            id: 'wls_123',
            expires_at: '2026-05-29T13:05:00.000Z',
            created_at: '2026-05-29T13:00:00.000Z',
          },
        },
        newer_server_field: 'retained',
      },
    };
    const client = withErrorResponse(409, response);

    try {
      await client.messages.list();
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(TyxterApiError);
      const apiErr = err as TyxterApiError;
      expect(apiErr.details).toEqual(response.error.details);
      expect(apiErr.body).toEqual(response.error);
    }
  });

  it('preserves the suspended-phone refusal from POST /v1/messages for an SDK sender', async () => {
    const client = withErrorResponse(403, {
      error: {
        type: 'authorization_error',
        code: 'phone_service_suspended',
        message: 'Phone service is suspended until management coverage is funded.',
        request_id: 'req_phone_service',
        trace_id: 'trc_phone_service',
      },
    });

    await expect(
      client.messages.create({
        channel: 'whatsapp',
        sender: { type: 'whatsapp_phone_number', id: 'pn_suspended' },
        recipient: { type: 'phone_e164', id: '+5511999999999' },
        message: { type: 'text', text: { body: 'blocked before provider work' } },
      }),
    ).rejects.toMatchObject({
      name: 'TyxterApiError',
      status: 403,
      type: 'authorization_error',
      code: 'phone_service_suspended',
      traceId: 'trc_phone_service',
    });
  });

  it('parses the unmatched-route 404 envelope, discovery pointer included', async () => {
    // #689: an integrating agent that guesses a path used to get NestJS's raw
    // `{message,error,statusCode}` body, which `parseApiError` cannot recognize —
    // so a wrong path surfaced as a bare Error with no `code` to branch on. The
    // API now envelopes it, and the additive `discovery` pointer arrives intact
    // because `parseApiError` hands the whole `error` object to the constructor —
    // declared here, and tolerated by `TyxterErrorBody`'s index signature on any
    // SDK build that predates the declaration.
    const client = withErrorResponse(404, {
      error: {
        type: 'not_found',
        code: 'route_not_found',
        message: 'No route matches GET /v1/does-not-exist.',
        request_id: 'req_404',
        trace_id: 'trc_404',
        discovery: { openapi: '/openapi.json', well_known: '/.well-known/tyxter.json' },
      },
    });

    try {
      await client.messages.list();
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(TyxterApiError);
      const apiErr = err as TyxterApiError;
      expect(apiErr.status).toBe(404);
      expect(apiErr.type).toBe('not_found');
      expect(apiErr.code).toBe('route_not_found');
      expect(apiErr.message).toBe('No route matches GET /v1/does-not-exist.');
      expect(apiErr.requestId).toBe('req_404');
      expect(apiErr.traceId).toBe('trc_404');
      expect(apiErr.body.discovery).toEqual({
        openapi: '/openapi.json',
        well_known: '/.well-known/tyxter.json',
      });
    }
  });

  it('throws plain Error when response body is not a Tyxter error shape', async () => {
    const client = withErrorResponse(500, { message: 'Internal server error' });

    try {
      await client.messages.list();
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).not.toBeInstanceOf(TyxterApiError);
      expect(err).toBeInstanceOf(Error);
    }
  });

  it.each([false, undefined] as const)(
    'preserves the payment stop hint %s without synthesizing a legacy policy',
    async (retryable) => {
      const client = withErrorResponse(402, {
        error: {
          type: 'payment_required',
          code: 'credit_balance_exhausted',
          message: 'Credit balance exhausted.',
          ...(retryable === undefined ? {} : { retryable }),
          request_id: 'req_789',
          trace_id: 'trc_abc',
        },
      });

      try {
        await client.messages.list();
        expect.unreachable('should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(TyxterApiError);
        const apiErr = err as TyxterApiError;
        expect(apiErr.status).toBe(402);
        expect(apiErr.type).toBe('payment_required');
        expect(apiErr.code).toBe('credit_balance_exhausted');
        expect(apiErr.retryable).toBe(retryable);
        expect(apiErr.retryAfterMs).toBeUndefined();
      }
    },
  );
});
