import type { HttpClient } from '../client.js';
import type {
  AgenticAuthorizationResponse,
  AgenticPaymentResponse,
  CreateAgenticAuthorizationRequest,
  CreateAgenticPaymentRequest,
  ListAgenticAuthorizationsQuery,
  ListAgenticAuthorizationsResponse,
  ListAgenticBanksQuery,
  ListAgenticBanksResponse,
  ListAgenticPaymentsQuery,
  ListAgenticPaymentsResponse,
} from '../contracts.js';
import { toQs } from './internal.js';

export type AgenticPaymentWriteOptions = { idempotencyKey?: string; traceId?: string };

/**
 * Iniciador-backed agent-initiated Pix: list participating banks, create and
 * manage reusable customer authorizations, and orchestrate agentic Pix
 * payments. Wraps the `/v1/agentic/*` routes of `PUBLIC_API_LAUNCH_ENDPOINTS`.
 * The route-coverage gate (`route-coverage.test.ts`) fails if any of those rows
 * loses an SDK method here.
 */
export class AgenticPaymentsResource {
  constructor(private readonly http: HttpClient) {}

  // GET /v1/agentic/banks
  async listBanks(query: Partial<ListAgenticBanksQuery> = {}): Promise<ListAgenticBanksResponse> {
    return this.http.request<ListAgenticBanksResponse>('GET', `/v1/agentic/banks${toQs(query)}`);
  }

  // POST /v1/agentic/authorizations
  async createAuthorization(
    input: CreateAgenticAuthorizationRequest,
    options: AgenticPaymentWriteOptions = {},
  ): Promise<AgenticAuthorizationResponse> {
    return this.http.request<AgenticAuthorizationResponse>(
      'POST',
      '/v1/agentic/authorizations',
      input,
      agenticHeaders(options),
    );
  }

  // GET /v1/agentic/authorizations
  async listAuthorizations(
    query: Partial<ListAgenticAuthorizationsQuery> = {},
  ): Promise<ListAgenticAuthorizationsResponse> {
    return this.http.request<ListAgenticAuthorizationsResponse>(
      'GET',
      `/v1/agentic/authorizations${toQs(query)}`,
    );
  }

  // GET /v1/agentic/authorizations/:authorization_id
  async retrieveAuthorization(authorizationId: string): Promise<AgenticAuthorizationResponse> {
    return this.http.request<AgenticAuthorizationResponse>(
      'GET',
      `/v1/agentic/authorizations/${authorizationId}`,
    );
  }

  // POST /v1/agentic/authorizations/:authorization_id/revoke
  async revokeAuthorization(
    authorizationId: string,
    options: AgenticPaymentWriteOptions = {},
  ): Promise<AgenticAuthorizationResponse> {
    return this.http.request<AgenticAuthorizationResponse>(
      'POST',
      `/v1/agentic/authorizations/${authorizationId}/revoke`,
      undefined,
      agenticHeaders(options),
    );
  }

  // POST /v1/agentic/payments
  async createPayment(
    input: CreateAgenticPaymentRequest,
    options: AgenticPaymentWriteOptions = {},
  ): Promise<AgenticPaymentResponse> {
    return this.http.request<AgenticPaymentResponse>(
      'POST',
      '/v1/agentic/payments',
      input,
      agenticHeaders(options),
    );
  }

  // GET /v1/agentic/payments
  async listPayments(
    query: Partial<ListAgenticPaymentsQuery> = {},
  ): Promise<ListAgenticPaymentsResponse> {
    return this.http.request<ListAgenticPaymentsResponse>(
      'GET',
      `/v1/agentic/payments${toQs(query)}`,
    );
  }

  // GET /v1/agentic/payments/:payment_id
  async retrievePayment(paymentId: string): Promise<AgenticPaymentResponse> {
    return this.http.request<AgenticPaymentResponse>('GET', `/v1/agentic/payments/${paymentId}`);
  }

  // POST /v1/agentic/payments/:payment_id/cancel
  async cancelPayment(
    paymentId: string,
    options: AgenticPaymentWriteOptions = {},
  ): Promise<AgenticPaymentResponse> {
    return this.http.request<AgenticPaymentResponse>(
      'POST',
      `/v1/agentic/payments/${paymentId}/cancel`,
      undefined,
      agenticHeaders(options),
    );
  }
}

function agenticHeaders(options: AgenticPaymentWriteOptions): Record<string, string> {
  const headers: Record<string, string> = {};
  if (options.idempotencyKey) headers['idempotency-key'] = options.idempotencyKey;
  if (options.traceId) headers['tyxter-trace-id'] = options.traceId;
  return headers;
}
