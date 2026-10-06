import type { MessageResponse } from '../contracts.js';
import {
  InstagramMessage,
  type InstagramMediaMessageInput,
  type InstagramTextMessageInput,
  WhatsAppChannelMessage,
  type WhatsAppChannelMediaMessageInput,
  type WhatsAppChannelTextMessageInput,
  WhatsAppMessage,
  type WhatsAppFlowMessageInput,
  type WhatsAppInteractiveMessageInput,
  type WhatsAppMediaMessageInput,
  type WhatsAppTemplateMessageInput,
  type WhatsAppTextMessageInput,
  type WhatsAppTtsAudioMessageInput,
} from '../message-builders.js';
import type { CreateMessageOptions, MessagesResource } from './messages.js';

export class WhatsAppMessagesResource {
  constructor(private readonly messages: MessagesResource) {}

  async sendText(
    input: WhatsAppTextMessageInput,
    options: CreateMessageOptions = {},
  ): Promise<MessageResponse> {
    return this.messages.create(WhatsAppMessage.text(input), options);
  }

  async sendMedia(
    input: WhatsAppMediaMessageInput,
    options: CreateMessageOptions = {},
  ): Promise<MessageResponse> {
    return this.messages.create(WhatsAppMessage.media(input), options);
  }

  async sendAudioFromText(
    input: WhatsAppTtsAudioMessageInput,
    options: CreateMessageOptions = {},
  ): Promise<MessageResponse> {
    return this.messages.create(WhatsAppMessage.audioFromText(input), options);
  }

  async sendTemplate(
    input: WhatsAppTemplateMessageInput,
    options: CreateMessageOptions = {},
  ): Promise<MessageResponse> {
    return this.messages.create(WhatsAppMessage.template(input), options);
  }

  async sendInteractive(
    input: WhatsAppInteractiveMessageInput,
    options: CreateMessageOptions = {},
  ): Promise<MessageResponse> {
    return this.messages.create(WhatsAppMessage.interactive(input), options);
  }

  async sendFlow(
    input: WhatsAppFlowMessageInput,
    options: CreateMessageOptions = {},
  ): Promise<MessageResponse> {
    return this.messages.create(WhatsAppMessage.flow(input), options);
  }
}

export class InstagramMessagesResource {
  constructor(private readonly messages: MessagesResource) {}

  async sendText(
    input: InstagramTextMessageInput,
    options: CreateMessageOptions = {},
  ): Promise<MessageResponse> {
    return this.messages.create(InstagramMessage.text(input), options);
  }

  async sendMedia(
    input: InstagramMediaMessageInput,
    options: CreateMessageOptions = {},
  ): Promise<MessageResponse> {
    return this.messages.create(InstagramMessage.media(input), options);
  }
}

/** @deprecated WhatsApp Channel publishing is unsupported and returns invalid_message_request. */
export class WhatsAppChannelsResource {
  constructor(private readonly messages: MessagesResource) {}

  /** @deprecated Unsupported by the public API; returns invalid_message_request. */
  async publishText(
    input: WhatsAppChannelTextMessageInput,
    options: CreateMessageOptions = {},
  ): Promise<MessageResponse> {
    return this.messages.create(WhatsAppChannelMessage.text(input), options);
  }

  /** @deprecated Unsupported by the public API; returns invalid_message_request. */
  async publishMedia(
    input: WhatsAppChannelMediaMessageInput,
    options: CreateMessageOptions = {},
  ): Promise<MessageResponse> {
    return this.messages.create(WhatsAppChannelMessage.media(input), options);
  }
}
