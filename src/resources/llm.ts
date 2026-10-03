import type {
  LLMCompletionRequest,
  LLMCompletionResponse,
  LLMRouteResponse,
  ListLLMResponseLogsQuery,
  ListLLMResponseLogsResponse,
  ListLLMRoutePromptVersionsQuery,
  ListLLMRoutePromptVersionsResponse,
  UpdateLLMRouteRequest,
  UpsertLLMRouteRequest,
} from '../contracts.js';
import type { HttpClient } from '../client.js';
import { toQs } from './internal.js';

export class LLMResource {
  constructor(private readonly http: HttpClient) {}

  async upsertRoute(
    input: UpsertLLMRouteRequest,
    options: { idempotencyKey?: string } = {},
  ): Promise<LLMRouteResponse> {
    const headers: Record<string, string> = {};
    if (options.idempotencyKey) headers['idempotency-key'] = options.idempotencyKey;
    return this.http.request<LLMRouteResponse>('PUT', '/v1/llm-routes', input, headers);
  }

  async getRoute(): Promise<LLMRouteResponse> {
    return this.http.request<LLMRouteResponse>('GET', '/v1/llm-routes');
  }

  async updateRoute(
    input: UpdateLLMRouteRequest,
    query: { phone_number_id?: string } = {},
  ): Promise<LLMRouteResponse> {
    return this.http.request<LLMRouteResponse>('PATCH', `/v1/llm-routes${toQs(query)}`, input);
  }

  async deleteRoute(
    options: { idempotencyKey?: string } = {},
  ): Promise<{ id: string; deleted: true }> {
    const headers: Record<string, string> = {};
    if (options.idempotencyKey) headers['idempotency-key'] = options.idempotencyKey;
    return this.http.request<{ id: string; deleted: true }>(
      'DELETE',
      '/v1/llm-routes',
      undefined,
      headers,
    );
  }

  async listRoutePromptVersions(
    query: Partial<ListLLMRoutePromptVersionsQuery> = {},
  ): Promise<ListLLMRoutePromptVersionsResponse> {
    return this.http.request<ListLLMRoutePromptVersionsResponse>(
      'GET',
      `/v1/llm-routes/prompt-versions${toQs(query)}`,
    );
  }

  async listResponses(
    query: Partial<ListLLMResponseLogsQuery> = {},
  ): Promise<ListLLMResponseLogsResponse> {
    return this.http.request<ListLLMResponseLogsResponse>('GET', `/v1/llm/responses${toQs(query)}`);
  }

  async complete(
    input: LLMCompletionRequest,
    options: { traceId?: string; idempotencyKey?: string } = {},
  ): Promise<LLMCompletionResponse> {
    const headers: Record<string, string> = {};
    if (options.traceId) headers['tyxter-trace-id'] = options.traceId;
    if (options.idempotencyKey) headers['idempotency-key'] = options.idempotencyKey;
    return this.http.request<LLMCompletionResponse>('POST', '/v1/llm/completions', input, headers);
  }
}
