# Changelog

All notable changes to `@tyxter/sdk-js` are documented here. The format is based
on Keep a Changelog, and versions follow semver — while the package is `0.x`,
minor bumps may carry additive surface and patch bumps are fixes only.

This TypeScript / JavaScript SDK is the **canonical** Tyxter SDK. The Python
SDK is released independently and can lag its route surface or version. Canonical cross-SDK contract checks run in the development monorepo. See README.md for the portable checks available here.

Releases publish from a `sdk-js-v<version>` git tag via npm Trusted Publishing.
A version bump alone publishes nothing.

## [Unreleased]

## [0.9.0] — 2026-10-06

### Fixed

- Subscription subscribe/change send the flat API request body. Subscribe/change/cancel
  send the supplied idempotency key in the header, preserving existing call signatures.
- Package purchases are card-only; `payment_method` is optional and the SDK accepts the
  optional `payment_method_id` saved-card selector.
- Phone-specific LLM routes can be read with `llm.getRoute({ phone_number_id })` and deleted
  with `llm.deleteRoute({ idempotencyKey }, { phone_number_id })`. Existing default-route
  calls remain supported.
- `contacts.list` exposes `search`, `status`, and `tag_id`; automation updates allow
  `description: null`. Consent, AI/LLM, flow, payment-method, auto-top-up, retention, and
  template-cost inputs expose their exact API fields instead of untyped JSON.
- Optional trace headers are available on device authorization create/token, batch
  reads/controls, media reads/delete, and transcription retrieval.
- Compile-time request parity and schema-validated request tests cover these corrections.
- Clarify that remaining messaging allowance uses the configured safety margin
  and sending-phone quality ratio. Linked phones share portfolio usage but can
  report different estimates when quality differs. This quality-aware change adds
  no fields to public phone reads; additional dashboard pacing fields remain BFF-only.
  Refs #951.

### Deprecated

- `whatsappChannels`, `WhatsAppChannelsResource`, and `WhatsAppChannelMessage` are legacy
  unsupported helpers. The public API rejects their payloads with `invalid_message_request`.
  They remain available to preserve imports and existing error handling; they do not publish
  to WhatsApp Channels. The SDK examples now show only supported message channels.

### Added

- Beta WhatsApp Business groups eligibility read: `groups.retrieveEligibility`
  (`GET /v1/groups/eligibility`, scope `groups:read`) and the `GroupEligibilityResponse` type.
  It answers from Tyxter without reaching Meta. WhatsApp Business groups are business-owned groups
  created through Meta's Groups API, never personal WhatsApp groups. Refs #1214.

- Beta WhatsApp Business groups eligibility check: `groups.createEligibilityCheck`
  (`POST /v1/groups/eligibility-checks`, scope `groups:write`, optional `idempotencyKey`). It
  returns 202 with the stored answer and a new `check_requested_at`; a Tyxter worker reads the
  facts from Meta afterwards, and `groups.retrieveEligibility` shows the result. Refs #1214.

- Beta WhatsApp Business group create: `groups.create` (`POST /v1/groups`, scope `groups:write`,
  optional `idempotencyKey`) and the `GroupResponse` type. It returns 202 with the group as
  `pending`; a new group stays `pending` until a Tyxter worker resolves its create outcome, and a
  create the worker finds it cannot send (for example the number was released meanwhile) ends `failed`
  with a `failure.code` saying why. Refs #1214.

- Beta WhatsApp Business group list: `groups.list` (`GET /v1/groups`, scope `groups:read`) with
  cursor pagination and optional `phone_number_id` and `status` filters, and the
  `ListGroupsResponse` type. Refs #1214.

- Beta WhatsApp Business group webhook types: `GroupWebhookData` / `GroupWebhookEnvelope` for
  `group.created`, `group.create_failed`, `group.deleted`, `group.delete_failed`,
  `group.invite_link_reset` and `group.invite_link_reset_failed`, and
  `GroupParticipantWebhookData` / `GroupParticipantWebhookEnvelope` for
  `group.participant_joined` and `group.participant_removed` (`initiated_by` on a removal only).
  Refs #1214.

- Beta WhatsApp Business group retrieve: `groups.retrieve` (`GET /v1/groups/:group_id`, scope
  `groups:read`). The id is percent-encoded into the path, so a personal WhatsApp group invite
  link or app group id returns `422 personal_whatsapp_group_not_supported`; any other unknown id
  returns `404 group_not_found`.
  Refs #1214.

