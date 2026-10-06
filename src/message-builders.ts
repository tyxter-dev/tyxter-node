import type {
  CreateMessageRequest,
  FlowMessagePayload,
  InteractiveMessagePayload,
  InstagramMediaMessagePayload,
  JsonObject,
  MediaMessagePayload,
  TemplateMessagePayload,
  TextMessagePayload,
  TtsMediaSource,
} from './contracts.js';

export interface WhatsAppMessageBaseInput {
  from: string;
  to: string | StructuredPhoneInput;
  metadata?: JsonObject;
}

export interface StructuredPhoneInput {
  countryCallingCode: string;
  nationalNumber: string;
}

export interface WhatsAppTextMessageInput extends WhatsAppMessageBaseInput {
  body: string;
  previewUrl?: boolean;
}

export interface WhatsAppMediaMessageInput extends WhatsAppMessageBaseInput {
  media: MediaMessagePayload;
}

export interface WhatsAppTtsAudioMessageInput extends WhatsAppMessageBaseInput {
  tts: TtsMediaSource;
}

export interface WhatsAppTemplatePayloadInput {
  name: string;
  language: string;
  variables?: TemplateMessagePayload['variables'];
  components?: TemplateMessagePayload['components'];
}

export interface WhatsAppTemplateMessageInput
  extends WhatsAppMessageBaseInput, WhatsAppTemplatePayloadInput {}

export interface WhatsAppInteractiveMessageInput extends WhatsAppMessageBaseInput {
  interactive: InteractiveMessagePayload;
}

export interface WhatsAppFlowMessageInput extends WhatsAppMessageBaseInput {
  flow: FlowMessagePayload;
}

export interface InstagramTextMessageInput {
  accountId: string;
  userId: string;
  body: string;
  previewUrl?: boolean;
  metadata?: JsonObject;
}

export interface InstagramMediaMessageInput {
  accountId: string;
  userId: string;
  media: InstagramMediaMessagePayload;
  metadata?: JsonObject;
}

export interface WhatsAppChannelTextMessageInput {
  channelId: string;
  body: string;
  previewUrl?: boolean;
  metadata?: JsonObject;
}

export interface WhatsAppChannelMediaMessageInput {
  channelId: string;
  media: MediaMessagePayload;
  metadata?: JsonObject;
}

type WhatsAppTextRequest = Extract<
  CreateMessageRequest,
  { channel: 'whatsapp'; message: { type: 'text' } }
>;
type WhatsAppMediaRequest = Extract<
  CreateMessageRequest,
  { channel: 'whatsapp'; message: { type: 'media' } }
>;
type WhatsAppTemplateRequest = Extract<
  CreateMessageRequest,
  { channel: 'whatsapp'; message: { type: 'template' } }
>;
type WhatsAppInteractiveRequest = Extract<
  CreateMessageRequest,
  { channel: 'whatsapp'; message: { type: 'interactive' } }
>;
type WhatsAppFlowRequest = Extract<
  CreateMessageRequest,
  { channel: 'whatsapp'; message: { type: 'flow' } }
>;
type InstagramTextRequest = Extract<
  CreateMessageRequest,
  { channel: 'instagram'; message: { type: 'text' } }
>;
type InstagramMediaRequest = Extract<
  CreateMessageRequest,
  { channel: 'instagram'; message: { type: 'media' } }
>;
type WhatsAppChannelTextRequest = Extract<
  CreateMessageRequest,
  { channel: 'whatsapp_channel'; message: { type: 'text' } }
>;
type WhatsAppChannelMediaRequest = Extract<
  CreateMessageRequest,
  { channel: 'whatsapp_channel'; message: { type: 'media' } }
>;

function textPayload(input: { body: string; previewUrl?: boolean }): TextMessagePayload {
  const text: TextMessagePayload = { body: input.body };
  if (input.previewUrl !== undefined) text.preview_url = input.previewUrl;
  return text;
}

function templatePayload(input: WhatsAppTemplatePayloadInput): TemplateMessagePayload {
  const template: TemplateMessagePayload = {
    name: input.name,
    language: input.language,
  };
  if (input.variables !== undefined) template.variables = input.variables;
  if (input.components !== undefined) template.components = input.components;
  return template;
}

function whatsAppRecipient(to: WhatsAppMessageBaseInput['to']) {
  return typeof to === 'string'
    ? ({ type: 'phone_e164', id: to } as const)
    : ({
        type: 'phone_e164',
        country_calling_code: to.countryCallingCode,
        national_number: to.nationalNumber,
      } as const);
}

