import { describe, expect, it, vi } from 'vitest';
import { Tyxter } from '../client.js';

type CapturedCall = {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string | undefined;
};

function withCapture(responseBody: unknown = acceptedMessage()) {
  const calls: CapturedCall[] = [];
  const fetchImpl = vi.fn(
    async (
      url: string,
      init: {
        method?: string;
        headers?: Record<string, string>;
        body?: string;
        signal?: unknown;
      },
    ) => {
      calls.push({
        url,
        method: init.method ?? 'GET',
        headers: init.headers ?? {},
        body: init.body,
      });
      return new Response(JSON.stringify(responseBody), {
        status: 202,
        headers: { 'content-type': 'application/json' },
      });
    },
  ) as unknown as typeof fetch;
  const client = new Tyxter({
    apiKey: 'tx_sandbox_aaaaaaaaaaaaaaaaaaaaaaaa',
    baseUrl: 'http://test',
    fetch: fetchImpl,
  });
  return { client, calls };
}

function acceptedMessage() {
  return {
    id: 'msg_1',
    object: 'message',
    status: 'accepted',
    channel: 'whatsapp',
    environment: 'sandbox',
    template_id: null,
    template_version_id: null,
    template_version: null,
    created_at: '2026-04-29T12:00:00Z',
    trace_id: 'trc_1',
  };
}

