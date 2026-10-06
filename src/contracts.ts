export type EnvironmentKind = 'sandbox' | 'production';
export type JsonObject = Record<string, unknown>;

export interface ListResponse<T> {
  object: 'list';
  data: T[];
  has_more: boolean;
  next_cursor: string | null;
}

/**
 * Machine-readable pointer present only on unhandled
 * `internal_error` responses from public `/v1/*` routes. Additive and optional:
 * older SDKs ignore it, newer ones can surface "report this" affordances.
 */
export interface ErrorFeedbackPointer {
  endpoint: string;
  method: string;
}

/**
 * Machine-readable pointer to the two discovery documents that describe what the
 * API serves — the OpenAPI spec and the capability manifest — present only on
 * `route_not_found` responses from public `/v1/*` paths. Both values are constant
 * relative paths on the API host. Additive and optional: older SDKs ignore it,
 * newer ones can steer a caller that guessed a path back to the spec.
 */
export interface ErrorDiscoveryPointer {
  openapi: string;
  well_known: string;
}

/** Bounded recovery metadata for an active production listen-session conflict. */
export interface WebhookListenSessionConflictDetails {
  active_session: {
    id: string;
    expires_at: string;
    created_at: string;
  };
}

export interface TyxterErrorBody {
  type: TyxterErrorType;
  code: string;
  message: string;
  param?: string;
  retry_after_ms?: number;
  retryable?: false;
  request_id?: string;
  trace_id?: string;
  feedback?: ErrorFeedbackPointer;
  discovery?: ErrorDiscoveryPointer;
  details?: WebhookListenSessionConflictDetails;
  [key: string]: unknown;
}

/**
 * Error `type` discriminants exactly as emitted on the wire by the API
 * (`TyxterError.toBody()` in `@tyxter/platform-errors`). This list is the SDK
 * mirror of the canonical contract and MUST stay identical to it —
 * `src/error-type-parity.test.ts` fails the build on any drift so an agent's
 * `if (err.type === 'not_found')` check can never silently stop matching a
 * real 404 (conformance is the contract).
 *
 * Closed on purpose (no `| string` escape hatch): a value the API can emit
 * that is absent here is a contract break we want to surface at compile time,
 * not paper over. `TyxterApiError.type` still carries whatever the server
 * actually sends at runtime, so a newer API error type never crashes an older
 * SDK — it only fails the parity gate until this list is updated.
 */
export const TYXTER_ERROR_TYPES = [
  'authentication_error',
  'authorization_error',
  'validation_error',
  'payment_required',
  'idempotency_conflict',
  'rate_limited',
  'not_found',
  'conflict',
  'provider_error',
  'internal_error',
  'service_unavailable',
] as const;

export type TyxterErrorType = (typeof TYXTER_ERROR_TYPES)[number];

export interface TyxterErrorResponse {
  error: TyxterErrorBody;
}

// --- Agent feedback intake (ADR-025) ---------------------------------------

export interface FeedbackRelatedError {
  code?: string;
  request_id?: string;
  trace_id?: string;
}

export interface CreateFeedbackRequest {
  message: string;
  related_error?: FeedbackRelatedError;
  context?: Record<string, string>;
}

export interface FeedbackReceiptResponse {
  id: string;
  object: 'feedback_receipt';
  received_at: string;
  redacted: boolean;
}

export interface ListPublicFeedbackReportsQuery {
  after?: string;
  limit?: number;
}

export type PublicFeedbackReportStatus = 'open' | 'resolved' | 'dismissed';

export type PublicFeedbackReportResolution =
  | {
      disposition: 'resolved' | 'dismissed';
      public_summary: string;
      published_at: string;
    }
  | {
      disposition: 'reopened';
      public_summary: string | null;
      published_at: string;
    };

export interface PublicFeedbackReportResponse {
  id: string;
  object: 'feedback_report';
  status: PublicFeedbackReportStatus;
  message_excerpt: string;
  created_at: string;
  latest_resolution: PublicFeedbackReportResolution | null;
}

export interface ListPublicFeedbackReportsResponse {
  object: 'list';
  data: PublicFeedbackReportResponse[];
  has_more: boolean;
  next_cursor: string | null;
}

export interface TextMessagePayload {
  body: string;
  preview_url?: boolean;
}

export interface TemplateMessagePayload {
  name: string;
  language: string;
  /**
   * Runtime BODY values. The resolved approved version, never this send request,
   * chooses the format: POSITIONAL bindings require numeric keys and NAMED
   * bindings require the exact BODY parameter names.
   */
  variables?: Record<string, string | number | boolean>;
  /**
   * Meta send components. Standalone COPY_CODE uses a button/copy_code component
   * with one coupon_code parameter whose value is at most 20 characters.
   */
  components?: JsonObject[];
  header_media?: TemplateHeaderMedia;
}

export interface TtsMediaSource {
  type: 'tts';
  provider: 'openai' | 'elevenlabs' | 'xai';
  text: string;
  voice: string;
  language: string;
  model?: string;
  instructions?: string;
}

export type MediaAssetKind = 'image' | 'document' | 'audio' | 'video' | 'sticker';
export type MediaAssetLifecycle = 'single_use' | 'library';
export type TemplateHeaderMediaKind = Extract<MediaAssetKind, 'image' | 'document' | 'video'>;

export interface TemplateHeaderMedia {
  kind: TemplateHeaderMediaKind;
  asset_id: string;
}

export interface InlineMediaPayload {
  filename: string;
  mime_type: string;
  base64: string;
}

export interface MediaMessagePayload {
  kind: MediaAssetKind;
  id?: string;
  link?: string;
  asset_id?: string;
  inline?: InlineMediaPayload;
  source?: TtsMediaSource;
  caption?: string;
  filename?: string;
  mime_type?: string;
  /**
   * Requests a native WhatsApp voice note for OGG/Opus mono audio. Omit this
   * field or pass `false` to send ordinary audio instead.
   */
  voice?: boolean;
}

export type InstagramMediaMessagePayload = Omit<MediaMessagePayload, 'kind' | 'voice'> & {
  kind: 'image' | 'document' | 'audio' | 'video';
};

export type InteractiveMessagePayload =
  | {
      type: 'button';
      header?: JsonObject;
      body: { text: string };
      footer?: { text: string };
      action: {
        buttons: Array<{ type: 'reply'; reply: { id: string; title: string } }>;
      };
    }
  | {
      type: 'list';
      header?: { type: 'text'; text: string };
      body: { text: string };
      footer?: { text: string };
      action: {
        button: string;
        sections: Array<{
          title?: string;
          rows: Array<{ id: string; title: string; description?: string }>;
        }>;
      };
    }
  | {
      type: 'order_details';
      header?: { type: 'image'; link: string };
      body: { text: string };
      footer?: { text: string };
      action: {
        name: 'review_and_pay';
        parameters: {
          reference_id: string;
          type: 'digital-goods' | 'physical-goods';
          payment_type: 'br';
          payment_settings: [
            {
              type: 'pix_dynamic_code';
              pix_dynamic_code: {
                code: string;
                merchant_name: string;
                key: string;
                key_type: 'CPF' | 'CNPJ' | 'EMAIL' | 'PHONE' | 'EVP';
              };
            },
          ];
          currency: 'BRL';
          total_amount: { value: number; offset: 100 };
          order?: {
            status: 'pending';
            catalog_id?: string;
            expiration?: { timestamp: string; description: string };
            tax: { value: number; offset: 100; description?: string };
            items: Array<{
              retailer_id: string;
              name: string;
              amount: { value: number; offset: 100 };
              quantity: number;
              sale_amount?: { value: number; offset: 100 };
            }>;
            subtotal: { value: number; offset: 100 };
            shipping?: { value: number; offset: 100; description?: string };
            discount?: {
              value: number;
              offset: 100;
              description?: string;
              discount_program_name?: string;
            };
          };
        };
      };
    };

export interface FlowMessagePayload {
  type: 'flow';
  header?: { type: 'text'; text: string };
  body: { text: string };
  footer?: { text: string };
  action: {
    name: 'flow';
    parameters: {
      flow_message_version?: string;
      flow_id?: string;
      flow_name?: string;
      flow_token: string;
      flow_cta: string;
      flow_action?: 'navigate' | 'data_exchange';
      flow_action_payload?: JsonObject;
    };
  };
}

export type MessageChannel = 'whatsapp' | 'instagram' | 'whatsapp_channel';

export type MessageIdentity =
  | { type: 'whatsapp_phone_number'; id: string }
  | { type: 'phone_e164'; id: string }
  | { type: 'instagram_account'; id: string }
  | { type: 'instagram_user'; id: string }
  | { type: 'whatsapp_channel'; id: string }
  | { type: 'whatsapp_channel_audience'; id: string };

/**
 * Output-only fallback for a phone-less inbound WhatsApp sender. Meta supplied
 * no phone number, so the empty id is unresolved and must not be used as a
 * recipient or replaced with a synthetic identifier.
 */
export type PhoneLessInboundSenderIdentity = { type: 'phone_e164'; id: '' };

export type MessageReadSenderIdentity =
  | (MessageIdentity & { profile_name: string | null })
  | (PhoneLessInboundSenderIdentity & { profile_name: string | null });

export type StructuredPhoneE164Identity = {
  type: 'phone_e164';
  country_calling_code: string;
  national_number: string;
};

export type WhatsAppRecipientIdentity =
  | { type: 'phone_e164'; id: string }
  | StructuredPhoneE164Identity;

interface OutboundMessageBase {
  metadata?: JsonObject;
}

export interface CreateWhatsAppMessageRequestBase extends OutboundMessageBase {
  channel: 'whatsapp';
  sender: { type: 'whatsapp_phone_number'; id: string };
  recipient: WhatsAppRecipientIdentity;
}

export interface CreateInstagramMessageRequestBase extends OutboundMessageBase {
  channel: 'instagram';
  sender: { type: 'instagram_account'; id: string };
  recipient: { type: 'instagram_user'; id: string };
}

/** @deprecated WhatsApp Channel publishing is unsupported; retained for source compatibility. */
export interface CreateWhatsAppChannelMessageRequestBase extends OutboundMessageBase {
  channel: 'whatsapp_channel';
  sender: { type: 'whatsapp_channel'; id: string };
  recipient: { type: 'whatsapp_channel_audience'; id: 'followers' };
}

export type CreateMessageRequest =
  | (CreateWhatsAppMessageRequestBase & {
      message: { type: 'text'; text: TextMessagePayload };
    })
  | (CreateWhatsAppMessageRequestBase & {
      message: { type: 'template'; template: TemplateMessagePayload };
    })
  | (CreateWhatsAppMessageRequestBase & {
      message: { type: 'media'; media: MediaMessagePayload };
    })
  | (CreateWhatsAppMessageRequestBase & {
      message: { type: 'interactive'; interactive: InteractiveMessagePayload };
    })
  | (CreateWhatsAppMessageRequestBase & {
      message: { type: 'flow'; flow: FlowMessagePayload };
    })
  | (CreateInstagramMessageRequestBase & {
      message: { type: 'text'; text: TextMessagePayload };
    })
  | (CreateInstagramMessageRequestBase & {
      message: { type: 'media'; media: InstagramMediaMessagePayload };
    })
  | (CreateWhatsAppChannelMessageRequestBase & {
      message: { type: 'text'; text: TextMessagePayload };
    })
  | (CreateWhatsAppChannelMessageRequestBase & {
      message: { type: 'media'; media: MediaMessagePayload };
    });

export type BatchRecipient = {
  to: string;
  variables?: Record<string, string | number | boolean>;
};

export type BatchAudience = {
  contact_ids: string[];
};

export type CreateMessageBatchBase = {
  channel: 'whatsapp';
  name?: string;
  from: string;
  template: {
    name: string;
    language: string;
    header_media?: TemplateHeaderMedia;
  };
  scheduled_for?: string;
  metadata?: JsonObject;
};

export type CreateMessageBatchRequest =
  | (CreateMessageBatchBase & { recipients: BatchRecipient[] })
  | (CreateMessageBatchBase & { audience: BatchAudience })
  | (CreateMessageBatchBase & { audience_id: string });

export interface MessageResponse {
  id: string;
  object: 'message';
  status: string;
  /**
   * Why this message is in its current status, when there is a reason worth
   * naming. The only value emitted today is `messaging_limit_pacing`: the
   * message is queued because the sending number has used up WhatsApp's daily
   * allowance of NEW recipients, so Tyxter is holding the send rather than
   * pushing it into a rejection. Nothing is lost and no action is needed — it
   * sends by itself once allowance frees up, and re-sending would only
   * duplicate it.
   *
   * `null` otherwise, including for a message queued for any other reason, so
   * `null` on its own never means "not paced" — read it together with `status`.
   * Typed as `string` rather than a union on purpose: treat the set of values as
   * open, because more reasons may be named later.
   */
  status_reason: string | null;
  channel: MessageChannel;
  environment: EnvironmentKind;
  template_id: string | null;
  template_version_id: string | null;
  template_version: number | null;
  created_at: string;
  trace_id: string;
}

export interface MessageEventResponse {
  id: string;
  type: string;
  status: string | null;
  payload: unknown;
  created_at: string;
}

/**
 * Raw provider failure detail (Meta Graph API `error` object), surfaced
 * alongside the normalized `error_code` on a failed message so an agent can read
 * the provider's own diagnostics. `null` on a non-failed message (#300).
 */
export interface MessageProviderError {
  message?: string | null;
  type?: string | null;
  code?: number | string | null;
  error_subcode?: number | string | null;
  error_data?: unknown;
  fbtrace_id?: string | null;
  error_user_title?: string | null;
  error_user_msg?: string | null;
}

export interface InboundMessageMediaFailure {
  code: string;
  message: string;
}

export interface MediaDownloadHint {
  method: 'GET';
  path: string;
}

interface InboundMessageMediaBase {
  asset_id: string;
  provider_media_id?: string;
  kind: 'image' | 'audio' | 'video' | 'document' | 'sticker';
  /** True when Meta identified this inbound audio attachment as a voice note. */
  voice?: boolean;
  mime_type: string;
  byte_length: number;
  filename: string | null;
}

