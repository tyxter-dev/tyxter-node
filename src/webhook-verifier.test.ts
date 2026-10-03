import { describe, expect, it } from 'vitest';

import { verifyWebhookSignature } from './webhook-verifier.js';

const sandboxMessageReceivedRawBody = JSON.stringify({
  id: 'evt_sandbox_message_received_123',
  type: 'message.received',
  created_at: '2026-05-21T15:00:00.000Z',
  environment: 'sandbox',
  trace_id: 'trc_sandbox_message_received_123',
  data: {
    message_id: 'msg_sandbox_inbound_123',
    status: 'received',
    channel: 'whatsapp',
    sender: { type: 'phone_e164', id: '+5511988887777' },
    recipient: { type: 'whatsapp_phone_number', id: 'pn_sandbox_123' },
    provider_message_id: 'sb_wamid_1f7b0c9d4e2a48f3b5c6d7e8f9a0b1c2',
    metadata: { sandbox: true },
    content: {
      type: 'text',
      text: { body: 'Oi, quero marcar uma aula' },
    },
  },
});

const sandboxSignatureVector = {
  secret: 'f7d9a2c04b8e61537a90d4c2e8b5f013c6a7d84592e0b1f3a8c5d6e7f9012345',
  timestamp: '1779375600',
  rawBody: sandboxMessageReceivedRawBody,
  signature: '0693eb1d17770f958eba5f8e927e145844b507f418513b0aeb59ccb5b5cde329',
};

describe('verifyWebhookSignature', () => {
  it('accepts the canonical sandbox message.received test vector', () => {
    expect(
      verifyWebhookSignature({
        ...sandboxSignatureVector,
        toleranceSeconds: Number.MAX_SAFE_INTEGER,
      }),
    ).toBe(true);
  });

  it('rejects the canonical vector when the raw body changes', () => {
    expect(
      verifyWebhookSignature({
        ...sandboxSignatureVector,
        rawBody: `${sandboxSignatureVector.rawBody}\n`,
        toleranceSeconds: Number.MAX_SAFE_INTEGER,
      }),
    ).toBe(false);
  });

  it('rejects timestamps outside the replay tolerance', () => {
    expect(
      verifyWebhookSignature({
        ...sandboxSignatureVector,
        toleranceSeconds: 0,
      }),
    ).toBe(false);
  });
});