- Beta WhatsApp Business group delete: `groups.delete` (`DELETE /v1/groups/:group_id`, scope
  `groups:write`, optional `idempotencyKey`). It returns 202 with the group: an `active` group as
  `deleting` (a Tyxter worker then deletes it), a `failed` group as `deleted`, and a `deleting` or
  `deleted` group unchanged; a `pending` group returns `409 group_not_active`. It keeps working
  when the `groups` feature family is disabled. Refs #1214.

- Beta WhatsApp Business group invite-link reset: `groups.resetInviteLink`
  (`POST /v1/groups/:group_id/invite-link/reset`, scope `groups:write`, optional `idempotencyKey`).
  It returns 202 with the group still `active`; while it stays `active`, a Tyxter worker then
  stores the new `invite_link`, or records `failure` and keeps the old link. While the group is
  `deleting`, the reset's outcome leaves `failure` to the delete, and in production a reset not yet
  sent when the delete is accepted is not sent (reset again if the delete is refused). Any other
  status returns `409 group_not_active`; a same-key retry never resets again. A new request
  while a reset worker is running returns `409 group_invite_link_reset_in_progress`; retry after
  it finishes. A queued reset can still be superseded before a worker starts it. Refs #1214.

- Beta WhatsApp Business group participants: `GroupResponse` gains `participants` (each `wa_id`
  and `joined_at`) and `participant_count`, the current members Tyxter recorded from Meta's
  participant events (sandbox: the simulation below); a `deleted` group lists none. Refs #1214.

- Beta sandbox participant simulation: `sandbox.groups.simulateParticipant`
  (`POST /v1/sandbox/groups/:group_id/participants`, scope `groups:write`, sandbox keys only,
  optional `idempotencyKey`). It simulates a participant joining (`join`) or leaving (`remove`) an
  `active` group and returns 200 with the group; a join of a current member or a removal of a
  non-member changes nothing, so a retry never records the fact twice. A ninth joined participant
  returns `409 group_participant_limit_reached`. Refs #1214.

- `client.payments.cancel(id, { idempotencyKey })` queues merchant hosted-checkout cancellation and returns the current payment; a keyed replay returns the original receipt, so retrieve or poll for provider confirmation. Transparent Pix returns `payment_cancellation_unsupported` with feedback. Refs #1225.

- `billing.balance()` returns `held_brl`, the credit held by outstanding production holds and
  already deducted from `balance_brl`. `billing.listLedger()` entries are now typed as
  `LedgerEntryResponse` (previously untyped JSON objects): `type` adds `hold` and `release` for
  payment completion fees, `source_type` adds `payment_fee_hold` (also accepted as a filter), and
  every entry has nullable `payment_fee` (`payment_object`, `payment_id`, `reservation_id`). Only
  `debit` entries are spend. Refs #1211.

- `PaymentResponse` and `AgenticPaymentResponse` carry optional `fees` (type `PaymentFees`) on
  create, retrieve, list and every other route that returns a payment: `simulated` (sandbox),
  `rate_card_id` (pricing version), `initiation` (`reservation_id`, `amount_brl`, `charged_at`)
  and `completion` (`reservation_id`, `rate` as a fraction such as `"0.01"`, `amount_brl`, `state`
  `held` | `settled` | `released` | `unresolved`, and its timestamps). `null` means no fee is owed
  (the payment was charged none: accepted before payment-service fees applied, or by an API
  version that did not charge them). An `Idempotency-Key` replay (creation, request approval, the
  sandbox status route or cancel) returns its stored response, with `fees` as at the original
  call, so read the payment for the current state; the key is absent only on such a replay whose
  response was stored before the field existed. Refs #1211.

- Message read senders and newly rendered `message.*` webhook data now include nullable
  `profile_name`, the captured customer WhatsApp profile name for resolved inbound WhatsApp
  messages. It is `null` for all other sender kinds and after privacy cleanup.

- Customer-owned Salvy BYOK provider-connection methods: `providerConnections.salvy.register`,
  `.rotate`, `.refreshDiscovery`, and `.listNumbers`. Writes require an idempotency key and
  return the existing asynchronous provider-connection receipt; number reads use the persisted
  cursor snapshot. The SDK now exports the matching Salvy request, operation, number, provider,
  channel, and setup-target types.