/**
 * Tenant-safe inbound attachment descriptor shared by message reads and the
 * `message.received` webhook. Narrow on `status`: only `failed` carries a
 * failure object; `expired` and `deleted` retain the stable asset id even
 * after their bytes are gone.
 */
export type InboundMessageMediaDescriptor = InboundMessageMediaBase &
  (
    | { status: 'consumed'; download: MediaDownloadHint }
    | { status: 'failed'; failure: InboundMessageMediaFailure }
    | { status: 'expired' }
    | { status: 'deleted' }
  );

/**
 * Detail for an inbound message whose content the provider refused to deliver
 * (`type: 'unsupported'`) — WhatsApp video notes, polls, and some view-once
 * content, carrying Meta error `131051`.
 *
 * The bytes never reach Tyxter and never will: `media` is `null` on these rows
 * and `payload` holds only the refusal envelope, so the useful reply is asking
 * the sender to resend in a supported format. `reason` is the provider's own
 * error code and explanation, or `null` when it sent no usable error block; it
 * is never half-reported.
 */
export interface InboundUnsupportedDescriptor {
  provider_type: string | null;
  reason: { code: number; message: string } | null;
}

/**
 * Detail for an inbound message the provider delivered in a type Tyxter does
 * not project into a typed field yet (`type: 'unknown'`) — shared locations,
 * contact cards, orders, system notices, or a newly-launched provider type.
 *
 * The content did arrive: read it from the raw `payload` on retrieve, or with
 * `include: 'payload'` on the list read. Only the typed view is missing, so an
 * auto-reply asking the sender to resend would be wrong here.
 */
export interface InboundUnknownDescriptor {
  provider_type: string | null;
}

export interface MessageDetailResponse extends MessageResponse {
  direction: string;
  channel: MessageChannel;
  type: string;
  sender: MessageReadSenderIdentity;
  recipient: MessageIdentity;
  provider: string | null;
  provider_message_id: string | null;
  template_name: string | null;
  template_id: string | null;
  template_version_id: string | null;
  template_version: number | null;
  /**
   * Supported handle for an inbound attachment. Present on retrieve and list
   * responses independently of `include=payload`; null when the message has no
   * settled inbound attachment.
   */
  media: InboundMessageMediaDescriptor | null;
  /**
   * Set when the provider refused to deliver this inbound message
   * (`type: 'unsupported'`); `null` on every other message. Present on retrieve
   * and list responses independently of `include: 'payload'` — the default list
   * omits the payload, and for these rows this descriptor is the only typed
   * answer to what the customer tried to send. Never set together with
   * `unknown`, and `media` is `null` beside it.
   */
  unsupported: InboundUnsupportedDescriptor | null;
  /**
   * Set when the provider delivered an inbound type Tyxter does not project
   * yet (`type: 'unknown'`); `null` on every other message. Present on retrieve
   * and list responses independently of `include: 'payload'`, though the
   * content itself lives in `payload`. Never set together with `unsupported`.
   */
  unknown: InboundUnknownDescriptor | null;
  /**
   * Raw request/provider payload for diagnostics. Provider-specific fields,
   * including private short-lived media URLs, are not supported integration
   * handles; use `media.asset_id` for inbound attachment download/transcription.
   */
  payload: unknown;
  metadata: unknown;
  error_code: string | null;
  error_message: string | null;
  provider_error: MessageProviderError | null;
  updated_at: string;
  /**
   * Redaction stamp. Non-null once the message's payload/PII has been scrubbed
   * by the data-retention purge or a contact erasure (LGPD); `null` otherwise.
   * On a default list read `payload` is `null`, so this is the externally
   * recognizable signal that a message has been redacted.
   */
  redacted_at: string | null;
  /**
   * Delivery-confirmation timeout stamp. Non-null once the provider accepted the
   * send but no delivery status ever arrived inside the platform's confirmation
   * window: the message is `sent` and stays `sent`, and this is what tells you
   * the silence is abnormal rather than merely recent.
   *
   * It is not a status — the message can still be delivered or fail afterwards,
   * and the stamp is cleared the moment any status lands. Pairs with the
   * `message.delivery_timeout` webhook event and the same-named entry in
   * `events`. Always `null` in sandbox, where statuses are delivered
   * synchronously.
   */
  delivery_unconfirmed_at: string | null;
  events: MessageEventResponse[];
}

export interface ListMessagesQuery {
  limit?: number;
  starting_after?: string;
  status?: string;
  batch_id?: string;
  /**
   * Return only messages in this direction. Filtered server-side, so an
   * inbound-only reader does not have to over-fetch and filter locally.
   */
  direction?: 'inbound' | 'outbound';
  /**
   * Opt-in expansion: `'payload'` returns each item's raw `payload` and
   * `metadata` (both `null` on the default list).
   */
  include?: 'payload';
}

export type ListMessagesResponse = ListResponse<Omit<MessageDetailResponse, 'events'>>;
export type CancelMessageResponse = MessageDetailResponse;

/**
 * Acknowledgement for `POST /v1/messages/{message_id}/typing`.
 *
 * Deliberately not a message resource: the call creates nothing and moves no
 * message state, so there is no envelope to diff against a previous read.
 * `status` has exactly one value — every rejection arrives as an `error.code`
 * in the error envelope, never as a different value here.
 */
export interface TypingIndicatorResponse {
  object: 'typing_indicator';
  message_id: string;
  status: 'accepted';
}

export type MediaAssetStatus = 'pending' | 'ready' | 'consumed' | 'failed' | 'expired' | 'deleted';
export type MediaAssetSource = 'customer' | 'inbound_provider';

export interface CreateMediaUploadRequest {
  kind: MediaAssetKind;
  lifecycle?: MediaAssetLifecycle;
  filename?: string;
  mime_type: string;
  byte_length: number;
}

export interface MediaUploadResponse {
  id: string;
  object: 'media_upload';
  upload_url: string;
  upload_method: 'PUT';
  upload_headers: Record<string, string>;
  expires_at: string;
}
export interface MediaAssetResponse {
  id: string;
  object: 'media_asset';
  source: MediaAssetSource;
  provider: string | null;
  provider_media_id: string | null;
  kind: MediaAssetKind;
  lifecycle: MediaAssetLifecycle;
  filename: string | null;
  mime_type: string;
  byte_length: number;
  status: MediaAssetStatus;
  download: MediaDownloadHint | null;
  expires_at: string | null;
  upload_expires_at: string;
  completed_at: string | null;
  consumed_at: string | null;
  consumed_by_message_id: string | null;
  deleted_at: string | null;
  failure_code: string | null;
  failure_message: string | null;
  trace_id: string | null;
  created_at: string;
  updated_at: string;
}
export interface MediaAssetDownloadResponse {
  id: string;
  object: 'media_asset_download';
  download_url: string;
  expires_at: string;
}
export interface RequestMessageMediaTranscription {
  /** Advisory context, trimmed; at most 1024 UTF-16 code units. Empty clears; retry omission inherits. */
  prompt?: string;
  /** At most 50 trimmed terms of 1–128 UTF-16 code units; no line separators or angle brackets.
   * Order, case and duplicates are preserved. Empty clears; retry omission inherits. */
  keywords?: string[];
  /** Optional ISO 639-1 language hint, for example `pt` or `en`. */
  language?: string;
}
export type MessageMediaTranscriptStatus = 'pending' | 'succeeded' | 'failed';
export interface MessageMediaTranscriptResponse {
  id: string;
  object: 'message_media_transcript';
  message_id: string;
  media_asset_id: string;
  status: MessageMediaTranscriptStatus;
  provider: string | null;
  model: string | null;
  language: string | null;
  text: string | null;
  duration_seconds: number | null;
  error_code: string | null;
  error_message: string | null;
  trace_id: string;
  created_at: string;
  completed_at: string | null;
}

export interface ListMediaAssetsQuery {
  limit?: number;
  starting_after?: string;
  lifecycle?: MediaAssetLifecycle;
  status?: MediaAssetStatus;
  kind?: MediaAssetKind;
  /**
   * Separate your uploaded library from inbound-captured attachments. Omit to
   * list both, which is the unchanged default.
   */
  source?: MediaAssetSource;
}

export type ListMediaAssetsResponse = ListResponse<MediaAssetResponse>;

export interface DeleteMediaAssetResponse {
  id: string;
  object: 'media_asset';
  deleted: true;
}

export interface MediaStorageUsageResponse {
  object: 'media_storage_usage';
  used_bytes: number;
  limit_bytes: number;
  available_bytes: number;
  percent_used: number;
}

export interface CreateWebhookEndpointRequest {
  url: string;
  description?: string;
  subscribed_events: string[];
}

export interface WebhookEndpointUpdateRequest {
  url?: string;
  description?: string | null;
  subscribed_events?: string[];
  status?: 'active' | 'disabled';
}

export interface WebhookEndpointResponse {
  id: string;
  object: 'webhook_endpoint';
  url: string;
  description: string | null;
  subscribed_events: string[];
  status: 'active' | 'disabled';
  // Endpoint health for the auto-disable circuit breaker (#276).
  // `disabled_reason` is `unhealthy_consecutive_failures` when the breaker
  // tripped, else null. Re-enable with PATCH status:active once the host recovers.
  disabled_reason: string | null;
  disabled_detail: {
    last_status_code: number | null;
    failure_class: 'auth_rejected' | 'server_error' | 'unreachable' | 'timeout';
  } | null;
  last_failure_at: string | null;
  last_success_at: string | null;
  environment: EnvironmentKind;
  created_at: string;
  updated_at: string;
}

export interface CreateWebhookEndpointResponse extends WebhookEndpointResponse {
  signing_secret: string;
}

export type RotateWebhookSigningSecretResponse = CreateWebhookEndpointResponse;
export type ListWebhookEndpointsResponse = ListResponse<WebhookEndpointResponse>;

/** Durable acknowledgement for a direct one-shot endpoint test delivery. */
export interface TestWebhookEndpointResponse {
  object: 'webhook_test';
  webhook_event_id: string;
  webhook_endpoint_id: string;
  status: 'pending';
}

export interface WebhookDeliveryAttemptResponse {
  id: string;
  status: 'pending' | 'succeeded' | 'failed';
  attempt: number;
  status_code: number | null;
  response_body_redacted?: string | null;
  error_message: string | null;
  next_retry_at?: string | null;
  created_at: string;
}

export interface WebhookSignaturePreview {
  object: 'webhook_signature_preview';
  mode: 'sandbox_listen' | 'production_listen';
  algorithm: 'hmac-sha256';
  signed_content: 'timestamp.raw_body';
  webhook_endpoint_id: string;
  webhook_id: string;
  timestamp: string;
  raw_body: string;
  raw_body_base64: string;
  signature: string;
  headers: {
    'tyxter-webhook-id': string;
    'tyxter-webhook-timestamp': string;
    'tyxter-webhook-signature': string;
  };
}

/** Customer webhook envelope as delivered over HTTPS and under listen `payload`. */
export interface WebhookEventEnvelope<TType extends string = string, TData = JsonObject> {
  id: string;
  type: TType;
  created_at: string;
  occurred_at?: string;
  environment: EnvironmentKind;
  trace_id: string;
  data: TData;
}

export type MessageMediaTranscriptionWebhookEventType =
  | 'message.media_transcribed'
  | 'message.media_transcription_failed';

export interface MessageWebhookData {
  message_id: string;
  status: string;
  channel: 'whatsapp' | 'instagram';
  sender: { type: string; id: string; profile_name: string | null };
  recipient: { type: string; id: string };
  provider_message_id: string | null;
  metadata: unknown | null;
}

/** Immutable typed webhook snapshots created before `profile_name` was added. */
interface LegacyMessageWebhookData extends Omit<MessageWebhookData, 'sender'> {
  sender: { type: string; id: string };
}

export interface MessageMediaTranscribedWebhookData extends MessageWebhookData {
  transcript: {
    id: string;
    media_asset_id: string;
    status: 'succeeded';
    provider: string;
    model: string;
    language: string | null;
    text: string | null;
    duration_seconds: number;
    completed_at: string;
  };
}

interface LegacyMessageMediaTranscribedWebhookData extends LegacyMessageWebhookData {
  transcript: MessageMediaTranscribedWebhookData['transcript'];
}

export type MessageMediaTranscribedWebhookEnvelope =
  | WebhookEventEnvelope<'message.media_transcribed', MessageMediaTranscribedWebhookData>
  | WebhookEventEnvelope<'message.media_transcribed', LegacyMessageMediaTranscribedWebhookData>;

export interface MessageMediaTranscriptionFailedWebhookData extends MessageWebhookData {
  transcript: {
    id: string;
    media_asset_id: string;
    status: 'failed';
    error_code: string;
    error_message: string | null;
    language: string | null;
    completed_at: string;
  };
}

interface LegacyMessageMediaTranscriptionFailedWebhookData extends LegacyMessageWebhookData {
  transcript: MessageMediaTranscriptionFailedWebhookData['transcript'];
}

export type MessageMediaTranscriptionFailedWebhookEnvelope =
  | WebhookEventEnvelope<
      'message.media_transcription_failed',
      MessageMediaTranscriptionFailedWebhookData
    >
  | WebhookEventEnvelope<
      'message.media_transcription_failed',
      LegacyMessageMediaTranscriptionFailedWebhookData
    >;

export type MessageMediaTranscriptionWebhookEnvelope =
  | MessageMediaTranscribedWebhookEnvelope
  | MessageMediaTranscriptionFailedWebhookEnvelope;

/**
 * Additive non-enforcing Meta account-policy warning. `violation_type` is
 * nullable/open because Meta may omit or extend its vocabulary; this event does
 * not report a status and must not be treated as a blocked-send signal.
 */
export interface ProviderConnectionPolicyWarningWebhookData {
  provider_connection_id: string;
  provider: 'meta';
  display_name: string;
  violation_type: string | null;
  observed_at: string;
}

export type ProviderConnectionPolicyWarningWebhookEnvelope = WebhookEventEnvelope<
  'provider_connection.policy_warning',
  ProviderConnectionPolicyWarningWebhookData
>;

/**
 * Meta scheduled a future account disablement. This advisory does not report a
 * status or block sends; `waba_ban_date` is null when Meta supplied no valid
 * schedule date.
 */
