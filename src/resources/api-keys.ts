import type {
  ApiKeyResponse,
  CreateApiKeyRequest,
  CreateApiKeyResponse,
  ListApiKeysResponse,
  RenameApiKeyRequest,
  RotateApiKeyResponse,
} from '../contracts.js';
import type { HttpClient } from '../client.js';
import { toQs } from './internal.js';

export class ApiKeysResource {
  constructor(private readonly http: HttpClient) {}

  async create(
    input: CreateApiKeyRequest,
    options: { idempotencyKey?: string } = {},
  ): Promise<CreateApiKeyResponse> {
    const headers: Record<string, string> = {};
    if (options.idempotencyKey) headers['idempotency-key'] = options.idempotencyKey;
    return this.http.request<CreateApiKeyResponse>('POST', '/v1/api-keys', input, headers);
  }

  async list(
    query: { limit?: number; starting_after?: string } = {},
  ): Promise<ListApiKeysResponse> {
    return this.http.request<ListApiKeysResponse>('GET', `/v1/api-keys${toQs(query)}`);
  }

  async retrieve(id: string): Promise<ApiKeyResponse> {
    return this.http.request<ApiKeyResponse>('GET', `/v1/api-keys/${id}`);
  }

  async rename(id: string, input: RenameApiKeyRequest): Promise<ApiKeyResponse> {
    return this.http.request<ApiKeyResponse>('PATCH', `/v1/api-keys/${id}`, input);
  }

  async revoke(id: string): Promise<ApiKeyResponse> {
    return this.http.request<ApiKeyResponse>('DELETE', `/v1/api-keys/${id}`);
  }

  async rotate(
    id: string,
    options: { idempotencyKey?: string } = {},
  ): Promise<RotateApiKeyResponse> {
    const headers: Record<string, string> = {};
    if (options.idempotencyKey) headers['idempotency-key'] = options.idempotencyKey;
    return this.http.request<RotateApiKeyResponse>(
      'POST',
      `/v1/api-keys/${id}/rotate`,
      {},
      headers,
    );
  }
}
