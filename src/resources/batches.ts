import type {
  CreateMessageBatchRequest,
  ListMessageBatchesResponse,
  MessageBatchFailureExportResponse,
  MessageBatchResponse,
} from '../contracts.js';
import type { HttpClient } from '../client.js';
import { toQs } from './internal.js';

export class BatchesResource {
  constructor(private readonly http: HttpClient) {}

  async create(
    input: CreateMessageBatchRequest,
    options: { idempotencyKey?: string; traceId?: string } = {},
  ): Promise<MessageBatchResponse> {
    const headers: Record<string, string> = {};
    if (options.idempotencyKey) headers['idempotency-key'] = options.idempotencyKey;
    if (options.traceId) headers['tyxter-trace-id'] = options.traceId;
    return this.http.request<MessageBatchResponse>('POST', '/v1/batches', input, headers);
  }

  async retrieve(id: string): Promise<MessageBatchResponse> {
    return this.http.request<MessageBatchResponse>('GET', `/v1/batches/${id}`);
  }

  async pause(
    id: string,
    options: { idempotencyKey?: string } = {},
  ): Promise<MessageBatchResponse> {
    return this.http.request<MessageBatchResponse>(
      'POST',
      `/v1/batches/${id}/pause`,
      {},
      controlHeaders(options),
    );
  }

  async resume(
    id: string,
    options: { idempotencyKey?: string } = {},
  ): Promise<MessageBatchResponse> {
    return this.http.request<MessageBatchResponse>(
      'POST',
      `/v1/batches/${id}/resume`,
      {},
      controlHeaders(options),
    );
  }

  async cancel(
    id: string,
    options: { idempotencyKey?: string } = {},
  ): Promise<MessageBatchResponse> {
    return this.http.request<MessageBatchResponse>(
      'POST',
      `/v1/batches/${id}/cancel`,
      {},
      controlHeaders(options),
    );
  }

  async failures(id: string): Promise<MessageBatchFailureExportResponse> {
    return this.http.request<MessageBatchFailureExportResponse>(
      'GET',
      `/v1/batches/${id}/failures`,
    );
  }

  async list(
    query: { limit?: number; starting_after?: string } = {},
  ): Promise<ListMessageBatchesResponse> {
    return this.http.request<ListMessageBatchesResponse>('GET', `/v1/batches${toQs(query)}`);
  }
}

function controlHeaders(options: { idempotencyKey?: string }): Record<string, string> {
  const headers: Record<string, string> = {};
  if (options.idempotencyKey) headers['idempotency-key'] = options.idempotencyKey;
  return headers;
}