export interface ProviderConnectionDisableScheduledWebhookData {
  provider_connection_id: string;
  provider: 'meta';
  display_name: string;
  waba_ban_date: string | null;
  observed_at: string;
}

export type ProviderConnectionDisableScheduledWebhookEnvelope = WebhookEventEnvelope<
  'provider_connection.disable_scheduled',
  ProviderConnectionDisableScheduledWebhookData
>;

/**
 * Data of the six WhatsApp Business group lifecycle webhook events (beta):
 * `group.created`, `group.create_failed`, `group.deleted`, `group.delete_failed`,
 * `group.invite_link_reset` and `group.invite_link_reset_failed`. `occurred_at`
 * is when Tyxter recorded the outcome. On the three `*_failed` events `failure`
 * is the failure of the operation that failed, stored with the event when
 * Tyxter recorded the outcome: a delayed delivery or a listen read still shows
 * it after a newer delete or reset changed the group's `failure`, and a reset
 * that failed while the group was `deleting` carries its own reason although
 * the group's `failure` stays the delete's. Every other field, and `failure` on
 * the other three events, is the group as Tyxter reads it when it sends the
 * event (or serves it on a listen read), so a delayed or replayed event can
 * show a later state.
 * `invite_link` lets anyone who has it join the group: store payloads as secrets.
 */
export interface GroupWebhookData {
  group_id: string;
  phone_number_id: string;
  status: 'pending' | 'active' | 'failed' | 'deleting' | 'deleted';
  subject: string;
  provider_group_id: string | null;
  invite_link: string | null;
  failure: { code: string; message: string; provider: MessageProviderError | null } | null;
  occurred_at: string;
}

export type GroupWebhookEnvelope = WebhookEventEnvelope<
  | 'group.created'
  | 'group.create_failed'
  | 'group.deleted'
  | 'group.delete_failed'
  | 'group.invite_link_reset'
  | 'group.invite_link_reset_failed',
  GroupWebhookData
>;

/**
 * Data of `group.participant_joined` / `group.participant_removed` (beta): the
 * join or removal as Tyxter recorded it, never the group's later state.
 * `participant.wa_id` is the participant's WhatsApp ID. `occurred_at` is Meta's
 * time in whole seconds (sandbox: the simulation time); the same participant,
 * action and second reported twice is one event. `participant_count` is
 * Tyxter's count right after it applied the change. A join or removal older than
 * the participant's latest recorded one is still delivered although group reads
 * do not reflect it. `initiated_by` is present exactly on a removal.
 */
export interface GroupParticipantWebhookData {
  group_id: string;
  phone_number_id: string;
  participant: { wa_id: string };
  participant_count: number;
  occurred_at: string;
  initiated_by?: 'participant' | 'business';
}

export type GroupParticipantWebhookEnvelope =
  | WebhookEventEnvelope<
      'group.participant_joined',
      Omit<GroupParticipantWebhookData, 'initiated_by'>
    >
  | WebhookEventEnvelope<
      'group.participant_removed',
      Omit<GroupParticipantWebhookData, 'initiated_by'> & {
        initiated_by: 'participant' | 'business';
      }
    >;

export type PaymentWebhookEventType =
  | 'payment.created'
  | 'payment.approval_available'
  | 'payment.link_generated'
  | 'payment.paid'
  | 'payment.failed'
  | 'payment.expired'
  | 'payment.cancelled';

export type PaymentWebhookStatus =
  | 'link_pending'
  | 'link_generated'
  | 'paid'
  | 'failed'
  | 'expired'
  | 'cancelled';

/** Sanitized event-time snapshot shared by all merchant `payment.*` events. */
export interface PaymentWebhookData {
  id: string;
  object: 'payment_request';
  /** Legacy alias of `id`; retained for existing integrations. */
  payment_request_id: string;
  status: PaymentWebhookStatus;
  amount_brl: string | null;
  currency: string;
  description: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  external_reference: string | null;
  metadata: unknown;
  payment_link_url: string | null;
  provider: string | null;
  provider_payment_id: string | null;
  provider_approval_id: string | null;
  provider_event_id?: string | null;
  provider_event_type?: string;
  operation?: string;
  error_code?: string;
  error_message?: string;
  sandbox_simulator?: boolean;
  sandbox_pay_page?: boolean;
}

export interface PaymentCreatedWebhookData extends PaymentWebhookData {
  status: 'link_pending';
  payment_link_url: null;
}

export interface PaymentLinkGeneratedWebhookData extends PaymentWebhookData {
  status: 'link_generated';
  payment_link_url: string;
}

export type PaymentCreatedWebhookEnvelope = WebhookEventEnvelope<
  'payment.created',
  PaymentCreatedWebhookData
>;

export type PaymentApprovalAvailableWebhookEnvelope = WebhookEventEnvelope<
  'payment.approval_available',
  PaymentLinkGeneratedWebhookData
>;

export type PaymentLinkGeneratedWebhookEnvelope = WebhookEventEnvelope<
  'payment.link_generated',
  PaymentLinkGeneratedWebhookData
>;

export type TerminalPaymentWebhookStatus = Extract<
  PaymentWebhookStatus,
  'paid' | 'failed' | 'expired' | 'cancelled'
>;

export interface PaymentPaidWebhookData extends PaymentWebhookData {
  status: 'paid';
}

export interface PaymentFailedWebhookData extends PaymentWebhookData {
  status: 'failed';
}

export interface PaymentExpiredWebhookData extends PaymentWebhookData {
  status: 'expired';
}

export interface PaymentCancelledWebhookData extends PaymentWebhookData {
  status: 'cancelled';
}

export type PaymentPaidWebhookEnvelope = WebhookEventEnvelope<
  'payment.paid',
  PaymentPaidWebhookData
>;

export type PaymentFailedWebhookEnvelope = WebhookEventEnvelope<
  'payment.failed',
  PaymentFailedWebhookData
>;

export type PaymentExpiredWebhookEnvelope = WebhookEventEnvelope<
  'payment.expired',
  PaymentExpiredWebhookData
>;

export type PaymentCancelledWebhookEnvelope = WebhookEventEnvelope<
  'payment.cancelled',
  PaymentCancelledWebhookData
>;

/** Discriminated union for exhaustive `switch (event.type)` handling. */
export type PaymentWebhookEnvelope =
  | PaymentCreatedWebhookEnvelope
  | PaymentApprovalAvailableWebhookEnvelope
  | PaymentLinkGeneratedWebhookEnvelope
  | PaymentPaidWebhookEnvelope
  | PaymentFailedWebhookEnvelope
  | PaymentExpiredWebhookEnvelope
  | PaymentCancelledWebhookEnvelope;

export interface WebhookEventLogResponse {
  id: string;
  object: 'webhook_event';
  endpoint_id: string | null;
  type: string;
  source_type: string;
  source_id: string;
  /**
   * The delivered event body. `null` once contact erasure or the retention
   * sweep cleared the stored payload — the event log row survives, its content
   * does not. `unknown` already admits `null`; the note is here because the
   * null is a documented state, not an accident.
   */
  payload: unknown;
  status: 'pending' | 'delivered' | 'failed';
  trace_id: string;
  created_at: string;
  attempts: WebhookDeliveryAttemptResponse[];
  signature_preview?: WebhookSignaturePreview;
}

export interface ListWebhookEventsQuery {
  limit?: number;
  starting_after?: string;
  event_type?: string;
  event_types?: string | string[];
  webhook_endpoint_id?: string;
  status?: 'pending' | 'delivered' | 'failed';
}

export interface ListenWebhookEventsQuery {
  limit?: number;
  cursor?: string;
  start_at?: 'oldest' | 'tail';
  event_type?: string;
  event_types?: string | string[];
  wait_ms?: number;
  webhook_endpoint_id?: string;
  listen_session_id?: string;
}

export interface RetrieveListenWebhookEventQuery {
  webhook_endpoint_id?: string;
  listen_session_id?: string;
}

export type ListWebhookEventsResponse = ListResponse<WebhookEventLogResponse>;

export interface CreateWebhookListenSessionRequest {
  ttl_seconds?: number;
  reason?: string;
}

export interface WebhookListenSessionResponse {
  id: string;
  object: 'webhook_listen_session';
  environment: 'production';
  status: 'active' | 'disabled' | 'expired';
  expires_at: string;
  disabled_at: string | null;
  created_at: string;
  trace_id: string;
  poll_endpoint: '/v1/webhook-events/listen';
  retrieve_endpoint: '/v1/webhook-events/listen/:outbox_event_id';
}

export interface ListenWebhookEventsResponse {
  object: 'webhook_event_listen';
  data: WebhookEventLogResponse[];
  has_more: boolean;
  next_cursor: string | null;
  next_poll_after_ms?: number;
}

export type ResendWebhookEventResponse = WebhookDeliveryAttemptResponse;

export interface BulkResendWebhookEventsRequest {
  webhook_event_ids?: string[];
  event_type?: string;
  status?: 'pending' | 'delivered' | 'failed';
  limit?: number;
}

export interface BulkResendWebhookEventsResponse {
  object: 'webhook_bulk_resend';
  requested: number;
  enqueued: number;
  skipped: number;
  attempts: WebhookDeliveryAttemptResponse[];
}

export interface CreateApiKeyRequest {
  name: string;
  environment: EnvironmentKind;
  project_id?: string;
  scopes: string[];
  expires_at?: string;
}

export interface RenameApiKeyRequest {
  name: string;
}

export type ApiKeyKind = 'standard' | 'agent';

export interface ApiKeyResponse {
  id: string;
  object: 'api_key';
  name: string;
  key_prefix: string;
  scopes: string[];
  kind: ApiKeyKind;
  status: 'active' | 'revoked';
  environment: EnvironmentKind;
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
  revoked_at: string | null;
}

export interface CreateApiKeyResponse extends ApiKeyResponse {
  secret: string;
}

export const AGENT_API_KEY_DEVICE_GRANT_TYPE =
  'urn:ietf:params:oauth:grant-type:device_code' as const;

export type AgentApiKeyDeviceGrantType = typeof AGENT_API_KEY_DEVICE_GRANT_TYPE;

export interface CreateAgentApiKeyDeviceAuthorizationRequest {
  client_name: string;
  environment: EnvironmentKind;
  scopes: string[];
  expires_at?: string;
}

export interface AgentApiKeyDeviceAuthorizationResponse {
  object: 'agent_api_key_device_authorization';
  device_code: string;
  user_code: string;
  verification_uri: string;
  verification_uri_complete: string;
  expires_in: number;
  interval: number;
}

export interface AgentApiKeyDeviceTokenRequest {
  grant_type: AgentApiKeyDeviceGrantType;
  device_code: string;
}

export interface AgentApiKeyPreflightCheck {
  id: 'account' | 'provider_status' | 'phone_numbers' | 'templates' | 'sandbox_quickstart';
  method: 'GET';
  path: string;
  required_scopes: string[];
  description: string;
}

export interface AgentApiKeyPreflightResponse {
  object: 'agent_api_key_preflight';
  checks: AgentApiKeyPreflightCheck[];
}

export interface AgentApiKeyDeviceTokenPendingResponse {
  object: 'agent_api_key_device_token';
  status: 'pending';
  interval: number;
  expires_in: number;
}

export interface AgentApiKeyDeviceTokenApprovedResponse {
  object: 'agent_api_key_device_token';
  status: 'approved';
  api_key: CreateApiKeyResponse;
  preflight: AgentApiKeyPreflightResponse;
}

export type AgentApiKeyDeviceTokenResponse =
  | AgentApiKeyDeviceTokenPendingResponse
  | AgentApiKeyDeviceTokenApprovedResponse;

export type RotateApiKeyResponse = CreateApiKeyResponse;
export type ListApiKeysResponse = ListResponse<ApiKeyResponse>;

export interface AccountProfileOrganizationResponse {
  id: string;
  object: 'organization';
  name: string;
  slug: string;
  status: 'active' | 'suspended';
}

export interface AccountProfileProjectResponse {
  id: string;
  object: 'project';
  name: string;
  slug: string;
}

export interface AccountProfileEnvironmentResponse {
  id: string;
  object: 'environment';
  kind: EnvironmentKind;
  name: string;
}

export interface AccountProfileOwnerResponse {
  id: string;
  object: 'organization_member';
  email: string;
  name: string | null;
  role: 'owner';
}

export interface AccountProfileResponse {
  object: 'account_profile';
  organization: AccountProfileOrganizationResponse;
  project: AccountProfileProjectResponse;
  environment: AccountProfileEnvironmentResponse;
  api_key: ApiKeyResponse;
  dashboard_owner: AccountProfileOwnerResponse | null;
}

// --- Projects ---------------------------------------------------------------

export interface EnvironmentResponse {
  id: string;
  object: 'environment';
  kind: EnvironmentKind;
  name: string;
  throughput_tier: ThroughputTier;
  created_at: string;
  updated_at: string;
}

export interface CreateProjectRequest {
  name: string;
  slug?: string;
}

export type ProjectDefaultLanguage = 'pt_BR' | 'en_US' | 'es_ES';

export type ProjectProfileVertical =
  | 'UNDEFINED'
  | 'OTHER'
  | 'AUTO'
  | 'BEAUTY'
  | 'APPAREL'
  | 'EDU'
  | 'ENTERTAIN'
  | 'EVENT_PLAN'
  | 'FINANCE'
  | 'GROCERY'
  | 'GOVT'
  | 'HOTEL'
  | 'HEALTH'
  | 'NONPROFIT'
  | 'PROF_SERVICES'
  | 'RETAIL'
  | 'TRAVEL'
  | 'RESTAURANT';

export interface ProjectProfileMetaSyncResponse {
  status: 'not_synced' | 'synced' | 'failed';
  synced_at: string | null;
  phone_number_id: string | null;
  profile_picture_url: string | null;
  error_code: string | null;
  error_message: string | null;
}

export interface ProjectProfileResponse {
  about: string | null;
  description: string | null;
  address: string | null;
  email: string | null;
  websites: string[];
  vertical: ProjectProfileVertical | null;
  profile_image_url: string | null;
  profile_image_mime_type: string | null;
  profile_image_size_bytes: number | null;
  profile_image_uploaded_at: string | null;
  meta_sync: ProjectProfileMetaSyncResponse;
}