- Customer-owned Salvy phone foundation methods: `phoneNumbers.importSalvy` (`POST
/v1/phone-numbers/import-salvy`), `phoneNumbers.completeSalvyRegistration` (`POST
/v1/phone-numbers/:phone_number_id/salvy/complete-registration`),
  `phoneNumbers.convertToByon` (`POST /v1/phone-numbers/:phone_number_id/convert-to-byon`), and
  `billing.phoneManagement.list` (`GET /v1/billing/phone-management`). The three mutations require
  an `Idempotency-Key`; management list is read-only. While runtime admission is inactive, import
  returns `503 salvy_byok_unavailable` even for a plan whose `salvy_byok_enabled` flag is true.
  Integrating agents should use the provider-connection methods for cached discovery and must not
  infer enrollment readiness from that plan flag.

- Optional advisory `warnings` on phone provision/connect and Meta WhatsApp
  registration responses. Legacy responses may omit the field; phone read types
  retain their existing shape.

- Optional `prompt` and `keywords` on transcription create/retry requests, with
  normalized replay, retry inheritance and explicit empty clearing.

- Optional `TyxterErrorBody.retryable` and readonly `TyxterApiError.retryable`
  expose the `false` stop hint for `402 credit_balance_exhausted`. Stop automatic
  retries until credit recovery; legacy omission remains `undefined`. The SDK
  does not add retries or a recovery timer. Refs #861.

## [0.8.0] — 2026-09-01

The `sdk-js-v0.7.0` tag was never pushed, so the 0.7.0 section below never
reached npm — the registry stayed on 0.6.0. This release is the first published
artifact carrying both the 0.7.0 surface and the additions here.

### Added

- Optional `voice` on WhatsApp media payloads. Set `voice: true` for an
  OGG/Opus mono voice note; omit it or use `false` for ordinary audio. The
  field is intentionally unavailable on Instagram media payloads. Additive;
  no package version bump or publish accompanies this change.
- `MediaDownloadHint` plus `download` on media asset and consumed inbound-media
  response types. The `{ method: 'GET', path }` value points to the
  authenticated five-minute URL-minting route; it never contains the signed URL
  itself. Non-downloadable asset states report `download: null`, while failed,
  expired, and deleted inbound descriptors omit the affordance.
- `PhoneLessInboundSenderIdentity` and `MessageReadSenderIdentity` document the
  existing production inbound WhatsApp fallback where Meta withholds the
  customer phone and message reads return `sender: { type: 'phone_e164', id: '' }`.
  The empty id is output-only and unresolved; request and recipient identities
  remain non-empty.
- Typed `MessageMediaTranscriptionWebhookEnvelope` success/failure union and
  the additive `message.media_transcription_failed` terminal webhook contract.
  Failed transcript events expose the same stable `error_code` as the GET
  receipt and carry no speech or provider details.

## [0.7.0] — 2026-08-24

### Added

- `'tier_2k'` on `PhoneMessagingTier` — `messaging_tier` on phone-number
  responses and on the `phone_number.messaging_tier_changed` /
  `messaging_limit_paused` / `messaging_limit_resumed` webhook payloads. Meta now
  sets business-initiated messaging limits per business portfolio on a
  250 → 2K → 10K → 100K → unlimited ladder, and `TIER_2K` used to arrive as
  `'unknown'`. On a linked Meta phone this is descriptive portfolio health, not a
  second per-phone quota: the existing remaining-allowance field repeats the
  shared portfolio estimate. Additive with no SDK version bump: a reader that
  switches on the enum should keep its default branch.
- `retry_after_ms` on the error body, exposed as `TyxterApiError.retryAfterMs`.
  It is set on `429` rate-limit responses — the shared API limiter and the
  manual transcription-retry cooldown each name the wait they are enforcing —
  and is absent everywhere else, so schedule from it when it is present and
  fall back to your own backoff when it is not. Additive and optional: an
  older SDK ignores it.
- `discovery` on the error body, carrying `openapi` and `well_known`: the two
  constant relative paths on the API host that describe what the API actually
  serves. It is attached to `route_not_found` responses on `/v1/*` paths, so a
  caller that guessed a route can read the spec instead of guessing again.
  Both values are fixed constants and are never derived from a request header,
  so a spoofed `Host` cannot aim a 404 at someone else's origin. Read it
  through `err.body.discovery` — there is no dedicated accessor. Additive and
  optional: an older SDK ignores it.

