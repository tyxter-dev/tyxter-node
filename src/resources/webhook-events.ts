import type {
  BulkResendWebhookEventsRequest,
  BulkResendWebhookEventsResponse,
  CreateWebhookListenSessionRequest,
  ListenWebhookEventsQuery,
  ListenWebhookEventsResponse,
  ListWebhookEventsQuery,
  ListWebhookEventsResponse,
  ResendWebhookEventResponse,
  RetrieveListenWebhookEventQuery,
  WebhookEventLogResponse,
  WebhookListenSessionResponse,
} from '../contracts.js';
import type { HttpClient } from '../client.js';
import { toQs } from './internal.js';

export class WebhookEventsResource {
  constructor(private readonly http: HttpClient) {}

  async list(query: Partial<ListWebhookEventsQuery> = {}): Promise<ListWebhookEventsResponse> {
    return this.http.request<ListWebhookEventsResponse>('GET', `/v1/webhook-events${toQs(query)}`);
  }

  async listen(
    query: Partial<ListenWebhookEventsQuery> = {},
  ): Promise<ListenWebhookEventsResponse> {
    return this.http.request<ListenWebhookEventsResponse>(
      'GET',
      `/v1/webhook-events/listen${toQs(query)}`,
    );
  }

  async retrieveListenEvent(
    outboxEventId: string,
    query: Partial<RetrieveListenWebhookEventQuery> = {},
  ): Promise<WebhookEventLogResponse> {
    return this.http.request<WebhookEventLogResponse>(
      'GET',
      `/v1/webhook-events/listen/${encodeURIComponent(outboxEventId)}${toQs(query)}`,
    );
  }

  async createListenSession(
    input: CreateWebhookListenSessionRequest = {},
  ): Promise<WebhookListenSessionResponse> {
    return this.http.request<WebhookListenSessionResponse>(
      'POST',
      '/v1/webhook-events/listen-sessions',
      input,
    );
  }

  async disableListenSession(id: string): Promise<WebhookListenSessionResponse> {
    return this.http.request<WebhookListenSessionResponse>(
      'DELETE',
      `/v1/webhook-events/listen-sessions/${encodeURIComponent(id)}`,
    );
  }

  async retrieve(id: string): Promise<WebhookEventLogResponse> {
    return this.http.request<WebhookEventLogResponse>('GET', `/v1/webhook-events/${id}`);
  }

  async resend(
    id: string,
    options: { idempotencyKey?: string } = {},
  ): Promise<ResendWebhookEventResponse> {
    const headers: Record<string, string> = {};
    if (options.idempotencyKey) headers['idempotency-key'] = options.idempotencyKey;
    return this.http.request<ResendWebhookEventResponse>(
      'POST',
      `/v1/webhook-events/${id}/resend`,
      undefined,
      headers,
    );
  }

  async bulkResend(
    input: BulkResendWebhookEventsRequest,
    options: { idempotencyKey?: string } = {},
  ): Promise<BulkResendWebhookEventsResponse> {
    const headers: Record<string, string> = {};
    if (options.idempotencyKey) headers['idempotency-key'] = options.idempotencyKey;
    return this.http.request<BulkResendWebhookEventsResponse>(
      'POST',
      '/v1/webhook-events/bulk-resend',
      input,
      headers,
    );
  }
}