export interface ProjectResponse {
  id: string;
  object: 'project';
  name: string;
  slug: string;
  default_language: ProjectDefaultLanguage;
  profile: ProjectProfileResponse;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
  environments: EnvironmentResponse[];
}

export interface ListProjectsQuery {
  limit?: number;
  starting_after?: string;
}

export type ListProjectsResponse = ListResponse<ProjectResponse>;

export interface InboundSandboxMessageRequest {
  channel?: MessageChannel;
  from: string;
  to: string;
  /**
   * What the simulated provider delivers. `text`, `media`, `interactive` and
   * `flow` carry the matching content field below.
   *
   * `unsupported` simulates content the provider refused to deliver (a WhatsApp
   * video note) and `unknown` a delivered type Tyxter does not project yet (a
   * shared location). Both write the same message row, return the same
   * `unsupported` / `unknown` descriptor from `GET /v1/messages/{id}`, and emit
   * the same `message.received` content as the real provider path — so those
   * branches are rehearsable with a sandbox key.
   */
  type: 'text' | 'media' | 'interactive' | 'flow' | 'unsupported' | 'unknown';
  text?: { body: string };
  media?: MediaMessagePayload;
  interactive?: JsonObject;
  flow?: JsonObject;
  /**
   * Only for `type: "unsupported"`. Optional: `provider_type` is the provider's
   * own name for the refused format and defaults to `"video_note"`. It must be
   * a provider type token — 1-64 characters of lowercase letters, digits and
   * underscores, like `"video_note"` — not free text, because it is stored on
   * the message as a provider-authored label and is deliberately kept free of
   * personal data. The reason is always synthesized as the real WhatsApp one —
   * code `131051`, "Message type is currently not supported." — so the message
   * carries the same `unsupported` block a production inbound would.
   */
  unsupported?: { provider_type?: string };
  /**
   * Only for `type: "unknown"`. Optional: `provider_type` is the provider's own
   * type name and defaults to `"location"`. It must be a provider type token —
   * 1-64 characters of lowercase letters, digits and underscores, like
   * `"location"` — not free text, because it is stored on the message as a
   * provider-authored label and is deliberately kept free of personal data. No
   * reason is attached, matching production — the content was delivered, only
   * the typed projection is missing.
   */
  unknown?: { provider_type?: string };
  metadata?: JsonObject;
}

export interface SandboxTemplateStatusRequest {
  status: 'rejected' | 'paused' | 'disabled';
  rejection_reason?: string;
}

export interface SandboxPaymentStatusRequest {
  status: 'paid' | 'failed' | 'expired' | 'cancelled';
  provider_event_id?: string;
  metadata?: JsonObject;
}

export type SandboxLLMFailureKind =
  | 'provider_down'
  | 'auth_failed'
  | 'timeout'
  | 'cost_cap_reached';

export interface SandboxLLMFailureRequest {
  failure: SandboxLLMFailureKind;
  ttl_seconds?: number;
}

export interface SandboxLLMFailureResponse {
  armed: true;
  failure: SandboxLLMFailureKind;
  expires_at: string | null;
}

export interface SandboxQuickstartResponse {
  object: 'sandbox_quickstart';
  environment: {
    id: string;
    kind: 'sandbox';
    project_id: string;
  };
  api_key: {
    id: string;
    key_prefix: string | null;
    scopes: string[];
    can_create_api_keys: false;
    api_key_creation: 'dashboard_or_api_keys_endpoint';
  };
  sender: {
    default_sender_id: string | null;
    phone_number: string | null;
    display_name: string | null;
    status: string | null;
    outbound_messages_require_sender: true;
    inbound_simulation_requires_sender: false;
  };
  webhooks: {
    active_endpoint_count: number;
    listen_endpoint: '/v1/webhook-events/listen';
    retrieve_listen_event_endpoint: '/v1/webhook-events/listen/:outbox_event_id';
    inbound_event_type: 'message.received';
    supported_listen_event_types: string[];
    signing_headers: {
      id: 'tyxter-webhook-id';
      timestamp: 'tyxter-webhook-timestamp';
      signature: 'tyxter-webhook-signature';
    };
  };
  templates: {
    approved_template_count: number;
    default_template: { name: string; language: string } | null;
  };
  capabilities: {
    simulate_inbound: boolean;
    listen_for_webhooks: boolean;
    send_outbound_messages: boolean;
    send_template_messages: boolean;
  };
  missing_scopes: string[];
}

export type UsageSummaryGroupBy =
  | 'destination_country'
  | 'template_id'
  | 'meta_pass_through_fee'
  | 'tyxter_markup'
  | 'package_consumption';

export interface UsageQuery {
  period_start: string;
  period_end: string;
  environment?: EnvironmentKind;
  group_by?: UsageSummaryGroupBy;
}

export interface EstimatedExternalMetaCostSummary {
  amount_brl: string | null;
  currency: 'brl';
  covered_quantity: number;
  missing_reference_quantity: number;
  is_estimate: true;
  billing_party: 'meta';
  billing_relationship: 'external';
}

export interface UsageSummaryBucketResponse {
  meter_id: string;
  environment: EnvironmentKind;
  group_key: string | null;
  quantity: number;
  cost_brl: string;
  meta_pass_through_fee_brl: string;
  tyxter_markup_brl: string;
  package_messages_debited: number;
  estimated_external_meta_cost: EstimatedExternalMetaCostSummary;
}

export interface UsageSummaryResponse {
  object: 'usage_summary';
  currency: 'brl';
  period_start: string;
  period_end: string;
  group_by: UsageSummaryGroupBy | null;
  buckets: UsageSummaryBucketResponse[];
  total_cost_brl: string;
  estimated_external_meta_cost: EstimatedExternalMetaCostSummary;
}

export interface ListUsageRecordsQuery {
  limit?: number;
  starting_after?: string;
  environment?: EnvironmentKind;
  meter_id?: string;
  recorded_after?: string;
  recorded_before?: string;
}

export interface UsageRecordTransport {
  list_rate_brl: string;
  net_rate_brl: string;
  plan_multiplier: string;
  list_amount_brl: string;
  discount_amount_brl: string;
  net_amount_brl: string;
  plan_offering_id: string | null;
  meta_reference_meter_key: string | null;
  meta_reference_rate_brl: string | null;
}

export interface EstimatedExternalMetaCost {
  amount_brl: string;
  currency: 'brl';
  quantity: number;
  conversation_category: 'service' | 'utility' | 'marketing' | 'authentication';
  meta_reference_meter_key: string;
  unit_rate_brl: string;
  rate_card_id: string;
  rate_effective_from: string;
  source_id: string;
  is_estimate: true;
  billing_party: 'meta';
  billing_relationship: 'external';
}

export interface UsageRecordResponse {
  id: string;
  object: 'usage_record';
  meter_id: string;
  conversation_category: 'service' | 'utility' | 'marketing' | 'authentication' | null;
  environment: EnvironmentKind;
  quantity: number;
  cost_brl: string;
  uncollected_brl: string;
  currency: 'brl';
  transport: UsageRecordTransport | null;
  estimated_external_meta_cost: EstimatedExternalMetaCost | null;
  message_id: string | null;
  package_topup_id: string | null;
  package_messages_debited: number;
  trace_id: string;
  recorded_at: string;
}

export type ListUsageRecordsResponse = ListResponse<UsageRecordResponse>;

export type CreateAudienceRequest = {
  name: string;
  description?: string | null;
  contact_ids?: string[];
};
export type UpdateAudienceRequest = Partial<CreateAudienceRequest>;
export interface AudienceResponse {
  id: string;
  object: 'audience';
  name: string;
  description: string | null;
  contact_count: number;
  contacts?: Array<{ id: string; phone: string; status: ContactStatus; tags?: ContactTagRef[] }>;
  trace_id: string;
  created_at: string;
  updated_at: string;
}
export type ListAudiencesResponse = ListResponse<AudienceResponse>;

export type MessageBatchStatus =
  | 'pending'
  | 'enqueuing'
  | 'sending'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled';
/**
 * Accept-time forecast of how a batch will be paced against WhatsApp's daily
 * NEW-recipient allowance for the sending number. Both numbers are ESTIMATES:
 * they move as other traffic on the same number consumes allowance, as
 * recipients turn out to already be inside an open conversation window (those
 * cost nothing), and as Meta raises or lowers the number's tier.
 */
export interface MessageBatchPacingResponse {
  /**
   * Recipients expected to wait for allowance rather than go out in the current
   * window. Zero means the batch is expected to fit. Nothing here fails — a
   * waiting recipient stays queued and sends by itself.
   */
  deferred_recipient_count: number;
  /**
   * Roughly how many daily allowance windows the batch is expected to span,
   * counting the current one. 1 means it should clear without waiting.
   */
  estimated_windows: number;
}

export interface MessageBatchResponse {
  id: string;
  object: 'message_batch';
  status: MessageBatchStatus;
  environment: EnvironmentKind;
  name: string | null;
  template_name: string | null;
  recipient_count: number;
  /**
   * Accept-time pacing forecast, returned on the create response.
   *
   * `null` means "no estimate", never "no pacing": either the forecast could not
   * be made (the sending number did not resolve, or its allowance is not a
   * finite number to divide by, or it has no finite cap at all), or you are
   * reading the batch back later — the forecast is an accept-time snapshot that
   * Tyxter neither stores nor recomputes, so retrieve and list always report
   * `null`. For live progress read `enqueued_count` / `sent_count`; for the
   * per-message reason read `status_reason` on the batch's messages.
   */
  pacing: MessageBatchPacingResponse | null;
  enqueued_count: number;
  sent_count: number;
  failed_count: number;
  error_message: string | null;
  trace_id: string;
  scheduled_for: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}
export type ListMessageBatchesResponse = ListResponse<MessageBatchResponse>;
export interface MessageBatchFailureExportResponse {
  object: 'message_batch_failure_export';
  batch_id: string;
  generated_at: string;
  rows: Array<{
    message_id: string;
    to: string | null;
    status: string;
    error_code: string | null;
    error_message: string | null;
    created_at: string;
    updated_at: string;
  }>;
}

export interface CreditBalanceResponse {
  object: 'credit_balance';
  production_blocked: boolean;
  organization_id: string;
  balance_brl: string;
  /**
   * Credit held by outstanding production reservations, already deducted from
   * `balance_brl`. A hold is not spend; sandbox holds are not counted.
   */
  held_brl: string;
  currency: 'brl';
  updated_at: string;
}

export type ConversationCategory = 'service' | 'utility' | 'marketing' | 'authentication';
export type RateCardEntryKind = 'billed' | 'meta_reference';
export interface RateCardEntryResponse {
  id: string;
  meter_id: string;
  kind: RateCardEntryKind;
  conversation_category: ConversationCategory | null;
  unit_amount: string;
  tier_up_to: number | null;
}
export interface RateCardResponse {
  id: string;
  object: 'rate_card';
  name: string;
  currency: 'brl';
  effective_from: string;
  effective_to: string | null;
  entries: RateCardEntryResponse[];
}
export interface ListRateCardsQuery {
  limit?: number;
  starting_after?: string;
  currency?: 'brl';
}
export type ListRateCardsResponse = ListResponse<RateCardResponse>;

// --- Subscription plans (ADR-026 Lever 3) ---
export type SubscriptionBillingRail = 'stripe_card' | 'pix_annual';
export interface PlanOfferingResponse {
  object: 'plan_offering';
  id: string;
  display_name: string;
  monthly_fee_brl: string;
  annual_pix_fee_brl: string;
  platform_fee_multiplier: string;
  net_transport_rate_brl: string;
  throughput_tier: ThroughputTier;
  max_phones: number | null;
  salvy_byok_enabled: boolean;
}
export interface ListPlansResponse {
  object: 'list';
  data: PlanOfferingResponse[];
}
export interface CurrentPlanResponse {
  object: 'subscription';
  status: 'active' | 'past_due' | 'canceled' | 'none';
  plan_offering_id: string | null;
  display_name: string | null;
  billing_rail: SubscriptionBillingRail | null;
  throughput_tier: ThroughputTier;
  max_phones: number | null;
  platform_fee_multiplier: string;
  net_transport_rate_brl: string;
  monthly_fee_brl: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  salvy_byok_enabled: boolean;
}
export interface SubscribePlanRequest {
  plan_offering_id: string;
  rail?: SubscriptionBillingRail;
}
export interface ChangePlanRequest {
  plan_offering_id: string;
}
export interface SubscribePixCheckout {
  charge_id: string;
  amount_brl: string;
  copy_paste: string | null;
  qr_code_base64: string | null;
  expires_at: string | null;
}
export interface SubscribePlanResponse {
  object: 'subscription_checkout';
  subscription: CurrentPlanResponse;
  pix: SubscribePixCheckout | null;
}

export interface LedgerEntryResponse {
  id: string;
  object: 'ledger_entry';
  /** `hold` and `release` are payment completion-fee holds and their return: never spend. */
  type: 'debit' | 'credit' | 'hold' | 'release';
  source_type: 'usage' | 'credit_topup' | 'payment_fee_hold';
  source_id: string;
  meter_id: string | null;
  amount_brl: string;
  uncollected_brl: string | null;
  currency: 'brl';
  environment: EnvironmentKind | null;
  recorded_at: string;
  trace_id: string | null;
  /** The payment and fee reservation of a payment-fee entry; null otherwise. */
  payment_fee: {
    payment_object: 'payment_request' | 'agentic_payment';
    payment_id: string;
    reservation_id: string;
  } | null;
}
export type ListLedgerEntriesResponse = ListResponse<LedgerEntryResponse>;

export type PhoneRenewalStatus =
  | 'scheduled'
  | 'funding_required'
  | 'funded'
  | 'renewed'
  | 'release_requested'
  | 'released'
  | 'cancelled';
export type PhoneRenewalActionableState =
  | 'upcoming'
  | 'at_risk'
  | 'funded'
  | 'renewed'
  | 'release_pending'
  | 'released'
  | 'cancelled';
