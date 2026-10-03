import type {
  AudienceResponse,
  CreateAudienceRequest,
  ListAudiencesResponse,
  UpdateAudienceRequest,
} from '../contracts.js';
import type { HttpClient } from '../client.js';
import { toQs } from './internal.js';

export class AudiencesResource {
  constructor(private readonly http: HttpClient) {}

  async create(
    input: CreateAudienceRequest,
    options: { idempotencyKey?: string; traceId?: string } = {},
  ): Promise<AudienceResponse> {
    const headers: Record<string, string> = {};
    if (options.idempotencyKey) headers['idempotency-key'] = options.idempotencyKey;
    if (options.traceId) headers['tyxter-trace-id'] = options.traceId;
    return this.http.request<AudienceResponse>('POST', '/v1/audiences', input, headers);
  }

  async list(
    query: { limit?: number; starting_after?: string } = {},
  ): Promise<ListAudiencesResponse> {
    return this.http.request<ListAudiencesResponse>('GET', `/v1/audiences${toQs(query)}`);
  }

  async retrieve(id: string): Promise<AudienceResponse> {
    return this.http.request<AudienceResponse>('GET', `/v1/audiences/${id}`);
  }

  async update(
    id: string,
    input: UpdateAudienceRequest,
    options: { idempotencyKey?: string } = {},
  ): Promise<AudienceResponse> {
    const headers: Record<string, string> = {};
    if (options.idempotencyKey) headers['idempotency-key'] = options.idempotencyKey;
    return this.http.request<AudienceResponse>('PATCH', `/v1/audiences/${id}`, input, headers);
  }

  async delete(id: string, options: { idempotencyKey?: string } = {}): Promise<AudienceResponse> {
    const headers: Record<string, string> = {};
    if (options.idempotencyKey) headers['idempotency-key'] = options.idempotencyKey;
    return this.http.request<AudienceResponse>('DELETE', `/v1/audiences/${id}`, undefined, headers);
  }
}
