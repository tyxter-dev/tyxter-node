import type {
  CreateWebhookEndpointRequest,
  CreateWebhookEndpointResponse,
  ListWebhookEndpointsResponse,
  RotateWebhookSigningSecretResponse,
  TestWebhookEndpointResponse,
  WebhookEndpointResponse,
  WebhookEndpointUpdateRequest,
} from '../contracts.js';
import type { HttpClient } from '../client.js';
import { toQs } from './internal.js';

function idempotencyHeaders(options: { idempotencyKey?: string }): Record<string, string> {
  const headers: Record<string, string> = {};
  if (options.idempotencyKey) headers['idempotency-key'] = options.idempotencyKey;
  return headers;
}

export class WebhookEndpointsResource {
  constructor(private readonly http: HttpClient) {}

  async create(
    input: CreateWebhookEndpointRequest,
    options: { idempotencyKey?: string } = {},
  ): Promise<CreateWebhookEndpointResponse> {
    return this.http.request<CreateWebhookEndpointResponse>(
      'POST',
      '/v1/webhook-endpoints',
      input,
      idempotencyHeaders(options),
    );
  }

  async list(
    query: { limit?: number; starting_after?: string } = {},
  ): Promise<ListWebhookEndpointsResponse> {
    return this.http.request<ListWebhookEndpointsResponse>(
      'GET',
      `/v1/webhook-endpoints${toQs(query)}`,
    );
  }

  async retrieve(id: string): Promise<WebhookEndpointResponse> {
    return this.http.request<WebhookEndpointResponse>('GET', `/v1/webhook-endpoints/${id}`);
  }

  async update(
    id: string,
    input: WebhookEndpointUpdateRequest,
    options: { idempotencyKey?: string } = {},
  ): Promise<WebhookEndpointResponse> {
    return this.http.request<WebhookEndpointResponse>(
      'PATCH',
      `/v1/webhook-endpoints/${id}`,
      input,
      idempotencyHeaders(options),
    );
  }

  async rotateSigningSecret(
    id: string,
    options: { idempotencyKey?: string } = {},
  ): Promise<RotateWebhookSigningSecretResponse> {
    return this.http.request<RotateWebhookSigningSecretResponse>(
      'POST',
      `/v1/webhook-endpoints/${id}/rotate-signing-secret`,
      {},
      idempotencyHeaders(options),
    );
  }

  async test(
    id: string,
    options: { idempotencyKey?: string } = {},
  ): Promise<TestWebhookEndpointResponse> {
    return this.http.request<TestWebhookEndpointResponse>(
      'POST',
      `/v1/webhook-endpoints/${id}/test`,
      undefined,
      idempotencyHeaders(options),
    );
  }

  async delete(
    id: string,
    options: { idempotencyKey?: string } = {},
  ): Promise<WebhookEndpointResponse> {
    return this.http.request<WebhookEndpointResponse>(
      'DELETE',
      `/v1/webhook-endpoints/${id}`,
      undefined,
      idempotencyHeaders(options),
    );
  }
}