- Two inbound `type` values on message retrieve/list responses: `unsupported`
  (the provider refused to deliver the content — WhatsApp video notes, polls,
  some view-once content) and `unknown` (the provider delivered a type Tyxter
  does not project yet, such as a shared location or contact card). Both used to
  arrive as a `text` message with no body. `type` remains an open string, so a
  reader that switches on it keeps working.
- `unsupported: InboundUnsupportedDescriptor | null` and
  `unknown: InboundUnknownDescriptor | null` on `MessageDetailResponse` and list
  rows, carrying the provider's own type name plus — for a refusal — its error
  code and explanation. Both are present without `include: 'payload'`, are
  mutually exclusive, and are `null` on every other message, so an integrator
  can tell a refused video note from an unmodelled location without parsing raw
  provider payloads.
- `sandbox.inboundMessages.create()` accepts `type: 'unsupported'` and
  `type: 'unknown'`, plus optional `unsupported` / `unknown` blocks whose
  `provider_type` overrides the default (`'video_note'` / `'location'`). A
  refusal's reason is synthesized as the real WhatsApp one — code `131051`,
  "Message type is currently not supported." — so a sandbox key produces the
  same message row, retrieve/list descriptor, and `message.received` content as
  the provider path and both branches are rehearsable before connecting Meta.
- `openai.stt` as a capability-specific provider credential setup target and
  `completed_stt_provider` on setup-session responses. STT completion is
  separate from TTS and generic provider connections, and never returns the
  plaintext key. Setup responses now expose the exact target/status state union
  in TypeScript and generated JSON Schema: non-completed sessions have all
  completion axes null, while a completed session populates only its matching
  axis. Sandbox creation rejects `openai.stt` with
  `provider_credential_setup_stt_sandbox_unsupported` because its deterministic
  transcription simulator needs no provider credential.
- `messages.retryTranscription(messageId, body, { idempotencyKey, traceId? })`
  for bounded manual recovery of a failed inbound-audio transcription. The
  `idempotencyKey` option is required; same-key retries replay the accepted
  receipt instead of opening another generation.
- Standalone marketing `COPY_CODE` template buttons through the existing
  free-form template component fields. The package README and public type
  comments now pin the authoring and send shapes, including the distinction
  from OTP `COPY_CODE`, the no-text rule, and the direct-send-only limitation.

### Changed

- Typing-indicator guidance now requires the Tyxter message ID at
  `message.received.data.message_id`; the webhook envelope ID and Meta provider
  ID cannot target `messages.typing()`.

## [0.6.0] — 2026-08-08

### Added

- Typed native WhatsApp `order_details` interactive messages with Brazil Pix
  `pix_dynamic_code` payment settings. Tyxter admits the free-form request only
  after its own prechecks, but Meta evaluates WABA and message eligibility at
  provider-send time, so an accepted response is not a delivery guarantee.
  Native Pix settlement remains the caller's merchant/PSP responsibility.
- `waba_ban_state`, `account_review_status`, and `restrictions` on full
  `ProviderConnectionResponse` objects, including provider lists and payment
  connection-status embeds. The raw Meta vocabularies remain forward-compatible
  strings; each restriction has `restriction_type`, nullable `expiration`, and
  nullable `remediation`.
- `InboundMessageMediaDescriptor` and nullable `media` on message retrieve/list
  responses. It matches the `message.received` webhook descriptor, so polling
  integrations can discover the Tyxter `mda_*` handle without parsing raw Meta
  payloads or matching against the media list.
- `media.createDownloadUrl(assetId)` and `MediaAssetDownloadResponse` for minting
  a fresh short-lived capability URL from an inbound attachment's Tyxter
  `mda_*` asset id.
- `messages.requestTranscription(messageId, request)` and
  `messages.retrieveTranscription(messageId)`, with
  `RequestMessageMediaTranscription` and `MessageMediaTranscriptResponse`, for
  opt-in asynchronous transcription of inbound WhatsApp audio.
