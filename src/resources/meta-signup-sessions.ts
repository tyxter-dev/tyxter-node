import type { HttpClient } from '../client.js';
import type { CreateMetaSignupSessionRequest, MetaSignupSessionResponse } from '../contracts.js';

export class MetaSignupSessionsResource {
  constructor(private readonly http: HttpClient) {}

  async create(
    body: CreateMetaSignupSessionRequest,
    idempotencyKey: string,
  ): Promise<MetaSignupSessionResponse> {
    return this.http.request<MetaSignupSessionResponse>('POST', '/v1/meta-signup-sessions', body, {
      'Idempotency-Key': idempotencyKey,
    });
  }

  async retrieve(sessionId: string): Promise<MetaSignupSessionResponse> {
    return this.http.request<MetaSignupSessionResponse>(
      'GET',
      `/v1/meta-signup-sessions/${encodeURIComponent(sessionId)}`,
    );
  }
}
