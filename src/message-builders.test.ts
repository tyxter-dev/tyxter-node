import { describe, expect, it } from 'vitest';
import type { CreateMessageRequest } from './contracts.js';
import {
  InstagramMessage,
  WhatsAppChannelMessage,
  WhatsAppMessage,
  WhatsAppTemplate,
} from './message-builders.js';

describe('message builders', () => {
  it('builds the additive structured WhatsApp recipient shape', () => {
    expect(
      WhatsAppMessage.text({
        from: 'pn_1',
        to: { countryCallingCode: '55', nationalNumber: '11903244174' },
        body: 'Olá',
      }),
    ).toEqual({
      channel: 'whatsapp',
      sender: { type: 'whatsapp_phone_number', id: 'pn_1' },
      recipient: {
        type: 'phone_e164',
        country_calling_code: '55',
        national_number: '11903244174',
      },
      message: { type: 'text', text: { body: 'Olá' } },
    });
  });
  it('builds WhatsApp 1:1 message payloads', () => {
    const text = WhatsAppMessage.text({
      from: 'phone_number_id',
      to: '+5511999999999',
      body: 'hello',
      previewUrl: false,
      metadata: { order_id: 'ord_123' },
    }) satisfies CreateMessageRequest;
    const media = WhatsAppMessage.media({
      from: 'phone_number_id',
      to: '+5511999999999',
      media: { kind: 'image', link: 'https://example.com/image.png' },
    }) satisfies CreateMessageRequest;
    const ttsAudio = WhatsAppMessage.audioFromText({
      from: 'phone_number_id',
      to: '+5511999999999',
      tts: {
        type: 'tts',
        provider: 'openai',
        text: 'Order shipped.',
        voice: 'marin',
        language: 'en-US',
      },
      metadata: { order_id: 'ord_123' },
    }) satisfies CreateMessageRequest;
    const template = WhatsAppMessage.template({
      from: 'phone_number_id',
      to: '+5511999999999',
      name: 'order_shipped',
      language: 'pt_BR',
      variables: { customer_name: 'Ana' },
    }) satisfies CreateMessageRequest;
    const interactive = WhatsAppMessage.interactive({
      from: 'phone_number_id',
      to: '+5511999999999',
      interactive: {
        type: 'button',
        body: { text: 'Choose one' },
        action: {
          buttons: [{ type: 'reply', reply: { id: 'yes', title: 'Yes' } }],
        },
      },
    }) satisfies CreateMessageRequest;
    const pixOrderDetails = WhatsAppMessage.interactive({
      from: 'phone_number_id',
      to: '+5511999999999',
      interactive: {
        type: 'order_details',
        header: { type: 'image', link: 'https://example.com/orders/ord_123.png' },
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
            total_amount: { value: 10900, offset: 100 },
            order: {
              status: 'pending',
              items: [
                {
                  retailer_id: 'cake_1',
                  name: 'Birthday cake',
                  amount: { value: 5000, offset: 100 },
                  quantity: 2,
                },
              ],
              subtotal: { value: 10000, offset: 100 },
              tax: { value: 500, offset: 100 },
              shipping: { value: 1000, offset: 100 },
              discount: {
                value: 600,
                offset: 100,
                discount_program_name: 'Tyxter Rewards',
              },
            },
          },
        },
      },
    }) satisfies CreateMessageRequest;
    const flow = WhatsAppMessage.flow({
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
    }) satisfies CreateMessageRequest;

    expect(text).toEqual({
      channel: 'whatsapp',
      sender: { type: 'whatsapp_phone_number', id: 'phone_number_id' },
      recipient: { type: 'phone_e164', id: '+5511999999999' },
      message: { type: 'text', text: { body: 'hello', preview_url: false } },
      metadata: { order_id: 'ord_123' },
    });
    expect(media).toMatchObject({
      channel: 'whatsapp',
      message: { type: 'media', media: { kind: 'image' } },
    });
    expect(ttsAudio).toEqual({
      channel: 'whatsapp',
      sender: { type: 'whatsapp_phone_number', id: 'phone_number_id' },
      recipient: { type: 'phone_e164', id: '+5511999999999' },
      message: {
        type: 'media',
        media: {
          kind: 'audio',
          source: {
            type: 'tts',
            provider: 'openai',
            text: 'Order shipped.',
            voice: 'marin',
            language: 'en-US',
          },
        },
      },
      metadata: { order_id: 'ord_123' },
    });
    expect(template).toMatchObject({
      channel: 'whatsapp',
      message: {
        type: 'template',
        template: { name: 'order_shipped', language: 'pt_BR' },
      },
    });
    expect(interactive.message.type).toBe('interactive');
    expect(pixOrderDetails).toMatchObject({
      message: {
        type: 'interactive',
        interactive: {
          type: 'order_details',
          action: { name: 'review_and_pay' },
        },
      },
    });
    expect(flow.message.type).toBe('flow');
  });

  it('preserves true and false voice-note intent for WhatsApp media', () => {
    const voiceNote = WhatsAppMessage.media({
      from: 'phone_number_id',
      to: '+5511999999999',
      media: { kind: 'audio', link: 'https://example.com/voice-note.ogg', voice: true },
    });
    const ordinaryAudio = WhatsAppMessage.media({
      from: 'phone_number_id',
      to: '+5511999999999',
      media: { kind: 'audio', link: 'https://example.com/audio.ogg', voice: false },
    });

    expect(voiceNote.message).toEqual({
      type: 'media',
      media: { kind: 'audio', link: 'https://example.com/voice-note.ogg', voice: true },
    });
    expect(ordinaryAudio.message).toEqual({
      type: 'media',
      media: { kind: 'audio', link: 'https://example.com/audio.ogg', voice: false },
    });
  });

  it('builds WhatsApp template payloads and messages', () => {
    expect(
      WhatsAppTemplate.payload({
        name: 'order_shipped',
        language: 'pt_BR',
        variables: { customer_name: 'Ana' },
      }),
    ).toEqual({
      name: 'order_shipped',
      language: 'pt_BR',
      variables: { customer_name: 'Ana' },
    });

    const message = WhatsAppTemplate.message({
      from: 'phone_number_id',
      to: '+5511999999999',
      name: 'order_shipped',
      language: 'pt_BR',
    }) satisfies CreateMessageRequest;

    expect(message).toMatchObject({
      channel: 'whatsapp',
      message: { type: 'template', template: { name: 'order_shipped' } },
    });
  });

  it('builds Instagram DM payloads', () => {
    const text = InstagramMessage.text({
      accountId: 'ig_business_account_id',
      userId: 'igsid_123',
      body: 'thanks for your DM',
      previewUrl: true,
    }) satisfies CreateMessageRequest;
    const media = InstagramMessage.media({
      accountId: 'ig_business_account_id',
      userId: 'igsid_123',
      media: { kind: 'image', link: 'https://example.com/image.png' },
    }) satisfies CreateMessageRequest;

    expect(text).toEqual({
      channel: 'instagram',
      sender: { type: 'instagram_account', id: 'ig_business_account_id' },
      recipient: { type: 'instagram_user', id: 'igsid_123' },
      message: { type: 'text', text: { body: 'thanks for your DM', preview_url: true } },
    });
    expect(media).toMatchObject({
      channel: 'instagram',
      sender: { type: 'instagram_account', id: 'ig_business_account_id' },
      recipient: { type: 'instagram_user', id: 'igsid_123' },
      message: { type: 'media' },
    });
  });

  it('builds WhatsApp Channel update payloads with the followers recipient', () => {
    const text = WhatsAppChannelMessage.text({
      channelId: 'wa_channel_id',
      body: 'new update',
    }) satisfies CreateMessageRequest;
    const media = WhatsAppChannelMessage.media({
      channelId: 'wa_channel_id',
      media: { kind: 'video', link: 'https://example.com/video.mp4' },
      metadata: { campaign: 'launch' },
    }) satisfies CreateMessageRequest;

    expect(text).toEqual({
      channel: 'whatsapp_channel',
      sender: { type: 'whatsapp_channel', id: 'wa_channel_id' },
      recipient: { type: 'whatsapp_channel_audience', id: 'followers' },
      message: { type: 'text', text: { body: 'new update' } },
    });
    expect(media).toEqual({
      channel: 'whatsapp_channel',
      sender: { type: 'whatsapp_channel', id: 'wa_channel_id' },
      recipient: { type: 'whatsapp_channel_audience', id: 'followers' },
      message: {
        type: 'media',
        media: { kind: 'video', link: 'https://example.com/video.mp4' },
      },
      metadata: { campaign: 'launch' },
    });
  });
});
