import type { HttpClient } from '../client.js';
import type {
  DeleteProviderConnectionResponse,
  ExchangeMetaOAuthCodeRequest,
  ListProviderConnectionsResponse,
  MetaOnboardingConfigResponse,
  ProviderConnectionResponse,
  ProviderConnectionStatusResponse,
  RegisterMetaConnectionRequest,
  RotateProviderConnectionTokenRequest,
} from '../contracts.js';
import { toQs } from './internal.js';

export interface ListProviderConnectionsQuery {
  limit?: number;
  starting_after?: string;
}

export class ProviderConnectionsResource {
  readonly meta = {
    onboarding: () => this.metaOnboarding(),
    register: (body: RegisterMetaConnectionRequest, idempotencyKey?: string) =>
      this.registerMeta(body, idempotencyKey),
    exchangeOAuth: (body: ExchangeMetaOAuthCodeRequest, idempotencyKey?: string) =>
      this.exchangeMetaOAuthCode(body, idempotencyKey),
    completeRegistration: (connectionId: string, idempotencyKey?: string) =>
      this.completeMetaRegistration(connectionId, idempotencyKey),
  };

  constructor(private readonly http: HttpClient) {}

  async list(query: ListProviderConnectionsQuery = {}): Promise<ListProviderConnectionsResponse> {
    const qs = toQs({
      limit: query.limit,
      starting_after: query.starting_after,
    });
    return this.http.request<ListProviderConnectionsResponse>(
      'GET',
      `/v1/provider-connections${qs}`,
    );
  }

  async status(): Promise<ProviderConnectionStatusResponse> {
    return this.http.request<ProviderConnectionStatusResponse>(
      'GET',
      '/v1/provider-connections/status',
    );
  }

  async metaOnboarding(): Promise<MetaOnboardingConfigResponse> {
    return this.http.request<MetaOnboardingConfigResponse>(
      'GET',
      '/v1/provider-connections/meta/onboarding',
    );
  }

  async registerMeta(
    body: RegisterMetaConnectionRequest,
    idempotencyKey?: string,
  ): Promise<ProviderConnectionResponse> {
    return this.http.request<ProviderConnectionResponse>(
      'POST',
      '/v1/provider-connections/meta',
      body,
      idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {},
    );
  }

  async exchangeMetaOAuthCode(
    body: ExchangeMetaOAuthCodeRequest,
    idempotencyKey?: string,
  ): Promise<ProviderConnectionResponse> {
    return this.http.request<ProviderConnectionResponse>(
      'POST',
      '/v1/provider-connections/meta/oauth',
      body,
      idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {},
    );
  }

  /**
   * Finishes a Meta WhatsApp connection left `pending` because signup stopped
   * after the access token was already brokered. Re-runs the remaining provider
   * steps from the stored credentials — no browser signup run, no request body.
   */
  async completeMetaRegistration(
    connectionId: string,
    idempotencyKey?: string,
  ): Promise<ProviderConnectionResponse> {
    return this.http.request<ProviderConnectionResponse>(
      'POST',
      `/v1/provider-connections/${connectionId}/meta/complete-registration`,
      undefined,
      idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {},
    );
  }

  async rotateToken(
    connectionId: string,
    body: RotateProviderConnectionTokenRequest,
    idempotencyKey?: string,
  ): Promise<ProviderConnectionResponse> {
    return this.http.request<ProviderConnectionResponse>(
      'POST',
      `/v1/provider-connections/${connectionId}/rotate`,
      body,
      idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {},
    );
  }

  async retrieve(connectionId: string): Promise<ProviderConnectionResponse> {
    return this.http.request<ProviderConnectionResponse>(
      'GET',
      `/v1/provider-connections/${connectionId}`,
    );
  }

  async delete(connectionId: string): Promise<DeleteProviderConnectionResponse> {
    return this.http.request<DeleteProviderConnectionResponse>(
      'DELETE',
      `/v1/provider-connections/${connectionId}`,
    );
  }
}
