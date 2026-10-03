import type {
  CreateMessageRequest,
  ListMessagesQuery,
  ListMessagesResponse,
  MessageMediaTranscriptResponse,
  MessageDetailResponse,
  MessageResponse,
  TypingIndicatorResponse,
  RequestMessageMediaTranscription,
} from '../contracts.js';
import type { HttpClient } from '../client.js';
import { toQs } from './internal.js';

type MessageKind = CreateMessageRequest['message']['type'];
type CreateMessageInput<TType extends MessageKind> = Omit<
  Extract<CreateMessageRequest, { message: { type: TType } }>,
  'message'
> &
  Omit<Extract<CreateMessageRequest, { message: { type: TType } }>['message'], 'type'>;
export type CreateMessageOptions = { idempotencyKey?: string; traceId?: string };
export type TypingIndicatorOptions = { traceId?: string };
/** Required because retry creates one bounded manual transcription generation. */
export type RetryMessageMediaTranscriptionOptions = { idempotencyKey: string; traceId?: string };

export class MessagesResource {
  constructor(private readonly http: HttpClient) {}

  async create(
    input: CreateMessageRequest,
    options: CreateMessageOptions = {},
  ): Promise<MessageResponse> {
    const headers: Record<string, string> = {};
    if (options.idempotencyKey) headers['idempotency-key'] = options.idempotencyKey;
    if (options.traceId) headers['tyxter-trace-id'] = options.traceId;
    return this.http.request<MessageResponse>('POST', '/v1/messages', input, headers);
  }

  async sendText(
    input: CreateMessageInput<'text'>,
    options: CreateMessageOptions = {},
  ): Promise<MessageResponse> {
    const { text, ...base } = input;
    return this.create(
      { ...base, message: { type: 'text', text } } as CreateMessageRequest,
      options,
    );
  }

  async sendTemplate(
    input: CreateMessageInput<'template'>,
    options: CreateMessageOptions = {},
  ): Promise<MessageResponse> {
    const { template, ...base } = input;
    return this.create(
      { ...base, message: { type: 'template', template } } as CreateMessageRequest,
      options,
    );
  }

  async sendMedia(
    input: CreateMessageInput<'media'>,
    options: CreateMessageOptions = {},
  ): Promise<MessageResponse> {
    const { media, ...base } = input;
    return this.create(
      { ...base, message: { type: 'media', media } } as CreateMessageRequest,
      options,
    );
  }

  async sendInteractive(
    input: CreateMessageInput<'interactive'>,
    options: CreateMessageOptions = {},
  ): Promise<MessageResponse> {
    const { interactive, ...base } = input;
    return this.create(
      { ...base, message: { type: 'interactive', interactive } } as CreateMessageRequest,
      options,
    );
  }

  async sendFlow(
    input: CreateMessageInput<'flow'>,
    options: CreateMessageOptions = {},
  ): Promise<MessageResponse> {
    const { flow, ...base } = input;
    return this.create(
      { ...base, message: { type: 'flow', flow } } as CreateMessageRequest,
      options,
    );
  }

  async list(query: Partial<ListMessagesQuery> = {}): Promise<ListMessagesResponse> {
    return this.http.request<ListMessagesResponse>('GET', `/v1/messages${toQs(query)}`);
  }

  async retrieve(messageId: string): Promise<MessageDetailResponse> {
    return this.http.request<MessageDetailResponse>('GET', `/v1/messages/${messageId}`);
  }

  async requestTranscription(
    messageId: string,
    input: RequestMessageMediaTranscription = {},
    options: { traceId?: string } = {},
  ): Promise<MessageMediaTranscriptResponse> {
    const headers: Record<string, string> = {};
    if (options.traceId) headers['tyxter-trace-id'] = options.traceId;
    return this.http.request<MessageMediaTranscriptResponse>(
      'POST',
      `/v1/messages/${messageId}/transcription`,
      input,
      headers,
    );
  }

  async retrieveTranscription(messageId: string): Promise<MessageMediaTranscriptResponse> {
    return this.http.request<MessageMediaTranscriptResponse>(
      'GET',
      `/v1/messages/${messageId}/transcription`,
    );
  }

  async retryTranscription(
    messageId: string,
    input: RequestMessageMediaTranscription,
    options: RetryMessageMediaTranscriptionOptions,
  ): Promise<MessageMediaTranscriptResponse> {
    const rawIdempotencyKey = options?.idempotencyKey;
    if (typeof rawIdempotencyKey !== 'string' || rawIdempotencyKey.trim().length === 0) {
      throw new TypeError(
        'messages.retryTranscription requires a non-blank options.idempotencyKey.',
      );
    }

    const headers: Record<string, string> = { 'idempotency-key': rawIdempotencyKey.trim() };
    if (options.traceId) headers['tyxter-trace-id'] = options.traceId;
    return this.http.request<MessageMediaTranscriptResponse>(
      'POST',
      `/v1/messages/${messageId}/transcription/retry`,
      input,
      headers,
    );
  }

  async cancel(
    messageId: string,
    options: { idempotencyKey?: string } = {},
  ): Promise<MessageDetailResponse> {
    const headers: Record<string, string> = {};
    if (options.idempotencyKey) headers['idempotency-key'] = options.idempotencyKey;
    return this.http.request<MessageDetailResponse>(
      'POST',
      `/v1/messages/${messageId}/cancel`,
      undefined,
      headers,
    );
  }

  /**
   * Marks an inbound WhatsApp message as read and shows the typing indicator on
   * that conversation. Both effects always travel together.
   *
   * WhatsApp draws the indicator for at most 25 seconds and dismisses it as soon
   * as the reply is delivered, so call this immediately before composing rather
   * than on receipt. Only inbound WhatsApp messages received within the last 30
   * days can be targeted. Nothing is persisted — no message is created, no webhook
   * fires, and there is no delivery status to poll — so the returned
   * acknowledgement is the only confirmation, and the call is never billed.
   *
   * Takes no idempotency key: the call stores nothing, so a repeat is already
   * indistinguishable from the first. Pass traceId to join the 202 request to
   * the asynchronously dispatched provider attempt.
   */
  async typing(
    messageId: string,
    options: TypingIndicatorOptions = {},
  ): Promise<TypingIndicatorResponse> {
    const headers: Record<string, string> = {};
    if (options.traceId) headers['tyxter-trace-id'] = options.traceId;
    return this.http.request<TypingIndicatorResponse>(
      'POST',
      `/v1/messages/${messageId}/typing`,
      undefined,
      headers,
    );
  }
}