- `media.list({ source })` filtering with the new `MediaAssetSource` type, plus
  `source`, `provider`, `provider_media_id`, `failure_code`, and
  `failure_message` on `MediaAssetResponse`. `MediaAssetStatus` now includes
  `failed` for terminal inbound-download failures.

### Changed

- `providerConnections.meta.exchangeOAuth()` accepts a code-only request when
  Meta's browser relay omits `waba_id`. Tyxter continues only when the OAuth
  token proves exactly one WhatsApp Business Account; otherwise it preserves a
  retryable setup and returns `meta_waba_missing`.
- `WebhookEventLogResponse.payload` is documented as `null` after contact
  erasure or retention clearing; the event-log row remains available.

## [0.5.0] — 2026-08-05

Additive WhatsApp messaging-limit visibility and typing-indicator support.
These surfaces let SDK consumers explain deferred sends, estimate when a phone
number or batch will regain capacity, and signal that a reply is being composed.

### Added

- `status_reason` on `MessageResponse` (inherited by `MessageDetailResponse` and
  list rows) — why a message is in its current status. Today the only value is
  `messaging_limit_pacing`: the send is being held because the sending number has
  used up WhatsApp's daily allowance of new recipients. Typed as `string | null`
  rather than a union, deliberately: more reasons may be named later.
- `pacing` on `MessageBatchResponse`, with the new `MessageBatchPacingResponse`
  type — an accept-time forecast of how many recipients will wait for allowance
  and how many daily windows the batch should span. `null` on retrieve and list.
- `remaining_messaging_allowance_estimate` on `PhoneNumberResponse` — how many
  new recipients the number can still start a conversation with. An estimate, and
  `null` means "cannot estimate", never zero.
- `messages.typing(messageId, { traceId })` and `TypingIndicatorResponse` for
  `POST /v1/messages/:message_id/typing`. The call marks the inbound WhatsApp
  message as read, shows the typing indicator, and forwards an optional trace ID;
  it intentionally accepts no idempotency key because it persists nothing.

### Fixed

- Updated the canonical sandbox webhook signature vector to include the
  deterministic sandbox provider message ID.

## [0.4.0] — 2026-08-03

Eighteen commits had changed `src/` since 0.3.1 without a release, so npm
consumers were installing types that under-described the product by two whole
resources. Verified against the published artifact: the 0.3.1 tarball contains
zero occurrences of `suspension_reason` and no `dist/resources/data-retention.js`
at all, while the docs site and module READMEs both instruct integrators to read
that field off a provider connection.

Minor rather than patch because these are new resources, not new fields.

### Added

- `dataRetention` resource — `get` and `update` against `/v1/data-retention`.
- `metaSignupSessions` resource — `create` and `retrieve` for the Meta embedded
  signup handoff.
- `suspension_reason` on `ProviderConnectionResponse`.
- Additive fields and options across `flows`, `llm`, `aiAgents`, and `sandbox`.

### Fixed

- Route and header coverage re-pinned to the launch manifest, closing the gap
  between shipped source and published types.

## [0.3.1] — 2026-07-21

### Changed

- Relicensed to **MIT**, with the `LICENSE` file shipping inside the tarball.

### Added

- `sandbox.llm.setFailure` for deterministic LLM failure scenarios.

## [0.3.0] — 2026-07-14

### Added

- Structured phone recipients: `to` accepts
  `{ countryCallingCode, nationalNumber }` alongside the existing
  `to: "+E.164"` string form, which remains supported.

### Fixed

- Payment and phone contract gaps surfaced by the conformance walk.

## [0.2.0] — 2026-07-10

### Added

- Opt-in `include=payload` on `messages.list`, returning stored request payload
  and metadata (both `null` without it).

### Fixed

- Webhook and LLM contract regressions; signing-secret fixture alignment.

## [0.1.0] — 2026-07-08

First published release.

### Added

- `Tyxter` client with API-key auth, base-URL override, and idempotency support.
- Core resources: messages, media, templates, contacts, batches, audiences,
  phone numbers, provider connections, api-keys, webhook-endpoints,
  webhook-events, sandbox, usage, billing, payments, agentic payments,
  AI agents, automations, flows, LLM routes, rate cards, fiscal, and feedback.
- Channel-native helpers for `whatsapp`, `instagram`, and `whatsappChannels`.
- Customer-side webhook signature verifier, so integrators do not re-implement
  the HMAC check.