function addMetadata<T extends CreateMessageRequest>(
  request: T,
  metadata: JsonObject | undefined,
): T {
  if (metadata !== undefined) request.metadata = metadata;
  return request;
}

export const WhatsAppMessage = {
  text(input: WhatsAppTextMessageInput): WhatsAppTextRequest {
    return addMetadata(
      {
        channel: 'whatsapp',
        sender: { type: 'whatsapp_phone_number', id: input.from },
        recipient: whatsAppRecipient(input.to),
        message: { type: 'text', text: textPayload(input) },
      },
      input.metadata,
    );
  },

  media(input: WhatsAppMediaMessageInput): WhatsAppMediaRequest {
    return addMetadata(
      {
        channel: 'whatsapp',
        sender: { type: 'whatsapp_phone_number', id: input.from },
        recipient: whatsAppRecipient(input.to),
        message: { type: 'media', media: input.media },
      },
      input.metadata,
    );
  },

  audioFromText(input: WhatsAppTtsAudioMessageInput): WhatsAppMediaRequest {
    return addMetadata(
      {
        channel: 'whatsapp',
        sender: { type: 'whatsapp_phone_number', id: input.from },
        recipient: whatsAppRecipient(input.to),
        message: { type: 'media', media: { kind: 'audio', source: input.tts } },
      },
      input.metadata,
    );
  },

  template(input: WhatsAppTemplateMessageInput): WhatsAppTemplateRequest {
    return addMetadata(
      {
        channel: 'whatsapp',
        sender: { type: 'whatsapp_phone_number', id: input.from },
        recipient: whatsAppRecipient(input.to),
        message: { type: 'template', template: templatePayload(input) },
      },
      input.metadata,
    );
  },

  interactive(input: WhatsAppInteractiveMessageInput): WhatsAppInteractiveRequest {
    return addMetadata(
      {
        channel: 'whatsapp',
        sender: { type: 'whatsapp_phone_number', id: input.from },
        recipient: whatsAppRecipient(input.to),
        message: { type: 'interactive', interactive: input.interactive },
      },
      input.metadata,
    );
  },

  flow(input: WhatsAppFlowMessageInput): WhatsAppFlowRequest {
    return addMetadata(
      {
        channel: 'whatsapp',
        sender: { type: 'whatsapp_phone_number', id: input.from },
        recipient: whatsAppRecipient(input.to),
        message: { type: 'flow', flow: input.flow },
      },
      input.metadata,
    );
  },
} as const;

export const WhatsAppTemplate = {
  payload(input: WhatsAppTemplatePayloadInput): TemplateMessagePayload {
    return templatePayload(input);
  },

  message(input: WhatsAppTemplateMessageInput): WhatsAppTemplateRequest {
    return WhatsAppMessage.template(input);
  },
} as const;

export const InstagramMessage = {
  text(input: InstagramTextMessageInput): InstagramTextRequest {
    return addMetadata(
      {
        channel: 'instagram',
        sender: { type: 'instagram_account', id: input.accountId },
        recipient: { type: 'instagram_user', id: input.userId },
        message: { type: 'text', text: textPayload(input) },
      },
      input.metadata,
    );
  },

  media(input: InstagramMediaMessageInput): InstagramMediaRequest {
    return addMetadata(
      {
        channel: 'instagram',
        sender: { type: 'instagram_account', id: input.accountId },
        recipient: { type: 'instagram_user', id: input.userId },
        message: { type: 'media', media: input.media },
      },
      input.metadata,
    );
  },
} as const;

/** @deprecated These legacy payloads are rejected by the API with invalid_message_request. */
export const WhatsAppChannelMessage = {
  text(input: WhatsAppChannelTextMessageInput): WhatsAppChannelTextRequest {
    return addMetadata(
      {
        channel: 'whatsapp_channel',
        sender: { type: 'whatsapp_channel', id: input.channelId },
        recipient: { type: 'whatsapp_channel_audience', id: 'followers' },
        message: { type: 'text', text: textPayload(input) },
      },
      input.metadata,
    );
  },

  media(input: WhatsAppChannelMediaMessageInput): WhatsAppChannelMediaRequest {
    return addMetadata(
      {
        channel: 'whatsapp_channel',
        sender: { type: 'whatsapp_channel', id: input.channelId },
        recipient: { type: 'whatsapp_channel_audience', id: 'followers' },
        message: { type: 'media', media: input.media },
      },
      input.metadata,
    );
  },
} as const;