describe('MessagesResource', () => {
  it('POSTs create payloads and forwards idempotency headers', async () => {
    const { client, calls } = withCapture();
    await client.messages.create(
      {
        channel: 'whatsapp',
        sender: { type: 'whatsapp_phone_number', id: 'phone_number_id' },
        recipient: { type: 'phone_e164', id: '+5511999999999' },
        message: {
          type: 'template',
          template: {
            name: 'order_shipped',
            language: 'pt_BR',
            variables: { customer_name: 'Ana' },
          },
        },
      },
      { idempotencyKey: 'idem_1', traceId: 'trc_client' },
    );

    expect(calls[0]?.url).toBe('http://test/v1/messages');
    expect(calls[0]?.method).toBe('POST');
    expect(calls[0]?.headers['idempotency-key']).toBe('idem_1');
    expect(calls[0]?.headers['tyxter-trace-id']).toBe('trc_client');
    expect(JSON.parse(calls[0]?.body ?? '{}')).toMatchObject({
      channel: 'whatsapp',
      sender: { type: 'whatsapp_phone_number', id: 'phone_number_id' },
      recipient: { type: 'phone_e164', id: '+5511999999999' },
      message: {
        type: 'template',
        template: { name: 'order_shipped' },
      },
    });
  });

  it('provides typed helpers for every launch transport message branch', async () => {
    const { client, calls } = withCapture();

    await client.messages.sendText({
      channel: 'whatsapp',
      sender: { type: 'whatsapp_phone_number', id: 'phone_number_id' },
      recipient: { type: 'phone_e164', id: '+5511999999999' },
      text: { body: 'hello' },
    });
    await client.messages.sendMedia({
      channel: 'whatsapp',
      sender: { type: 'whatsapp_phone_number', id: 'phone_number_id' },
      recipient: { type: 'phone_e164', id: '+5511999999999' },
      media: { kind: 'audio', link: 'https://example.com/voice.ogg' },
    });
    await client.messages.sendInteractive({
      channel: 'whatsapp',
      sender: { type: 'whatsapp_phone_number', id: 'phone_number_id' },
      recipient: { type: 'phone_e164', id: '+5511999999999' },
      interactive: {
        type: 'button',
        body: { text: 'Choose one' },
        action: {
          buttons: [
            { type: 'reply', reply: { id: 'yes', title: 'Yes' } },
            { type: 'reply', reply: { id: 'no', title: 'No' } },
          ],
        },
      },
    });
    await client.messages.sendFlow({
      channel: 'whatsapp',
      sender: { type: 'whatsapp_phone_number', id: 'phone_number_id' },
      recipient: { type: 'phone_e164', id: '+5511999999999' },
      flow: {
        type: 'flow',
        body: { text: 'Complete signup' },
        action: {
          name: 'flow',
          parameters: {
            flow_id: 'flow_123',
            flow_token: 'token_123',
            flow_cta: 'Start',
          },
        },
      },
    });
    await client.messages.sendText({
      channel: 'instagram',
      sender: { type: 'instagram_account', id: 'ig_business_1' },
      recipient: { type: 'instagram_user', id: 'igsid_123' },
      text: { body: 'hello instagram' },
    });
    await client.messages.sendText({
      channel: 'whatsapp_channel',
      sender: { type: 'whatsapp_channel', id: 'wa_channel_1' },
      recipient: { type: 'whatsapp_channel_audience', id: 'followers' },
      text: { body: 'channel update' },
    });

    const bodies = calls.map(
      (call) => JSON.parse(call.body ?? '{}') as { channel: string; message: { type: string } },
    );
    expect(bodies.map((body) => body.message.type)).toEqual([
      'text',
      'media',
      'interactive',
      'flow',
      'text',
      'text',
    ]);
    expect(bodies[1]).toMatchObject({
      channel: 'whatsapp',
      message: { type: 'media', media: { kind: 'audio' } },
    });
    expect(bodies[2]).toMatchObject({
      channel: 'whatsapp',
      message: {
        type: 'interactive',
        interactive: {
          type: 'button',
          body: { text: 'Choose one' },
          action: {
            buttons: [
              { type: 'reply', reply: { id: 'yes', title: 'Yes' } },
              { type: 'reply', reply: { id: 'no', title: 'No' } },
            ],
          },
        },
      },
    });
    expect(bodies.at(-2)).toMatchObject({
      channel: 'instagram',
      sender: { type: 'instagram_account', id: 'ig_business_1' },
      recipient: { type: 'instagram_user', id: 'igsid_123' },
    });
    expect(bodies.at(-1)).toMatchObject({
      channel: 'whatsapp_channel',
      sender: { type: 'whatsapp_channel', id: 'wa_channel_1' },
      recipient: { type: 'whatsapp_channel_audience', id: 'followers' },
    });
  });

  it('provides channel facades that post channel-native message payloads', async () => {
    const { client, calls } = withCapture();

    await client.whatsapp.sendText(
      {
        from: 'phone_number_id',
        to: '+5511999999999',
        body: 'hello',
      },
      { idempotencyKey: 'idem_whatsapp', traceId: 'trc_whatsapp' },
    );
    await client.whatsapp.sendMedia({
      from: 'phone_number_id',
      to: '+5511999999999',
      media: { kind: 'audio', link: 'https://example.com/voice.ogg' },
    });
    await client.whatsapp.sendAudioFromText({
      from: 'phone_number_id',
      to: '+5511999999999',
      tts: {
        type: 'tts',
        provider: 'elevenlabs',
        text: 'Your order is ready for pickup.',
        voice: 'voice_1',
        language: 'en-US',
      },
      metadata: { order_id: 'ord_123' },
    });
    await client.whatsapp.sendTemplate({
      from: 'phone_number_id',
      to: '+5511999999999',
      name: 'winter_coupon',
      language: 'en_US',
      components: [
        {
          type: 'button',
          sub_type: 'copy_code',
          index: 0,
          parameters: [{ type: 'coupon_code', coupon_code: 'WINTER25' }],
        },
      ],
    });
    await client.whatsapp.sendInteractive({
      from: 'phone_number_id',
      to: '+5511999999999',
      interactive: {
        type: 'button',
        body: { text: 'Choose one' },
        action: {
          buttons: [{ type: 'reply', reply: { id: 'yes', title: 'Yes' } }],
        },
      },
    });
    await client.whatsapp.sendFlow({
      from: 'phone_number_id',
      to: '+5511999999999',
      flow: {
        type: 'flow',
        body: { text: 'Complete signup' },
        action: {
          name: 'flow',
          parameters: {
            flow_id: 'flow_123',
            flow_token: 'token_123',
            flow_cta: 'Start',
          },
        },
      },
    });
    await client.instagram.sendText({
      accountId: 'ig_business_account_id',
      userId: 'igsid_123',
      body: 'thanks for your DM',
    });
    await client.instagram.sendMedia({
      accountId: 'ig_business_account_id',
      userId: 'igsid_123',
      media: { kind: 'image', link: 'https://example.com/story-reply.png' },
    });
    await client.whatsappChannels.publishText({
      channelId: 'wa_channel_1',
      body: 'new update',
    });
    await client.whatsappChannels.publishMedia({
      channelId: 'wa_channel_1',
      media: { kind: 'image', link: 'https://example.com/update.png' },
    });

    expect(calls[0]?.url).toBe('http://test/v1/messages');
    expect(calls[0]?.headers['idempotency-key']).toBe('idem_whatsapp');
    expect(calls[0]?.headers['tyxter-trace-id']).toBe('trc_whatsapp');
    const bodies = calls.map(
      (call) =>
        JSON.parse(call.body ?? '{}') as {
          channel: string;
          sender: { type: string; id: string };
          recipient: { type: string; id: string };
          message: { type: string };
        },
    );
    expect(bodies.map((body) => `${body.channel}:${body.message.type}`)).toEqual([
      'whatsapp:text',
      'whatsapp:media',
      'whatsapp:media',
      'whatsapp:template',
      'whatsapp:interactive',
      'whatsapp:flow',
      'instagram:text',
      'instagram:media',
      'whatsapp_channel:text',
      'whatsapp_channel:media',
    ]);
    expect(bodies[0]).toMatchObject({
      sender: { type: 'whatsapp_phone_number', id: 'phone_number_id' },
      recipient: { type: 'phone_e164', id: '+5511999999999' },
    });
    expect(bodies[2]).toMatchObject({
      channel: 'whatsapp',
      sender: { type: 'whatsapp_phone_number', id: 'phone_number_id' },
      recipient: { type: 'phone_e164', id: '+5511999999999' },
      message: {
        type: 'media',
        media: {
          kind: 'audio',
          source: {
            type: 'tts',
            provider: 'elevenlabs',
            text: 'Your order is ready for pickup.',
            voice: 'voice_1',
            language: 'en-US',
          },
        },
      },
      metadata: { order_id: 'ord_123' },
    });
    expect(bodies[3]).toMatchObject({
      message: {
        type: 'template',
        template: {
          name: 'winter_coupon',
          language: 'en_US',
          components: [
            {
              type: 'button',
              sub_type: 'copy_code',
              index: 0,
              parameters: [{ type: 'coupon_code', coupon_code: 'WINTER25' }],
            },
          ],
        },
      },
    });
    expect(bodies[6]).toMatchObject({
      sender: { type: 'instagram_account', id: 'ig_business_account_id' },
      recipient: { type: 'instagram_user', id: 'igsid_123' },
    });
    expect(bodies[8]).toMatchObject({
      sender: { type: 'whatsapp_channel', id: 'wa_channel_1' },
      recipient: { type: 'whatsapp_channel_audience', id: 'followers' },
    });
  });

  it('forwards true and false WhatsApp voice-note intent unchanged', async () => {
    const { client, calls } = withCapture();

    await client.whatsapp.sendMedia({
      from: 'phone_number_id',
      to: '+5511999999999',
      media: { kind: 'audio', link: 'https://example.com/voice-note.ogg', voice: true },
    });
    await client.messages.sendMedia({
      channel: 'whatsapp',
      sender: { type: 'whatsapp_phone_number', id: 'phone_number_id' },
      recipient: { type: 'phone_e164', id: '+5511999999999' },
      media: { kind: 'audio', link: 'https://example.com/audio.ogg', voice: false },
    });

    expect(JSON.parse(calls[0]?.body ?? '{}')).toMatchObject({
      channel: 'whatsapp',
      message: {
        type: 'media',
        media: { kind: 'audio', link: 'https://example.com/voice-note.ogg', voice: true },
      },
    });
    expect(JSON.parse(calls[1]?.body ?? '{}')).toMatchObject({
      channel: 'whatsapp',
      message: {
        type: 'media',
        media: { kind: 'audio', link: 'https://example.com/audio.ogg', voice: false },
      },
    });
  });

  it('sends the typed native Pix order-details request through the WhatsApp facade', async () => {
    const { client, calls } = withCapture();

    await client.whatsapp.sendInteractive({
      from: 'phone_number_id',
      to: '+5511999999999',
      interactive: {
        type: 'order_details',
        body: { text: 'Review and pay your order.' },
        action: {
          name: 'review_and_pay',
          parameters: {
            reference_id: 'ord_123-20260807',
            type: 'physical-goods',
            payment_type: 'br',
            payment_settings: [
              {
                type: 'pix_dynamic_code',
                pix_dynamic_code: {
                  code: '00020101021226700014br.gov.bcb.pix',
                  merchant_name: 'Tyxter Store',
                  key: '39580525000189',
                  key_type: 'CNPJ',
                },
              },
            ],
            currency: 'BRL',
            total_amount: { value: 1290, offset: 100 },
          },
        },
      },
    });

    expect(JSON.parse(calls[0]?.body ?? '{}')).toEqual({
      channel: 'whatsapp',
      sender: { type: 'whatsapp_phone_number', id: 'phone_number_id' },
      recipient: { type: 'phone_e164', id: '+5511999999999' },
      message: {
        type: 'interactive',
        interactive: {
          type: 'order_details',
          body: { text: 'Review and pay your order.' },
          action: {
            name: 'review_and_pay',
            parameters: {
              reference_id: 'ord_123-20260807',
              type: 'physical-goods',
              payment_type: 'br',
              payment_settings: [
                {
                  type: 'pix_dynamic_code',
                  pix_dynamic_code: {
                    code: '00020101021226700014br.gov.bcb.pix',
                    merchant_name: 'Tyxter Store',
                    key: '39580525000189',
                    key_type: 'CNPJ',
                  },
                },
              ],
              currency: 'BRL',
              total_amount: { value: 1290, offset: 100 },
            },
          },
        },
      },
    });
  });

  it('GETs /v1/messages with cursor, status, and payload inclusion filters', async () => {
    const listBody = { object: 'list', data: [], has_more: false, next_cursor: null };
    const { client, calls } = withCapture(listBody);
    await client.messages.list({
      limit: 10,
      starting_after: 'msg_0',
      status: 'failed',
      include: 'payload',
    });

    expect(calls[0]?.url).toBe(
      'http://test/v1/messages?limit=10&starting_after=msg_0&status=failed&include=payload',
    );
    expect(calls[0]?.method).toBe('GET');
  });

  it('GETs /v1/messages/:id for retrieve', async () => {
    const { client, calls } = withCapture(messageDetail());
    await client.messages.retrieve('msg_123');

    expect(calls[0]?.url).toBe('http://test/v1/messages/msg_123');
    expect(calls[0]?.method).toBe('GET');
  });

  it('POSTs /v1/messages/:id/cancel for cancel', async () => {
    const { client, calls } = withCapture(messageDetail());
    await client.messages.cancel('msg_123');

    expect(calls[0]?.url).toBe('http://test/v1/messages/msg_123/cancel');
    expect(calls[0]?.method).toBe('POST');
  });

  it('requests and retrieves an inbound audio transcription', async () => {
    const transcript = {
      id: 'mtr_123',
      object: 'message_media_transcript',
      message_id: 'msg_123',
      media_asset_id: 'mda_123',
      status: 'pending',
      provider: null,
      model: null,
      language: 'pt',
      text: null,
      duration_seconds: null,
      error_code: null,
      error_message: null,
      trace_id: 'trc_transcript',
      created_at: '2026-08-05T20:00:00Z',
      completed_at: null,
    };
    const { client, calls } = withCapture(transcript);

    await expect(
      client.messages.requestTranscription(
        'msg_123',
        { language: 'pt', prompt: 'Clinic', keywords: ['Ada', 'Ada'] },
        { traceId: 'trc_transcript' },
      ),
    ).resolves.toMatchObject({ id: 'mtr_123', status: 'pending' });
    await expect(client.messages.retrieveTranscription('msg_123')).resolves.toMatchObject({
      id: 'mtr_123',
      status: 'pending',
    });

    expect(calls[0]).toMatchObject({
      method: 'POST',
      url: 'http://test/v1/messages/msg_123/transcription',
      headers: expect.objectContaining({ 'tyxter-trace-id': 'trc_transcript' }),
    });
    expect(JSON.parse(calls[0]?.body ?? '{}')).toEqual({
      language: 'pt',
      prompt: 'Clinic',
      keywords: ['Ada', 'Ada'],
    });
    expect(calls[1]).toMatchObject({
      method: 'GET',
      url: 'http://test/v1/messages/msg_123/transcription',
    });
  });

  it('retries a failed inbound audio transcription with required idempotency and optional trace headers', async () => {
    const transcript = {
      id: 'mtr_123',
      object: 'message_media_transcript',
      message_id: 'msg_123',
      media_asset_id: 'mda_123',
      status: 'pending',
      provider: null,
      model: null,
      language: null,
      text: null,
      duration_seconds: null,
      error_code: null,
      error_message: null,
      trace_id: 'trc_retry',
      created_at: '2026-08-09T20:00:00Z',
      completed_at: null,
    };
    const { client, calls } = withCapture(transcript);

    await expect(
      client.messages.retryTranscription(
        'msg_123',
        { language: 'pt', prompt: '', keywords: [] },
        { idempotencyKey: '  idem-retry-1  ', traceId: 'trc_retry' },
      ),
    ).resolves.toMatchObject({ id: 'mtr_123', status: 'pending' });

    expect(calls[0]).toMatchObject({
      method: 'POST',
      url: 'http://test/v1/messages/msg_123/transcription/retry',
      headers: expect.objectContaining({
        'idempotency-key': 'idem-retry-1',
        'tyxter-trace-id': 'trc_retry',
      }),
    });
    expect(JSON.parse(calls[0]?.body ?? '{}')).toEqual({
      language: 'pt',
      prompt: '',
      keywords: [],
    });
  });

  it('rejects missing, undefined, or blank retry keys before issuing a request on JavaScript paths', async () => {
    const { client, calls } = withCapture({});
    const invokeFromJavaScript = (args: unknown[]) =>
      Reflect.apply(
        client.messages.retryTranscription,
        client.messages,
        args as Parameters<typeof client.messages.retryTranscription>,
      );
    const invalidCalls: Array<{ label: string; args: unknown[] }> = [
      { label: 'missing options', args: ['msg_123', { language: 'pt' }] },
      { label: 'undefined options', args: ['msg_123', { language: 'pt' }, undefined] },
      {
        label: 'undefined key',
        args: ['msg_123', { language: 'pt' }, { idempotencyKey: undefined }],
      },
      {
        label: 'blank key',
        args: ['msg_123', { language: 'pt' }, { idempotencyKey: ' \t ' }],
      },
    ];

    for (const { label, args } of invalidCalls) {
      await expect(invokeFromJavaScript(args), label).rejects.toThrow(
        'messages.retryTranscription requires a non-blank options.idempotencyKey.',
      );
    }

    expect(calls).toHaveLength(0);
  });

  it('forwards the idempotency key on cancel', async () => {
    const { client, calls } = withCapture(messageDetail());
    await client.messages.cancel('msg_123', { idempotencyKey: 'idem-cancel-1' });

    expect(calls[0]?.url).toBe('http://test/v1/messages/msg_123/cancel');
    expect(calls[0]?.headers['idempotency-key']).toBe('idem-cancel-1');
  });

  it('POSTs /v1/messages/:id/typing for typing and returns the acknowledgement', async () => {
    const { client, calls } = withCapture(typingAck());
    const ack = await client.messages.typing('msg_123');

    expect(calls[0]?.url).toBe('http://test/v1/messages/msg_123/typing');
    expect(calls[0]?.method).toBe('POST');
    expect(calls[0]?.body).toBeUndefined();
    expect(ack).toEqual({
      object: 'typing_indicator',
      message_id: 'msg_123',
      status: 'accepted',
    });
  });

  it('never sends an Idempotency-Key on typing — the call persists nothing', async () => {
    const { client, calls } = withCapture(typingAck());
    await client.messages.typing('msg_123');

    expect(calls[0]?.headers['idempotency-key']).toBeUndefined();
  });

  it('forwards the trace id on typing', async () => {
    const { client, calls } = withCapture(typingAck());
    await client.messages.typing('msg_123', { traceId: 'trc_typing_request' });

    expect(calls[0]?.headers['tyxter-trace-id']).toBe('trc_typing_request');
  });
});

function typingAck() {
  return { object: 'typing_indicator', message_id: 'msg_123', status: 'accepted' };
}

function messageDetail() {
  return {
    id: 'msg_123',
    object: 'message',
    direction: 'outbound',
    channel: 'whatsapp',
    type: 'template',
    status: 'accepted',
    environment: 'sandbox',
    sender: { type: 'whatsapp_phone_number', id: 'phone_number_id' },
    recipient: { type: 'phone_e164', id: '+5511999999999' },
    provider: null,
    provider_message_id: null,
    template_name: 'order_shipped',
    metadata: null,
    error_code: null,
    error_message: null,
    trace_id: 'trc_1',
    created_at: '2026-04-29T12:00:00Z',
    updated_at: '2026-04-29T12:00:00Z',
    events: [],
  };
}
