# Changelog

All notable changes to `@tyxter/sdk-js` are documented here. The format is based
on Keep a Changelog, and versions follow semver — while the package is `0.x`,
minor bumps may carry additive surface and patch bumps are fixes only.

This TypeScript / JavaScript SDK is the **canonical** Tyxter SDK. The Python
SDK is released independently and can lag its route surface or version. Canonical cross-SDK contract checks run in the development monorepo. See README.md for the portable checks available here.

Releases publish from a `sdk-js-v<version>` git tag via npm Trusted Publishing.
A version bump alone publishes nothing.

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