export type PhoneRenewalRecommendedAction =
  | 'none'
  | 'add_credit_or_enable_auto_topup'
  | 'monitor_release';
export interface PhoneRenewalResponse {
  id: string;
  object: 'phone_renewal';
  status: PhoneRenewalStatus;
  actionable_state: PhoneRenewalActionableState;
  recommended_action: PhoneRenewalRecommendedAction;
  phone_number_id: string;
  display_name: string | null;
  phone: string | null;
  period_start: string;
  period_end: string;
  amount_brl: string;
  currency: 'brl';
  upcoming_notice_at: string | null;
  funding_scheduled_at: string | null;
  funding_attempted_at: string | null;
  next_funding_attempt_at: string | null;
  funded_at: string | null;
  next_renewal_at: string | null;
  renewal_warning_48h_at: string | null;
  renewal_warning_24h_at: string | null;
  grace_selected_at: string | null;
  grace_ends_at: string | null;
  release_cutoff_at: string | null;
  release_requested_at: string | null;
  renewed_at: string | null;
  released_at: string | null;
  cancelled_at: string | null;
  terminal_at: string | null;
}
export interface PhoneRenewalSummary {
  state: 'upcoming' | 'funded' | 'at_risk' | 'grace' | 'release_pending' | 'released' | 'unknown';
  reason_codes: Array<
    | 'insufficient_credit'
    | 'grace_in_progress'
    | 'grace_exhausted'
    | 'release_committed'
    | 'provider_timing_unknown'
    | 'provider_state_unknown'
    | 'cycle_not_ready'
  >;
  cycle_id: string | null;
  amount_brl: string | null;
  currency: 'brl' | null;
  next_renewal_at: string | null;
  release_cutoff_at: string | null;
  renewal_warning_48h_at: string | null;
  renewal_warning_24h_at: string | null;
  grace_selected_at: string | null;
  grace_ends_at: string | null;
  automatic_release_enabled: boolean;
  release_requested_at: string | null;
  recommended_action: PhoneRenewalRecommendedAction | null;
  evaluated_at: string;
  provider_evidence_observed_at: string | null;
}
export interface ListPhoneRenewalsQuery {
  limit?: number;
  starting_after?: string;
  status?: PhoneRenewalStatus;
}
export type ListPhoneRenewalsResponse = ListResponse<PhoneRenewalResponse>;

export interface PhoneManagementCoverageResponse {
  state: 'plan' | 'prepaid' | 'none';
  covered_until: string | null;
  next_charge_at: string | null;
  next_charge_brl: string | null;
}
export interface PhoneManagementResponse {
  phone_number_id: string;
  coverage: PhoneManagementCoverageResponse;
  covered_until: string | null;
  next_charge_at: string | null;
  next_charge_brl: string | null;
}
export interface PhoneManagementSummary {
  retained_count: number;
  monthly_total_brl: string;
  next_charge_at: string | null;
}
export interface ListPhoneManagementQuery {
  limit?: number;
  starting_after?: string;
}
export type ListPhoneManagementResponse = ListResponse<PhoneManagementResponse> & {
  summary: PhoneManagementSummary;
};

export type InvoiceStatus = 'generating' | 'ready' | 'failed';
export interface InvoiceResponse {
  id: string;
  object: 'invoice';
  organization_id: string;
  project_id: string;
  period_start: string;
  period_end: string;
  currency: 'brl';
  total_brl: string;
  status: InvoiceStatus;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}
export interface ListInvoicesQuery {
  limit?: number;
  starting_after?: string;
  project_id?: string;
}
export type ListInvoicesResponse = ListResponse<InvoiceResponse>;
export interface InvoiceDownloadResponse {
  object: 'invoice_download';
  invoice_id: string;
  url: string;
  expires_at: string;
}

// --- Fiscal / NFS-e (ADR-027) ------------------------------------------------
// Org-level legal service-tax documents. Reads never expose the certificate,
// the signed DPS, stored event bodies, the tomador snapshot, or config snapshots.
export type FiscalDocumentStatus =
  | 'pending'
  | 'authorized'
  | 'rejected'
  | 'blocked'
  | 'canceled'
  | 'substituted';
export type FiscalSourceKind = 'consumption_period' | 'subscription_term';
export interface FiscalDocumentResponse {
  id: string;
  object: 'fiscal_document';
  organization_id: string;
  status: FiscalDocumentStatus;
  source_kind: FiscalSourceKind;
  source_id: string;
  serie: string;
  numero: number;
  chave_acesso: string | null;
  amount_brl: string;
  competence_date: string | null;
  receipt_date: string | null;
  cancellation_deadline_at: string | null;
  rejection_cstat: string | null;
  rejection_reason: string | null;
  danfse_available: boolean;
  xml_available: boolean;
  created_at: string;
  updated_at: string;
}
export interface ListFiscalDocumentsQuery {
  limit?: number;
  starting_after?: string;
  status?: FiscalDocumentStatus;
  source_kind?: FiscalSourceKind;
}
export type ListFiscalDocumentsResponse = ListResponse<FiscalDocumentResponse>;
export interface FiscalDocumentDownloadResponse {
  object: 'fiscal_document_download';
  fiscal_document_id: string;
  artifact: 'danfse' | 'xml';
  url: string;
  expires_at: string;
}

export interface ListBillingPackagesQuery {
  limit?: number;
  starting_after?: string;
  status?: 'pending' | 'succeeded' | 'failed' | 'refunded' | 'expired';
}
export type ThroughputTier = 'starter' | 'growth' | 'scale';
export interface PlanPackageOfferingResponse {
  id: string;
  object: 'plan_package_offering';
  code: string;
  name: string;
  throughput_tier: ThroughputTier;
  price_brl: string;
  quota_messages: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}
export interface BillingPackageResponse {
  id: string;
  object: 'billing_package';
  status: 'pending' | 'succeeded' | 'failed' | 'refunded' | 'expired';
  package_code: string;
  throughput_tier: ThroughputTier;
  amount_brl: string;
  quota_messages: number;
  quota_remaining: number;
  payment_method: 'pix' | 'card';
  stripe_payment_intent_id: string | null;
  created_at: string;
  completed_at: string | null;
}
export interface ListBillingPackagesResponse {
  object: 'list';
  data: BillingPackageResponse[];
  has_more: boolean;
  next_cursor: string | null;
  available_packages: PlanPackageOfferingResponse[];
}

export interface PurchaseBillingPackageRequest {
  package_code: string;
  payment_method?: 'card';
  payment_method_id?: string;
}

