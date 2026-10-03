import type { HttpClient } from '../client.js';
import type {
  CreateProviderCredentialSetupSessionRequest,
  ProviderCredentialSetupSessionResponse,
} from '../contracts.js';

export class ProviderCredentialSetupSessionsResource {
  constructor(private readonly http: HttpClient) {}

  async create(
    body: CreateProviderCredentialSetupSessionRequest,
    idempotencyKey?: string,
  ): Promise<ProviderCredentialSetupSessionResponse> {
    return this.http.request<ProviderCredentialSetupSessionResponse>(
      'POST',
      '/v1/provider-credential-setup-sessions',
      body,
      idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {},
    );
  }

  async retrieve(requestId: string): Promise<ProviderCredentialSetupSessionResponse> {
    return this.http.request<ProviderCredentialSetupSessionResponse>(
      'GET',
      `/v1/provider-credential-setup-sessions/${encodeURIComponent(requestId)}`,
    );
  }
}
