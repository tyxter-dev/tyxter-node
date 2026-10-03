import type { CreateFlowRequest, FlowResponse, ListFlowsResponse } from '../contracts.js';
import type { HttpClient } from '../client.js';
import { toQs } from './internal.js';

export class FlowsResource {
  constructor(private readonly http: HttpClient) {}

  async create(
    input: CreateFlowRequest,
    options: { idempotencyKey?: string } = {},
  ): Promise<FlowResponse> {
    const headers: Record<string, string> = {};
    if (options.idempotencyKey) headers['idempotency-key'] = options.idempotencyKey;
    return this.http.request<FlowResponse>('POST', '/v1/flows', input, headers);
  }

  async list(query: { limit?: number; starting_after?: string } = {}): Promise<ListFlowsResponse> {
    return this.http.request<ListFlowsResponse>('GET', `/v1/flows${toQs(query)}`);
  }

  async retrieve(id: string): Promise<FlowResponse> {
    return this.http.request<FlowResponse>('GET', `/v1/flows/${id}`);
  }

  async publish(id: string, options: { idempotencyKey?: string } = {}): Promise<FlowResponse> {
    const headers: Record<string, string> = {};
    if (options.idempotencyKey) headers['idempotency-key'] = options.idempotencyKey;
    return this.http.request<FlowResponse>('POST', `/v1/flows/${id}/publish`, undefined, headers);
  }
}
