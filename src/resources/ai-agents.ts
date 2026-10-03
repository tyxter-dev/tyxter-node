import type { HttpClient } from '../client.js';
import type {
  AIAgentCompletionRequest,
  AIAgentCompletionResponse,
  AIAgentResponse,
  CreateAIAgentRequest,
  DeleteAIAgentResponse,
  ListAIAgentPromptVersionsResponse,
  ListAIAgentResponseLogsResponse,
  ListAIAgentsResponse,
  UpdateAIAgentRequest,
} from '../contracts.js';
import { toQs } from './internal.js';

type RequestOptions = { idempotencyKey?: string; traceId?: string };

function headersFor(options: RequestOptions): Record<string, string> {
  const headers: Record<string, string> = {};
  if (options.idempotencyKey) headers['idempotency-key'] = options.idempotencyKey;
  if (options.traceId) headers['tyxter-trace-id'] = options.traceId;
  return headers;
}

export class AIAgentsResource {
  constructor(private readonly http: HttpClient) {}

  async create(
    input: CreateAIAgentRequest,
    options: RequestOptions = {},
  ): Promise<AIAgentResponse> {
    return this.http.request<AIAgentResponse>('POST', '/v1/ai-agents', input, headersFor(options));
  }

  async list(
    query: { limit?: number; starting_after?: string; include_archived?: boolean } = {},
  ): Promise<ListAIAgentsResponse> {
    return this.http.request<ListAIAgentsResponse>('GET', `/v1/ai-agents${toQs(query)}`);
  }

  async retrieve(id: string): Promise<AIAgentResponse> {
    return this.http.request<AIAgentResponse>('GET', `/v1/ai-agents/${id}`);
  }

  async update(id: string, input: UpdateAIAgentRequest): Promise<AIAgentResponse> {
    return this.http.request<AIAgentResponse>('PATCH', `/v1/ai-agents/${id}`, input);
  }

  async delete(id: string): Promise<DeleteAIAgentResponse> {
    return this.http.request<DeleteAIAgentResponse>('DELETE', `/v1/ai-agents/${id}`);
  }

  async listPromptVersions(
    id: string,
    query: { limit?: number; starting_after?: string } = {},
  ): Promise<ListAIAgentPromptVersionsResponse> {
    return this.http.request<ListAIAgentPromptVersionsResponse>(
      'GET',
      `/v1/ai-agents/${id}/prompt-versions${toQs(query)}`,
    );
  }

  async listResponseLogs(
    id: string,
    query: { limit?: number; starting_after?: string } = {},
  ): Promise<ListAIAgentResponseLogsResponse> {
    return this.http.request<ListAIAgentResponseLogsResponse>(
      'GET',
      `/v1/ai-agents/${id}/response-logs${toQs(query)}`,
    );
  }

  async complete(
    id: string,
    input: AIAgentCompletionRequest,
    options: RequestOptions = {},
  ): Promise<AIAgentCompletionResponse> {
    return this.http.request<AIAgentCompletionResponse>(
      'POST',
      `/v1/ai-agents/${id}/completions`,
      input,
      headersFor(options),
    );
  }
}