export type CreditTopupKind = 'cash' | 'package' | 'x402';
export type TopupPaymentMethodKind = 'pix' | 'card' | 'x402' | 'manual' | 'promotion';
export interface TopupResponse {
  id: string;
  object: 'credit_topup';
  kind: CreditTopupKind;
  // `expired` = abandoned payment attempt (charge window lapsed unpaid),
  // distinct from `failed` (a real decline / provider failure).
  status: 'pending' | 'succeeded' | 'failed' | 'refunded' | 'expired';
  amount_brl: string;
  payment_method: TopupPaymentMethodKind;
  package_code: string | null;
  quota_messages: number | null;
  quota_remaining: number | null;
  stripe_payment_intent_id: string | null;
  stripe_client_secret: string | null;
  provider?: 'stripe' | 'abacate_pay' | 'manual' | 'promotion';
  abacate_charge_id?: string | null;
  pix_copy_paste?: string | null;
  pix_qr_code_base64?: string | null;
  pix_expires_at?: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface BillingPaymentMethodSetupIntentResponse {
  object: 'billing_payment_method_setup_intent';
  stripe_customer_id: string;
  stripe_setup_intent_id: string;
  stripe_client_secret: string | null;
}
export interface BillingPaymentMethodResponse {
  id: string;
  object: 'billing_payment_method';
  type: 'card';
  brand: string | null;
  last4: string | null;
  exp_month: number | null;
  exp_year: number | null;
  is_default: boolean;
  status: 'active' | 'deleted';
  created_at: string;
  updated_at: string;
}
export type ListBillingPaymentMethodsResponse = ListResponse<BillingPaymentMethodResponse>;
export interface SaveBillingPaymentMethodRequest {
  stripe_payment_method_id: string;
  set_default?: boolean;
}
export interface AutoTopupConfigResponse {
  object: 'auto_topup_config';
  enabled: boolean;
  threshold_brl: string;
  amount_brl: string;
  payment_method_id: string | null;
  last_triggered_at: string | null;
  updated_at: string | null;
}
export interface UpdateAutoTopupConfigRequest {
  enabled: boolean;
  threshold_brl: string;
  amount_brl: string;
  payment_method_id?: string | null;
}

export interface DataRetentionPolicyResponse {
  object: 'data_retention_policy';
  retention_days: number;
  data_export_enabled: boolean;
  updated_at: string | null;
}
export interface UpdateDataRetentionPolicyRequest {
  retention_days?: number;
  data_export_enabled?: boolean;
}

export type PaymentRequestStatus =
  | 'link_pending'
  | 'link_generated'
  | 'approval_requested'
  | 'approved'
  | 'paid'
  | 'failed'
  | 'expired'
  | 'cancelled';
export type MerchantPaymentProvider = 'iniciador' | 'abacate_pay';
export interface CreatePaymentRequest {
  amount_brl_centavos: number;
  description?: string;
  customer_name?: string;
  customer_tax_id?: string;
  customer_phone?: string;
  customer_email?: string;
  external_reference?: string;
  metadata?: JsonObject;
  provider_options?: {
    iniciador?: {
      participant_id?: string;
      redirect_url?: string;
      redirect_on_error_url?: string;
    };
    abacate_pay?: {
      charge_type?: 'pix' | 'checkout';
      create_customer?: boolean;
    };
  };
}
export interface RequestPaymentApprovalRequest {
  note?: string;
  metadata?: JsonObject;
}
export interface ListPaymentsQuery {
  limit?: number;
  starting_after?: string;
  status?: PaymentRequestStatus;
}
/**
 * The payment-service fees of one accepted payment, the same object on
 * `PaymentResponse` and `AgenticPaymentResponse`. Amounts are decimal strings
 * with four places, snapshotted at acceptance and never re-priced.
 */
export interface PaymentFees {
  /** `true` in sandbox: the amounts production would charge, with no balance movement. */
  simulated: boolean;
  /** Pricing version: the BRL rate card in force when the payment was accepted. */
  rate_card_id: string;
  initiation: {
    /** Matches `payment_fee.reservation_id` on the ledger's `payment.initiation` debit. */
    reservation_id: string;
    amount_brl: string;
    charged_at: string;
  };
  completion: {
    /** Matches `payment_fee.reservation_id` on the ledger's hold, release and settlement. */
    reservation_id: string;
    /** Fraction of the payment amount: `"0.01"` is 1%. */
    rate: string;
    amount_brl: string;
    /** One vocabulary on both payment rails. */
    state: 'held' | 'settled' | 'released' | 'unresolved';
    held_at: string;
    settled_at: string | null;
    released_at: string | null;
  };
}

export interface PaymentResponse {
  id: string;
  object: 'payment_request';
  status: PaymentRequestStatus;
  environment: EnvironmentKind;
  amount_brl: string;
  currency: 'BRL';
  description: string | null;
  customer_name: string | null;
  customer_tax_id: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  external_reference: string | null;
  metadata: JsonObject | null;
  payment_link_url: string | null;
  pix_copy_paste: string | null;
  pix_qr_code_base64: string | null;
  provider: MerchantPaymentProvider;
  provider_connection_id: string | null;
  provider_payment_id: string | null;
  provider_approval_id: string | null;
  provider_metadata: JsonObject | null;
  trace_id: string;
  created_at: string;
  updated_at: string;
  link_generated_at: string | null;
  approval_requested_at: string | null;
  approved_at: string | null;
  paid_at: string | null;
  failed_at: string | null;
  expired_at: string | null;
  cancelled_at: string | null;
  /**
   * `null`: no fee is owed (the payment was charged none: accepted before
   * payment-service fees applied, or by an API version that did not charge them).
   * An `Idempotency-Key` replay (creation, request approval or the sandbox status
   * route) returns its stored response, with `fees` as at the original call; read
   * the payment for the current state. Absent only on such a replay whose
   * response was stored before this field existed.
   */
  fees?: PaymentFees | null;
}
export type ListPaymentsResponse = ListResponse<PaymentResponse>;

// --- Agentic payments --------------------------------------------------------
// Iniciador-backed agent-initiated Pix. Mirrors the canonical Zod schemas in
// `@tyxter/contracts-api` (the `Agentic*` exports). These hand-written types are
// the SDK reflection of those schemas; the route-coverage gate
// (`route-coverage.test.ts`) keeps the `agenticPayments` resource pinned to the
// `/v1/agentic/*` rows of `PUBLIC_API_LAUNCH_ENDPOINTS`.

export type AgenticPixMethod = 'PIX_DICT' | 'PIX_MANU' | 'PIX_QRCODE';

export type AgenticPaymentAuthorizationStatus = 'pending' | 'completed' | 'revoked' | 'rejected';

export type AgenticPaymentStatus =
  | 'authorization_link_pending'
  | 'authorization_required'
  | 'authorization_pending'
  | 'payment_link_pending'
  | 'payment_confirmation_required'
  | 'pending'
  | 'paid'
  | 'cancelled'
  | 'rejected'
  | 'expired'
  | 'error';

export interface AgenticPaymentNextAction {
  type: 'open_authorization_url' | 'open_payment_url';
  url: string;
}

export interface AgenticBusinessEntity {
  tax_id: string;
  name?: string;
}

export interface AgenticPaymentCreditor {
  name: string;
  tax_id: string;
  ispb: string;
  issuer?: string;
  number: string;
  account_type: 'CACC' | 'SLRY' | 'SVGS' | 'TRAN';
}

export interface CreateAgenticAuthorizationRequest {
  participant_id?: string;
  participant_name?: string;
  customer_name?: string;
  customer_tax_id: string;
  business_entity?: AgenticBusinessEntity;
  agent_reason: string;
  external_reference?: string;
  metadata?: JsonObject;
  redirect_url?: string;
  redirect_on_error_url?: string;
}

export interface CreateAgenticPaymentRequest {
  amount_brl_centavos: number;
  method: AgenticPixMethod;
  participant_id?: string;
  participant_name?: string;
  customer_name?: string;
  customer_tax_id: string;
  business_entity?: AgenticBusinessEntity;
  agent_reason: string;
  /** Bank-statement memo forwarded to Iniciador; max 140 characters. */
  description?: string;
  pix_key?: string;
  qr_code?: string;
  creditor?: AgenticPaymentCreditor;
  external_reference?: string;
  metadata?: JsonObject;
  redirect_url?: string;
  redirect_on_error_url?: string;
}

export interface ListAgenticAuthorizationsQuery {
  limit?: number;
  starting_after?: string;
  status?: AgenticPaymentAuthorizationStatus;
  customer_tax_id?: string;
}

export interface ListAgenticPaymentsQuery {
  limit?: number;
  starting_after?: string;
  status?: AgenticPaymentStatus;
  customer_tax_id?: string;
}

export interface ListAgenticBanksQuery {
  search?: string;
  limit?: number;
}

export interface AgenticBankResponse {
  id: string;
  object: 'agentic_bank';
  participant_id: string;
  name: string;
  code: string | null;
  ispb: string | null;
  raw: JsonObject | null;
}

export interface ListAgenticBanksResponse {
  object: 'list';
  data: AgenticBankResponse[];
  has_more: false;
  next_cursor: null;
}

export interface AgenticAuthorizationResponse {
  id: string;
  object: 'agentic_payment_authorization';
  status: AgenticPaymentAuthorizationStatus;
  environment: EnvironmentKind;
  provider_connection_id: string;
  participant_id: string;
  participant_name: string | null;
  customer_name: string | null;
  customer_tax_id: string;
  business_tax_id: string | null;
  business_name: string | null;
  provider_authorization_id: string | null;
  authorization_url: string | null;
  upstream_status: string | null;
  external_reference: string | null;
  agent_reason: string;
  metadata: JsonObject | null;
  provider_metadata: JsonObject | null;
  next_action: AgenticPaymentNextAction | null;
  trace_id: string;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  revoked_at: string | null;
  rejected_at: string | null;
}

export interface AgenticPaymentResponse {
  id: string;
  object: 'agentic_payment';
  status: AgenticPaymentStatus;
  environment: EnvironmentKind;
  provider_connection_id: string;
  authorization_id: string | null;
  amount_brl: string;
  amount_brl_centavos: number;
  currency: 'BRL';
  method: AgenticPixMethod;
  participant_id: string;
  participant_name: string | null;
  description: string | null;
  customer_name: string | null;
  customer_tax_id: string;
  business_tax_id: string | null;
  business_name: string | null;
  agent_reason: string;
  external_reference: string | null;
  metadata: JsonObject | null;
  payment_url: string | null;
  provider: 'iniciador';
  provider_payment_id: string | null;
  provider_metadata: JsonObject | null;
  next_action: AgenticPaymentNextAction | null;
  trace_id: string;
  created_at: string;
  updated_at: string;
  authorization_required_at: string | null;
  payment_link_generated_at: string | null;
  pending_at: string | null;
  paid_at: string | null;
  cancelled_at: string | null;
  rejected_at: string | null;
  expired_at: string | null;
  error_at: string | null;
  /**
   * `null`: no fee is owed (the payment was charged none: accepted before
   * payment-service fees applied, or by an API version that did not charge them).
   * An `Idempotency-Key` replay (creation or cancel) returns its stored response,
   * with `fees` as at the original call; read the payment for the current state.
   * Absent only on such a replay whose response was stored before this field
   * existed.
   */
  fees?: PaymentFees | null;
}

export interface ListAgenticAuthorizationsResponse {
  object: 'list';
  data: AgenticAuthorizationResponse[];
  has_more: boolean;
  next_cursor: string | null;
}

export interface ListAgenticPaymentsResponse {
  object: 'list';
  data: AgenticPaymentResponse[];
  has_more: boolean;
  next_cursor: string | null;
}

export type ProviderName = 'meta' | 'iniciador' | 'abacate_pay' | 'salvy';
export type ProviderConnectionStatus = 'pending' | 'connected' | 'suspended' | 'disconnected';
export type ProviderConnectionChannel =
  | 'whatsapp'
  | 'instagram'
  | 'payments'
  | 'agentic_payments'
  | 'phone_numbers';
export type MetaConnectionChannel = 'whatsapp' | 'instagram';
export type ProviderTokenSource = 'manual' | 'embedded_signup';
export interface SalvyConnectionOperation {
  state: 'queued' | 'succeeded' | 'failed';
  error_code:
    | 'salvy_credentials_invalid'
    | 'salvy_provider_unavailable'
    | 'salvy_connection_unavailable'
    | null;
}
export interface SalvyConnectionInfo {
  sync_mode: 'polling';
  credential_hint: string | null;
  discovered_at: string | null;
  operation: SalvyConnectionOperation | null;
}
export interface RegisterSalvyConnectionRequest {
  api_key: string;
  display_name?: string;
  continuation_terms_version: 'salvy_byok_v1';
}
export type ApiKeyRegisterSalvyConnectionRequest = RegisterSalvyConnectionRequest;
export type DashboardBffRegisterSalvyConnectionRequest = RegisterSalvyConnectionRequest;
export interface RotateSalvyConnectionRequest {
  api_key: string;
}
export type ApiKeyRotateSalvyConnectionRequest = RotateSalvyConnectionRequest;
export type DashboardBffRotateSalvyConnectionRequest = RotateSalvyConnectionRequest;
export interface SalvyNumberResponse {
  provider_number_id: string;
  phone: string;
  provider_status: string;
  imported_phone_number_id: string | null;
}
export interface ListSalvyNumbersResponse {
  object: 'list';
  data: SalvyNumberResponse[];
  has_more: boolean;
  next_cursor: string | null;
}
export interface PaymentReceiverProfile {
  name?: string;
  tax_id?: string;
  bank_name?: string;
  ispb?: string;
  issuer?: string;
  account_number?: string;
  account_type?: 'CACC' | 'SLRY' | 'SVGS' | 'TRAN';
}
export interface PaymentProviderCapabilities {
  hosted_payment_link: boolean;
  fixed_receiver: boolean;
  webhook_hmac: boolean;
  dynamic_receiver: boolean;
}
export interface AgenticPaymentProviderCapabilities {
  mcp_tools: boolean;
  reusable_authorizations: boolean;
  hosted_authorization: boolean;
  hosted_payment_confirmation: boolean;
  polling: boolean;
}
export interface RegisterMetaConnectionRequest {
  channel?: MetaConnectionChannel;
  display_name: string;
  waba_id?: string;
  phone_number_id?: string;
  ig_business_account_id?: string;
  page_id?: string;
  access_token: string;
  token_source?: ProviderTokenSource;
  token_expires_at?: string | null;
}
export interface ExchangeMetaOAuthCodeRequest {
  code: string;
  /**
   * Optional for code-only Meta signup completion. When Meta's browser relay
   * omits the WABA, Tyxter accepts the OAuth code and continues only if the
   * token's WhatsApp granular scopes identify exactly one WABA. Otherwise it
   * preserves a retryable pending setup and returns `meta_waba_missing`.
   */
  waba_id?: string;
  /**
   * Optional since the WABA-only recovery: Meta's Embedded Signup ends the
   * brand-new-number flow with a session-info payload that carries `waba_id`
   * but no phone id. Omit it and the server resolves the number from the
   * WABA's own phone list; an unresolvable WABA persists a pending connection
   * and answers stable `error.code` `meta_phone_number_missing`.
   */
  phone_number_id?: string;
  display_name?: string;
  business_id?: string;
  /**
   * Optional correlation id (UUID) for one Embedded Signup run. A client that
   * drives the browser popup itself can mint one and pass it here so the
   * server-side step telemetry for this exchange is recorded under an id the
   * client already knows. Observability only — it is not persisted on the
   * connection and does not change the response.
   */
  signup_session_id?: string;
}
export interface RotateProviderConnectionTokenRequest {
  access_token: string;
  token_source?: ProviderTokenSource;
  token_expires_at?: string | null;
}
export interface MetaOnboardingConfigResponse {
  object: 'meta_onboarding_config';
  mode: 'embedded_signup';
  app_id: string;
  config_id: string;
  graph_api_version: string;
  sdk_url: string;
  allowed_message_origins: string[];
  message_type: 'WA_EMBEDDED_SIGNUP';
  login_options: {
    config_id: string;
    response_type: 'code';
    override_default_response_type: true;
    extras: { version: 'v3'; sessionInfoVersion: '3' };
  };
  completion_endpoint: '/v1/provider-connections/meta/oauth';
  manual_credentials_endpoint: '/v1/provider-connections/meta';
}
export interface ProviderConnectionRestriction {
  restriction_type: string;
  expiration: string | null;
  remediation: string | null;
}
export interface ProviderConnectionWabaSendCapability {
  waba_id: string;
  send_capability: 'available' | 'blocked';
  send_block_codes: Array<141006 | 141008 | 141011>;
  observed_at: string;
}
export interface ProviderConnectionResponse {
  id: string;
  object: 'provider_connection';
  provider: ProviderName;
  channel: ProviderConnectionChannel;
  status: ProviderConnectionStatus;
  display_name: string;
  environment: EnvironmentKind;
  waba_id: string | null;
  phone_number_id: string | null;
  /**
   * The registered number's formatted display number as Meta reports it
   * (e.g. "+55 11 91234-5678"). Meta WhatsApp connections only; null/absent
   * when never resolved.
   */
  display_phone_number?: string | null;
  ig_business_account_id: string | null;
  page_id: string | null;
  provider_account_id: string | null;
  salvy?: SalvyConnectionInfo | null;
  payment_receiver: PaymentReceiverProfile | null;
  payment_capabilities: PaymentProviderCapabilities | null;
  agentic_capabilities: AgenticPaymentProviderCapabilities | null;
  default_participant_id: string | null;
  agent_id: string | null;
  agentic_api_base_url: string | null;
  webhook_secret_configured: boolean;
  /**
   * Why a `suspended` connection is suspended. Null on every other status, and
   * null when the suspension is the stored credential dying — there the fix is
   * to re-authenticate. A value means Meta acted against the WhatsApp Business
   * Account itself: `banned`, `review_rejected`, `restricted`,
   * `scheduled_for_disable` (appeal the account — replacing the token changes
   * nothing) or `app_uninstalled`, `account_deleted` (connect again; that is
   * the fix, and it clears this field). Typed as a plain string on purpose:
   * new values can arrive ahead of an SDK release, so do not switch
   * exhaustively on it.
   */
  suspension_reason?: string | null;
  /**
   * Last Meta policy-warning evidence for this connection. A warning does not
   * change status or block sends. The provider-owned type is intentionally an
   * open string, and both fields are optional for rollout compatibility.
   */
  last_policy_warning_type?: string | null;
  last_policy_warning_at?: string | null;
  /**
   * Nullable durable Meta WABA send-capability evidence. `null` means no
   * trusted observation, not availability; these fields never change the
   * provider-connection lifecycle. The reactive check-attempt timestamp stays
   * server-private and is intentionally absent from the SDK contract.
   */
  send_capability?: 'available' | 'blocked' | null;
  send_block_codes?: Array<141006 | 141008 | 141011> | null;
  send_capability_observed_at?: string | null;
  /**
   * WABA-keyed evidence observed through this connection. The primary WABA is
   * included when known. Refresh-attempt timestamps remain server-private.
   */
  waba_send_capabilities?: ProviderConnectionWabaSendCapability[];
  /**
   * Nullable normalized date for Meta's future disablement advisory. This does
   * not change status or block sends; null means Meta supplied no valid date.
   */
  waba_ban_date?: string | null;
  /**
   * Last observed WABA account-state snapshot. Meta owns these vocabularies,
   * so consume unknown string values without exhaustive switching.
   */
  waba_ban_state?: string | null;
  account_review_status?: string | null;
  restrictions?: ProviderConnectionRestriction[] | null;
  credential_last_four?: string | null;
  token_source: ProviderTokenSource | null;
  token_expires_at: string | null;
  token_refreshed_at: string | null;
  token_rotated_at: string | null;
  created_at: string;
  updated_at: string;
  disconnected_at: string | null;
}
export type ListProviderConnectionsResponse = ListResponse<ProviderConnectionResponse>;

/**
 * DELETE /v1/provider-connections/{connectionId} returns a compact disconnect
 * stub, not the full connection object.
 */
export interface DeleteProviderConnectionResponse {
  id: string;
  object: 'provider_connection';
  status: 'disconnected';
}

export type ProviderConnectionReadinessStatus =
  | 'missing'
  | 'connected'
  | 'pending'
  | 'suspended'
  | 'disconnected'
  | 'selection_required';
export type PaymentsChannelReadinessMode = 'sandbox_default' | 'iniciador' | 'abacate_pay';
export interface MessagingChannelReadiness {
  ready: boolean;
  status: ProviderConnectionReadinessStatus;
  connection_id: string | null;
  reason: string | null;
}
export interface PaymentsChannelReadiness {
  ready: boolean;
  status: ProviderConnectionReadinessStatus;
  active_connection_id: string | null;
  active_mode: PaymentsChannelReadinessMode | null;
  reason: string | null;
}
export interface ProviderConnectionStatusResponse {
  object: 'provider_connection_status';
  environment: EnvironmentKind;
  channels: {
    whatsapp: MessagingChannelReadiness;
    instagram: MessagingChannelReadiness;
    payments: PaymentsChannelReadiness;
    agentic_payments: MessagingChannelReadiness;
  };
}

export type ProviderCredentialSetupTarget =
  | 'meta.whatsapp'
  | 'salvy'
  | 'abacate_pay.payments'
  | 'iniciador.payments'
  | 'iniciador.agentic_payments'
  | 'openai.tts'
  | 'elevenlabs.tts'
  | 'xai.tts'
  | 'openai.stt';
export type ProviderCredentialSetupSessionStatus = 'pending' | 'completed' | 'denied' | 'expired';
export type ProviderCredentialSetupTtsProvider = 'openai' | 'elevenlabs' | 'xai';
export type ProviderCredentialSetupSttProvider = 'openai';
export interface CreateProviderCredentialSetupSessionRequest {
  target: ProviderCredentialSetupTarget;
}
interface ProviderCredentialSetupSessionResponseBase {
  object: 'provider_credential_setup_session';
  request_id: string;
  project_id: string;
  project_slug: string;
  environment_id: string;
  environment: EnvironmentKind;
  setup_url: string;
  poll_url: string;
  expires_at: string;
  completed_at: string | null;
  denied_at: string | null;
  created_at: string;
  updated_at: string;
}

export type ProviderCredentialSetupSessionResponse = ProviderCredentialSetupSessionResponseBase &
  (
    | {
        target: ProviderCredentialSetupTarget;
        status: Exclude<ProviderCredentialSetupSessionStatus, 'completed'>;
        completed_provider_connection_id: null;
        completed_tts_provider: null;
        completed_stt_provider: null;
      }
    | {
        target:
          | 'meta.whatsapp'
          | 'salvy'
          | 'abacate_pay.payments'
          | 'iniciador.payments'
          | 'iniciador.agentic_payments';
        status: 'completed';
        completed_provider_connection_id: string;
        completed_tts_provider: null;
        completed_stt_provider: null;
      }
    | {
        target: 'openai.tts';
        status: 'completed';
        completed_provider_connection_id: null;
        completed_tts_provider: 'openai';
        completed_stt_provider: null;
      }
    | {
        target: 'elevenlabs.tts';
        status: 'completed';
        completed_provider_connection_id: null;
        completed_tts_provider: 'elevenlabs';
        completed_stt_provider: null;
      }
    | {
        target: 'xai.tts';
        status: 'completed';
        completed_provider_connection_id: null;
        completed_tts_provider: 'xai';
        completed_stt_provider: null;
      }
    | {
        target: 'openai.stt';
        status: 'completed';
        completed_provider_connection_id: null;
        completed_tts_provider: null;
        completed_stt_provider: ProviderCredentialSetupSttProvider;
      }
  );

export type MetaSignupSessionStatus = 'pending' | 'processing' | 'completed' | 'expired';
export interface CreateMetaSignupSessionRequest {
  return_url: string;
  end_customer_ref?: string;
}
export interface MetaSignupSessionResponse {
  id: string;
  object: 'meta_signup_session';
  status: MetaSignupSessionStatus;
  url: string | null;
  return_url: string;
  end_customer_ref: string | null;
  project_id: string;
  environment_id: string;
  /**
   * The session's own environment. Hosted signup is production-only, so
   * `production` is the only value the API can emit today — the field mirrors
   * the row rather than restating the rule.
   */
  environment: EnvironmentKind;
  expires_at: string;
  completed_at: string | null;
  provider_connection_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface OptInRequest {
  phone: string;
  source?: ContactSource;
  metadata?: JsonObject;
}
export interface OptOutRequest {
  phone: string;
  source?: ContactSource;
  reason?: string;
}
export type BulkImportContactRow = {
  phone: string;
  metadata?: JsonObject;
};
export type BulkImportContactsRequest = {
  rows: BulkImportContactRow[];
  source?: ContactSource;
};
export type ContactStatus = 'opted_in' | 'opted_out';
export type ContactSource = 'api' | 'inbound_keyword' | 'dashboard_override';
export interface ListContactsQuery {
  limit?: number;
  starting_after?: string;
  search?: string;
  status?: ContactStatus;
  tag_id?: string;
}
export interface ContactTagRef {
  id: string;
  name: string;
  color: string | null;
}
export interface ContactResponse {
  id: string;
  object: 'contact';
  phone: string;
  status: ContactStatus;
  environment: EnvironmentKind;
  opt_in_source: string | null;
  opt_in_at: string | null;
  opt_out_source: string | null;
  opt_out_at: string | null;
  metadata: JsonObject | null;
  tags?: ContactTagRef[];
  created_at: string;
  updated_at: string;
}
export interface BulkImportContactsResponse {
  object: 'list';
  data: ContactResponse[];
  imported: number;
  skipped: number;
}
export type ListContactsResponse = ListResponse<ContactResponse>;

export interface ContactDataExportResponse {
  object: 'contact_data_export';
  contact: ContactResponse;
  messages: Array<{
    id: string;
    direction: 'inbound' | 'outbound';
    type: string;
    status: string;
    to: string | null;
    from: string | null;
    template_name: string | null;
    created_at: string;
  }>;
  generated_at: string;
}

export interface ContactErasureResponse {
  object: 'contact_erasure';
  contact_id: string;
  erased_at: string;
  messages_redacted: number;
}

export interface CreateFlowRequest {
  name: string;
  flow_json: JsonObject;
}
export type FlowStatus = 'draft' | 'validated' | 'published' | 'archived';
export interface FlowResponse {
  id: string;
  object: 'flow';
  name: string;
  status: FlowStatus;
  environment: EnvironmentKind;
  flow_json: JsonObject;
  provider_flow_id: string | null;
  provider_missing_since: string | null;
  rejection_reason: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}
export type ListFlowsResponse = ListResponse<FlowResponse>;

/**
 * WhatsApp Business groups (beta). Never personal WhatsApp groups. The status
 * and reason unions stay inline so the SDK exports one type per response.
 */
export interface GroupEligibilityResponse {
  object: 'group_eligibility';
  phone_number_id: string;
  environment: EnvironmentKind;
  status: 'eligible' | 'not_eligible' | 'unknown' | 'not_checked' | 'read_failed';
  /** Non-empty only when `status` is `not_eligible`. */
  reasons: (
    | 'not_cloud_api'
    | 'whatsapp_business_app_number'
    | 'not_official_business_account'
    | 'missing_messaging_permission'
  )[];
  checked_at: string | null;
  check_requested_at: string | null;
}

/**
 * A WhatsApp Business group (beta). `status` is `pending` until Tyxter learns
 * Meta's create outcome, or until Tyxter's worker finds it cannot send the
 * create (its phone number, eligibility answer or Meta connection rules it
 * out), which ends it `failed`; `provider_group_id` and `invite_link` stay `null`
 * until Meta confirms the group. `invite_link` is replaced when an invite-link
 * reset (`groups.resetInviteLink`) completes.
 */
export interface GroupResponse {
  id: string;
  object: 'group';
  status: 'pending' | 'active' | 'failed' | 'deleting' | 'deleted';
  environment: EnvironmentKind;
  phone_number_id: string;
  subject: string;
  description: string | null;
  join_approval_mode: 'auto_approve';
  provider_group_id: string | null;
  invite_link: string | null;
  /**
   * Current members as Tyxter recorded them from Meta's participant events
   * (sandbox: `sandbox.groups.simulateParticipant`), oldest join first; empty
   * once the group is `deleted`. `wa_id` is the participant's WhatsApp ID.
   */
  participants: { wa_id: string; joined_at: string }[];
  participant_count: number;
  /** Why the last provider operation failed; `provider` is Meta's error detail. */
  failure: { code: string; message: string; provider: Record<string, unknown> | null } | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}
export type ListGroupsResponse = ListResponse<GroupResponse>;

export interface UpsertLLMRouteRequest {
  phone_number_id?: string;
  provider: LLMProviderKind;
  model: string;
  api_key: string;
  system_prompt: string;
  max_tokens?: number;
  temperature?: number;
  daily_cost_cap_brl?: string;
  handoff_phrases?: string[];
  blocked_topics?: LLMBlockedTopicRule[];
  blocked_topic_fallback_response?: string;
  max_context_messages?: number;
  max_context_age_seconds?: number | null;
  memory_persistence?: LLMMemoryPersistence;
  enabled?: boolean;
}
export type UpdateLLMRouteRequest = Partial<
  Omit<UpsertLLMRouteRequest, 'phone_number_id' | 'provider' | 'daily_cost_cap_brl'>
> & { daily_cost_cap_brl?: string | null };
export interface LLMRouteTargetQuery {
  phone_number_id?: string;
}
export type LLMProviderKind = 'anthropic' | 'openai';
export type LLMMemoryPersistence = 'disabled' | 'opt_in' | 'opt_out';
export interface LLMBlockedTopicRule {
  match_type: 'keyword' | 'regex';
  pattern: string;
  label?: string;
}
export interface LLMRouteResponse {
  id: string;
  object: 'llm_route';
  phone_number_id: string | null;
  provider: LLMProviderKind;
  model: string;
  environment: EnvironmentKind;
  system_prompt: string;
  current_prompt_version: number;
  max_tokens: number;
  temperature: string;
  daily_cost_cap_brl: string | null;
  handoff_phrases: string[];
  blocked_topics: LLMBlockedTopicRule[];
  blocked_topic_fallback_response: string;
  max_context_messages: number;
  max_context_age_seconds: number | null;
  memory_persistence: LLMMemoryPersistence;
  enabled: boolean;
  api_key_suffix: string;
  created_at: string;
  updated_at: string;
}
export interface LLMRoutePromptVersionResponse {
  id: string;
  object: 'llm_route_prompt_version';
  llm_route_id: string;
  version: number;
  system_prompt: string;
  previous_system_prompt: string | null;
  editor_actor_type: 'api_key' | 'session' | 'system';
  editor_actor_id: string;
  trace_id: string | null;
  created_at: string;
}
export interface ListLLMRoutePromptVersionsQuery {
  limit?: number;
  starting_after?: string;
  phone_number_id?: string;
}
export type ListLLMRoutePromptVersionsResponse = ListResponse<LLMRoutePromptVersionResponse>;

export interface LLMCompletionRequest {
  messages: LLMResponseLogMessage[];
  contact_phone?: string;
  phone_number_id?: string;
  trace_id?: string;
}
export interface LLMCompletionResponse {
  object: 'llm_completion';
  content: string;
  model: string;
  tokens_in: number;
  tokens_out: number;
  /** Tyxter platform metering fee (BRL). `0.0000` in sandbox. */
  cost_brl: string;
  /**
   * Best-effort estimate (USD, list price) of what this completion cost
   * your own BYOK provider key — the provider bills you directly. `null`
   * for unknown models or when no provider call was made.
   */
  provider_cost_usd_estimate: string | null;
  handoff: boolean;
  trace_id: string;
}

export interface LLMResponseLogMessage {
  role: 'user' | 'assistant';
  content: string;
  created_at?: string;
}
export interface LLMResponseLogResponse {
  id: string;
  object: 'llm_response_log';
  llm_route_id: string;
  prompt_version: number;
  provider: string;
  model: string;
  temperature: string;
  max_tokens: number;
  tokens_in: number;
  tokens_out: number;
  cost_brl: string;
  contact_phone: string | null;
  input_messages: LLMResponseLogMessage[];
  output_message: string;
  trace_id: string | null;
  created_at: string;
}
export interface ListLLMResponseLogsQuery {
  limit?: number;
  starting_after?: string;
}
export type ListLLMResponseLogsResponse = ListResponse<LLMResponseLogResponse>;

export type AIAgentProviderKind = 'anthropic' | 'openai';
export type AIAgentMemoryPersistence = LLMMemoryPersistence;
export type AIAgentBlockedTopicRule = LLMBlockedTopicRule;

export interface CreateAIAgentRequest extends Omit<UpsertLLMRouteRequest, 'phone_number_id'> {
  name: string;
  description?: string;
  provider: AIAgentProviderKind;
}
export type UpdateAIAgentRequest = UpdateLLMRouteRequest & {
  name?: string;
  description?: string | null;
  archived?: boolean;
};
export interface AIAgentResponse {
  id: string;
  object: 'ai_agent';
  name: string;
  description: string | null;
  provider: AIAgentProviderKind;
  model: string;
  environment: EnvironmentKind;
  system_prompt: string;
  current_prompt_version: number;
  max_tokens: number;
  temperature: string;
  daily_cost_cap_brl: string | null;
  handoff_phrases: string[];
  blocked_topics: AIAgentBlockedTopicRule[];
  blocked_topic_fallback_response: string;
  max_context_messages: number;
  max_context_age_seconds: number | null;
  memory_persistence: AIAgentMemoryPersistence;
  enabled: boolean;
  api_key_suffix: string;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}
export type ListAIAgentsResponse = ListResponse<AIAgentResponse>;
export interface AIAgentPromptVersionResponse {
  id: string;
  object: 'ai_agent_prompt_version';
  ai_agent_id: string;
  version: number;
  system_prompt: string;
  previous_system_prompt: string | null;
  editor_actor_type: 'api_key' | 'session' | 'system';
  editor_actor_id: string;
  trace_id: string | null;
  created_at: string;
}
export type ListAIAgentPromptVersionsResponse = ListResponse<AIAgentPromptVersionResponse>;
export type AIAgentCompletionRequest = Omit<LLMCompletionRequest, 'phone_number_id'>;
export interface AIAgentCompletionResponse {
  object: 'ai_agent_completion';
  ai_agent_id: string;
  content: string;
  model: string;
  tokens_in: number;
  tokens_out: number;
  cost_brl: string;
  handoff: boolean;
  trace_id: string;
}
export interface AIAgentResponseLogResponse {
  id: string;
  object: 'ai_agent_response_log';
  ai_agent_id: string;
  prompt_version: number;
  provider: AIAgentProviderKind;
  model: string;
  temperature: string;
  max_tokens: number;
  tokens_in: number;
  tokens_out: number;
  cost_brl: string;
  contact_phone: string | null;
  input_messages: LLMResponseLogMessage[];
  output_message: string;
  trace_id: string | null;
  created_at: string;
}
export type ListAIAgentResponseLogsResponse = ListResponse<AIAgentResponseLogResponse>;
export interface DeleteAIAgentResponse {
  id: string;
  deleted: true;
}

export type AutomationStatus = 'draft' | 'active' | 'paused' | 'archived';
export type AutomationTriggerKind =
  | 'manual'
  | 'webhook'
  | 'inbound_message'
  | 'flow_completed'
  | 'schedule';
export type AutomationNodeType =
  | 'manual.trigger'
  | 'webhook.trigger'
  | 'inbound_message.trigger'
  | 'flow_completed.trigger'
  | 'schedule.trigger'
  | 'ai_agent.invoke'
  | 'http.request'
  | 'condition'
  | 'delay'
  | 'time_gate'
  | 'message.send'
  | 'template.send'
  | 'webhook.emit';
export type AutomationRunStatus =
  | 'queued'
  | 'running'
  | 'waiting'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'timed_out';
export type AutomationStepRunStatus =
  | 'queued'
  | 'running'
  | 'waiting'
  | 'skipped'
  | 'completed'
  | 'failed'
  | 'cancelled';
export interface AutomationGraphNode {
  id: string;
  type: AutomationNodeType;
  label?: string;
  position?: { x: number; y: number };
  config: JsonObject;
}
export interface AutomationGraphEdge {
  id: string;
  source: string;
  target: string;
  source_handle?: string;
  condition?: string;
}
export interface AutomationGraph {
  version: 'automation_graph_v1';
  nodes: AutomationGraphNode[];
  edges: AutomationGraphEdge[];
}
export interface AutomationValidationIssue {
  code: string;
  message: string;
  node_id: string | null;
  path: Array<string | number>;
}
export interface CreateAutomationRequest {
  name: string;
  description?: string;
}
export type UpdateAutomationRequest = Partial<Omit<CreateAutomationRequest, 'description'>> & {
  description?: string | null;
  status?: AutomationStatus;
};
export interface AutomationResponse {
  id: string;
  object: 'automation';
  name: string;
  description: string | null;
  status: AutomationStatus;
  active_version_id: string | null;
  trace_id: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}
export type ListAutomationsResponse = ListResponse<AutomationResponse>;
export interface DeleteAutomationResponse {
  id: string;
  deleted: true;
}
export interface CreateAutomationVersionRequest {
  graph: AutomationGraph;
}
export interface PublishAutomationRequest {
  version_id: string;
}
export interface AutomationVersionResponse {
  id: string;
  object: 'automation_version';
  automation_id: string;
  version: number;
  graph: AutomationGraph;
  graph_hash: string;
  validation_errors: AutomationValidationIssue[];
  published_at: string | null;
  trace_id: string | null;
  created_at: string;
}
export type ListAutomationVersionsResponse = ListResponse<AutomationVersionResponse>;
export type CreateAutomationRunRequest = JsonObject & {
  input?: JsonObject;
  idempotency_key?: string;
  trace_id?: string;
};
export interface AutomationRunResponse {
  id: string;
  object: 'automation_run';
  automation_id: string;
  automation_version_id: string;
  trigger_id: string | null;
  trigger_kind: AutomationTriggerKind;
  status: AutomationRunStatus;
  input_summary: JsonObject | null;
  output_summary: JsonObject | null;
  error_code: string | null;
  error_message: string | null;
  current_node_id: string | null;
  started_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  trace_id: string;
  created_at: string;
  updated_at: string;
}
export type ListAutomationRunsResponse = ListResponse<AutomationRunResponse>;
export interface AutomationStepRunResponse {
  id: string;
  object: 'automation_step_run';
  automation_run_id: string;
  node_id: string;
  node_type: AutomationNodeType;
  attempt: number;
  status: AutomationStepRunStatus;
  input_summary: JsonObject | null;
  output_summary: JsonObject | null;
  error_code: string | null;
  error_message: string | null;
  scheduled_for: string | null;
  started_at: string | null;
  completed_at: string | null;
  trace_id: string;
  created_at: string;
  updated_at: string;
}
export type ListAutomationStepRunsResponse = ListResponse<AutomationStepRunResponse>;
export interface AutomationWebhookSecretResponse {
  object: 'automation_webhook_secret';
  automation_id: string;
  automation_version_id: string;
  trigger_id: string;
  slug: string;
  signing_secret: string;
}

export type ProvisionPhoneNumberRequest = {
  ddd: string;
  display_name?: string;
};
export type ConnectPhoneNumberRequest = {
  phone: string;
  meta_phone_number_id: string;
  display_name?: string;
};
export type ImportSalvyPhoneNumberRequest = {
  provider_connection_id: string;
  provider_number_id: string;
  meta_phone_number_id?: string;
  display_name?: string;
  continuation_terms_version: 'salvy_byok_v1';
};

export type CompleteSalvyPhoneRegistrationRequest = {
  meta_phone_number_id: string;
};
export type TransferPhoneNumberRequest = {
  source_project_id: string;
  source_environment_id: string;
  target_project_id: string;
  target_environment_id: string;
  confirm_phone_number_id: string;
  reason?: string;
};
export type PhoneNumberSource = 'salvy' | 'byon';
export type PhoneNumberStatus =
  | 'requested'
  | 'provisioning'
  | 'provisioned'
  | 'verifying'
  | 'active'
  | 'failed'
  | 'release_requested'
  | 'released'
  | 'disconnected';
export type MetaThroughputTier = '1' | '2' | '3' | '4' | 'unlimited';
export type PhoneQualityRating = 'green' | 'yellow' | 'red' | 'unknown';
export type PhoneMessagingTier =
  | 'tier_50'
  | 'tier_250'
  | 'tier_1k'
  | 'tier_2k'
  | 'tier_10k'
  | 'tier_100k'
  | 'unlimited'
  | 'unknown';
export interface PhoneNumberRecentMessageResponse {
  id: string;
  object: 'message';
  direction: string;
  type: string;
  status: string;
  from: string | null;
  to: string | null;
  template_name: string | null;
  created_at: string;
}
export interface PhoneNumberNameReviewResponse {
  requested_name: string | null;
  /** Open Meta review vocabulary; callers must not exhaustively switch on it. */
  decision: string;
  reason: string | null;
  reviewed_at: string;
}
export interface PhoneNumberPendingNameReviewResponse {
  requested_name: string | null;
  /** Open Meta pending-review vocabulary; callers must not exhaustively switch on it. */
  status: string | null;
  /** Same successful health-sweep freshness fact as `meta_health_synced_at`. */
  observed_at: string;
}
export interface SalvyPhoneManagementResponse {
  provider_connection_id: string;
  provider_number_id: string;
  state: 'enabled' | 'suspended';
  coverage: 'plan' | 'prepaid' | 'none';
  covered_until: string | null;
  next_charge_at: string | null;
  next_charge_brl: string | null;
  suspension_reason: string | null;
  provider_status: string | null;
  synced_at: string | null;
}
export interface PhoneNumberResponse {
  id: string;
  object: 'phone_number';
  source: PhoneNumberSource;
  status: PhoneNumberStatus;
  environment: EnvironmentKind;
  display_name: string | null;
  ddd: string | null;
  phone: string | null;
  provider_number_id: string | null;
  meta_phone_number_id: string | null;
  waba_id: string | null;
  salvy_management?: SalvyPhoneManagementResponse | null;
  quality_rating: PhoneQualityRating;
  messaging_tier: PhoneMessagingTier;
  messaging_limit_tier: string | null;
  meta_throughput_tier: MetaThroughputTier | null;
  meta_quality_rating: string | null;
  /**
   * Current display name Meta verified for this number. Production values are
   * sweep-produced; sandbox uses its deterministic simulated health snapshot.
   * Null means no completed sweep has observed a verified name yet.
   */
  verified_name: string | null;
  /**
   * Latest pending Meta display-name review from a completed health sweep.
   * Null means no pending Graph observation, not that a review was approved.
   * This remains separate from the completed callback decision in `name_review`.
   */
  pending_name_review: PhoneNumberPendingNameReviewResponse | null;
  /**
   * Latest durable Meta display-name review, or null before the first decision.
   * The decision is an open Meta string; `display_name` remains customer-entered.
   */
  name_review: PhoneNumberNameReviewResponse | null;
  /**
   * When this number's Meta-reported health (`quality_rating`,
   * `messaging_tier`, `messaging_limit_tier`) was last read from Meta. Null
   * means it has never been read yet. A failed refresh leaves both the values
   * and this marker untouched, so an older timestamp means those fields are as
   * of that moment rather than now.
   */
  meta_health_synced_at: string | null;
  current_24h_unique_recipients: number;
  /**
   * Estimated number of NEW recipients this number can still start a
   * conversation with before Tyxter starts holding sends.
   *
   * Measured against a rolling 24-hour window whose slots expire one by one —
   * there is no reset moment — and against a cap reduced by the configured safety
   * margin and sending-phone quality ratio. It may reach zero before the raw
   * allowance is spent.
   *
   * Linked phones compare shared portfolio usage with their own quality-adjusted
   * thresholds, so different quality can yield different remaining values.
   * `messaging_tier` and the raw nullable `messaging_limit_tier` describe health,
   * not separate quotas. An unlinked Meta number instead uses a conservative
   * per-phone fallback; sandbox follows its deterministic simulated phone tier.
   *
   * It is an ESTIMATE, not a quota you can spend exactly: concurrent sends move
   * it, recipients already inside an open conversation window cost nothing
   * against it, and a paused number can report a number above zero before any
   * send has observed that allowance freed up.
   *
   * While Tyxter has no authoritative linked portfolio capability, or a
   * phone's limit tier has not been read in the unlinked path, this counts down
   * from a deliberately low default rather than an assumed unlimited allowance.
   *
   * `null` means Tyxter cannot estimate it at all — for example, Meta explicitly
   * reports no finite linked portfolio cap — and never means zero.
   */
  remaining_messaging_allowance_estimate: number | null;
  verification_code: string | null;
  verification_code_received_at: string | null;
  monthly_fee_brl: string | null;
  error_code: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  activated_at: string | null;
  released_at: string | null;
  renewal?: PhoneRenewalSummary | null;
  recent_messages: PhoneNumberRecentMessageResponse[];
}
export interface PhoneNumberReadResponse extends PhoneNumberResponse {
  /** Current rental assessment; null only when rental policy is inapplicable. */
  renewal: PhoneRenewalSummary | null;
}
export type ListPhoneNumbersResponse = ListResponse<PhoneNumberReadResponse>;
export interface AvailableRegionResponse {
  ddd: string;
  country: 'BR';
  monthly_fee_brl: string;
  state: string | null;
  region_label: string | null;
}
export interface ListAvailableRegionsResponse {
  object: 'list';
  data: AvailableRegionResponse[];
}

export type TemplateCategory = 'marketing' | 'utility' | 'authentication';
/**
 * Meta's template binding format. Create and generation omit this field only
 * when the compatible POSITIONAL default is intended; update/duplicate omit it
 * to retain or inherit the stored format.
 */
export type TemplateParameterFormat = 'POSITIONAL' | 'NAMED';
export type TemplateStatus =
  | 'draft'
  | 'submitted'
  | 'approved'
  | 'rejected'
  | 'paused'
  | 'disabled';
export type TemplateProviderQuality = 'green' | 'yellow' | 'red' | 'unknown';
/**
 * Meta authoring component. Supported button types include standalone marketing
 * COPY_CODE (`{ type: 'COPY_CODE', example: 'WINTER25' }`, no text, max 20 chars).
 */
export type TemplateComponent = JsonObject;
export interface TemplateAuthoringSignal {
  code: string;
  severity: 'info' | 'warning' | 'critical';
  source: 'authoring' | 'provider' | 'usage';
  message: string;
  field: string | null;
}
export interface CreateTemplateRequest {
  name: string;
  language: string;
  category: TemplateCategory;
  /** Omit for the compatible POSITIONAL default; use NAMED for named authoring. */
  parameter_format?: TemplateParameterFormat;
  components: TemplateComponent[];
}
export interface TemplateGenerationRequest {
  name?: string;
  description: string;
  language: string;
  category: TemplateCategory;
  /** Omit for the compatible POSITIONAL default; the returned draft echoes the format. */
  parameter_format?: TemplateParameterFormat;
  template_type?: 'text' | 'media';
}
export interface UpdateTemplateRequest {
  name?: string;
  language?: string;
  category?: TemplateCategory;
  /** Omit to retain the live draft/rejected template's format. */
  parameter_format?: TemplateParameterFormat;
  components?: TemplateComponent[];
}
export interface DuplicateTemplateRequest {
  name?: string;
  language?: string;
  category?: TemplateCategory;
  /** Omit to inherit the source template's format. */
  parameter_format?: TemplateParameterFormat;
}
export interface TemplateResponse {
  id: string;
  object: 'template';
  name: string;
  language: string;
  category: TemplateCategory;
  /** Durable live-template format; an approved version snapshots this value at submit. */
  parameter_format: TemplateParameterFormat;
  status: TemplateStatus;
  environment: EnvironmentKind;
  components: TemplateComponent[];
  provider_template_id: string | null;
  rejection_reason: string | null;
  provider_quality: TemplateProviderQuality;
  authoring_signals: TemplateAuthoringSignal[];
  submitted_at: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}
export interface TemplateGenerationResponse {
  object: 'template_generation';
  name: string;
  language: string;
  category: TemplateCategory;
  /** Format requested for this editable, non-persisted draft. */
  parameter_format: TemplateParameterFormat;
  components: TemplateComponent[];
  authoring_signals: TemplateAuthoringSignal[];
}
export type ListTemplatesResponse = ListResponse<TemplateResponse>;
export interface EstimateTemplateCostRequest {
  recipients?: number;
}
export interface TemplateCostEstimateResponse {
  object: 'template_cost_estimate';
  template_id: string;
  category: TemplateCategory;
  meter_id: string;
  recipients: number;
  unit_amount_brl: string;
  total_brl: string;
  currency: 'brl';
  rate_card_id: string;
}
export interface TemplateAnalyticsResponse {
  object: 'template_analytics';
  template_id: string;
  approvals: {
    submissions: number;
    approved: number;
    rejected: number;
    pending: number;
    approval_rate: number;
  };
  sends: {
    total: number;
    accepted: number;
    queued: number;
    sending: number;
    sent: number;
    provider_accepted: number;
    delivered: number;
    read: number;
    failed: number;
    cancelled: number;
    expired: number;
    success_rate: number;
    last_sent_at: string | null;
  };
}

export type {
  CreditToppedUpWebhookData,
  CreditToppedUpWebhookEnvelope,
  CreditHardBlockLiftedWebhookData,
  CreditHardBlockEngagedWebhookData,
  CreditHardBlockLiftedWebhookEnvelope,
  CreditHardBlockEngagedWebhookEnvelope,
} from './credit-webhook-contracts.js';
