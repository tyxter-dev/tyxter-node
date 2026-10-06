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

  async retrieve(id: string, options: { traceId?: string } = {}): Promise<MessageBatchResponse> {
    return this.http.request<MessageBatchResponse>(
      'GET',
      `/v1/batches/${id}`,
      undefined,
      controlHeaders(options),
    );
  }

  async pause(
    id: string,
    options: { idempotencyKey?: string; traceId?: string } = {},
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
    options: { idempotencyKey?: string; traceId?: string } = {},
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
    options: { idempotencyKey?: string; traceId?: string } = {},
  ): Promise<MessageBatchResponse> {
    return this.http.request<MessageBatchResponse>(
      'POST',
      `/v1/batches/${id}/cancel`,
      {},
      controlHeaders(options),
    );
  }

  async failures(
    id: string,
    options: { traceId?: string } = {},
  ): Promise<MessageBatchFailureExportResponse> {
    return this.http.request<MessageBatchFailureExportResponse>(
      'GET',
      `/v1/batches/${id}/failures`,
      undefined,
      controlHeaders(options),
    );
  }

  async list(
    query: { limit?: number; starting_after?: string } = {},
    options: { traceId?: string } = {},
  ): Promise<ListMessageBatchesResponse> {
    return this.http.request<ListMessageBatchesResponse>(
      'GET',
      `/v1/batches${toQs(query)}`,
      undefined,
      controlHeaders(options),
    );
  }
}

function controlHeaders(options: {
  idempotencyKey?: string;
  traceId?: string;
}): Record<string, string> {
  const headers: Record<string, string> = {};
  if (options.idempotencyKey) headers['idempotency-key'] = options.idempotencyKey;
  if (options.traceId) headers['tyxter-trace-id'] = options.traceId;
  return headers;
}
