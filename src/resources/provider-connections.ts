import type { MetaConnectionMutationResponse } from '../display-name-contracts.js';
import type { HttpClient } from '../client.js';
import type {
  DeleteProviderConnectionResponse,
  ExchangeMetaOAuthCodeRequest,
  ListProviderConnectionsResponse,
  ListSalvyNumbersResponse,
  MetaOnboardingConfigResponse,
  ProviderConnectionResponse,
  ProviderConnectionStatusResponse,
  RegisterSalvyConnectionRequest,
  RegisterMetaConnectionRequest,
  RotateSalvyConnectionRequest,
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

  readonly salvy = {
    register: (body: RegisterSalvyConnectionRequest, idempotencyKey: string) =>
      this.registerSalvy(body, idempotencyKey),
    rotate: (connectionId: string, body: RotateSalvyConnectionRequest, idempotencyKey: string) =>
      this.rotateSalvy(connectionId, body, idempotencyKey),
    refreshDiscovery: (connectionId: string, idempotencyKey: string) =>
      this.refreshSalvyDiscovery(connectionId, idempotencyKey),
    listNumbers: (connectionId: string, query: ListProviderConnectionsQuery = {}) =>
      this.listSalvyNumbers(connectionId, query),
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
  ): Promise<MetaConnectionMutationResponse> {
    return this.http.request<MetaConnectionMutationResponse>(
      'POST',
      '/v1/provider-connections/meta',
      body,
      idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {},
    );
  }

  async registerSalvy(
    body: RegisterSalvyConnectionRequest,
    idempotencyKey: string,
  ): Promise<ProviderConnectionResponse> {
    return this.http.request<ProviderConnectionResponse>(
      'POST',
      '/v1/provider-connections/salvy',
      body,
      { 'Idempotency-Key': idempotencyKey },
    );
  }

  async rotateSalvy(
    connectionId: string,
    body: RotateSalvyConnectionRequest,
    idempotencyKey: string,
  ): Promise<ProviderConnectionResponse> {
    return this.http.request<ProviderConnectionResponse>(
      'POST',
      `/v1/provider-connections/${connectionId}/salvy/rotate`,
      body,
      { 'Idempotency-Key': idempotencyKey },
    );
  }

  async refreshSalvyDiscovery(
    connectionId: string,
    idempotencyKey: string,
  ): Promise<ProviderConnectionResponse> {
    return this.http.request<ProviderConnectionResponse>(
      'POST',
      `/v1/provider-connections/${connectionId}/salvy/discovery`,
      {},
      { 'Idempotency-Key': idempotencyKey },
    );
  }

  async listSalvyNumbers(
    connectionId: string,
    query: ListProviderConnectionsQuery = {},
  ): Promise<ListSalvyNumbersResponse> {
    const qs = toQs({ limit: query.limit, starting_after: query.starting_after });
    return this.http.request<ListSalvyNumbersResponse>(
      'GET',
      `/v1/provider-connections/${connectionId}/salvy/numbers${qs}`,
    );
  }

  async exchangeMetaOAuthCode(
    body: ExchangeMetaOAuthCodeRequest,
    idempotencyKey?: string,
  ): Promise<MetaConnectionMutationResponse> {
    return this.http.request<MetaConnectionMutationResponse>(
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
  ): Promise<MetaConnectionMutationResponse> {
    return this.http.request<MetaConnectionMutationResponse>(
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
