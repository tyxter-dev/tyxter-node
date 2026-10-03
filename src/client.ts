import type { CreateMessageRequest, MessageResponse } from './contracts.js';
import { parseApiError } from './api-error.js';
import { AccountResource } from './resources/account.js';
import { AgentApiKeyDeviceAuthorizationsResource } from './resources/agent-api-key-device-authorizations.js';
import { AgenticPaymentsResource } from './resources/agentic-payments.js';
import { ApiKeysResource } from './resources/api-keys.js';
import { AIAgentsResource } from './resources/ai-agents.js';
import { AudiencesResource } from './resources/audiences.js';
import { AutomationsResource } from './resources/automations.js';
import { BatchesResource } from './resources/batches.js';
import { BillingResource } from './resources/billing.js';
import {
  InstagramMessagesResource,
  WhatsAppChannelsResource,
  WhatsAppMessagesResource,
} from './resources/channel-messages.js';
import { ContactsResource } from './resources/contacts.js';
import { DataRetentionResource } from './resources/data-retention.js';
import { FeedbackResource } from './resources/feedback.js';
import { FiscalResource } from './resources/fiscal.js';
import { FlowsResource } from './resources/flows.js';
import { LLMResource } from './resources/llm.js';
import { MediaResource } from './resources/media.js';
import { MetaSignupSessionsResource } from './resources/meta-signup-sessions.js';
import { MessagesResource } from './resources/messages.js';
import { PaymentsResource } from './resources/payments.js';
import { PhoneNumbersResource } from './resources/phone-numbers.js';
import { ProjectsResource } from './resources/projects.js';
import { ProviderCredentialSetupSessionsResource } from './resources/provider-credential-setup-sessions.js';
import { ProviderConnectionsResource } from './resources/provider-connections.js';
import { SandboxResource } from './resources/sandbox.js';
import { TemplatesResource } from './resources/templates.js';
import { UsageResource } from './resources/usage.js';
import { WebhookEndpointsResource } from './resources/webhook-endpoints.js';
import { WebhookEventsResource } from './resources/webhook-events.js';

export interface TyxterClientOptions {
  apiKey: string;
  baseUrl?: string;
  fetch?: typeof fetch;
  defaultTimeoutMs?: number;
}

export interface TyxterBootstrapOptions {
  baseUrl?: string;
  fetch?: typeof fetch;
  defaultTimeoutMs?: number;
}
export type FetchBody = NonNullable<Parameters<typeof fetch>[1]>['body'];

export class Tyxter {
  readonly account: AccountResource;
  readonly agenticPayments: AgenticPaymentsResource;
  readonly messages: MessagesResource;
  readonly apiKeys: ApiKeysResource;
  readonly aiAgents: AIAgentsResource;
  readonly audiences: AudiencesResource;
  readonly automations: AutomationsResource;
  readonly batches: BatchesResource;
  readonly billing: BillingResource;
  readonly contacts: ContactsResource;
  readonly dataRetention: DataRetentionResource;
  readonly feedback: FeedbackResource;
  readonly fiscal: FiscalResource;
  readonly flows: FlowsResource;
  readonly llm: LLMResource;
  readonly media: MediaResource;
  readonly metaSignupSessions: MetaSignupSessionsResource;
  readonly payments: PaymentsResource;
  readonly phoneNumbers: PhoneNumbersResource;
  readonly projects: ProjectsResource;
  readonly providerCredentialSetupSessions: ProviderCredentialSetupSessionsResource;
  readonly providerConnections: ProviderConnectionsResource;
  readonly templates: TemplatesResource;
  readonly webhookEndpoints: WebhookEndpointsResource;
  readonly webhookEvents: WebhookEventsResource;
  readonly sandbox: SandboxResource;
  readonly usage: UsageResource;
  readonly whatsapp: WhatsAppMessagesResource;
  readonly instagram: InstagramMessagesResource;
  readonly whatsappChannels: WhatsAppChannelsResource;

  constructor(private readonly options: TyxterClientOptions) {
    const baseUrl = options.baseUrl ?? 'https://api.tyxter.com';
    const http = new HttpClient({
      apiKey: options.apiKey,
      baseUrl,
      fetchImpl: options.fetch ?? fetch,
      defaultTimeoutMs: options.defaultTimeoutMs ?? 30_000,
    });
    this.account = new AccountResource(http);
    this.agenticPayments = new AgenticPaymentsResource(http);
    this.messages = new MessagesResource(http);
    this.whatsapp = new WhatsAppMessagesResource(this.messages);
    this.instagram = new InstagramMessagesResource(this.messages);
    this.whatsappChannels = new WhatsAppChannelsResource(this.messages);
    this.apiKeys = new ApiKeysResource(http);
    this.aiAgents = new AIAgentsResource(http);
    this.audiences = new AudiencesResource(http);
    this.automations = new AutomationsResource(http);
    this.batches = new BatchesResource(http);
    this.billing = new BillingResource(http);
    this.contacts = new ContactsResource(http);
    this.dataRetention = new DataRetentionResource(http);
    this.feedback = new FeedbackResource(http);
    this.fiscal = new FiscalResource(http);
    this.flows = new FlowsResource(http);
    this.llm = new LLMResource(http);
    this.media = new MediaResource(http);
    this.metaSignupSessions = new MetaSignupSessionsResource(http);
    this.payments = new PaymentsResource(http);
    this.phoneNumbers = new PhoneNumbersResource(http);
    this.projects = new ProjectsResource(http);
    this.providerCredentialSetupSessions = new ProviderCredentialSetupSessionsResource(http);
    this.providerConnections = new ProviderConnectionsResource(http);
    this.templates = new TemplatesResource(http);
    this.webhookEndpoints = new WebhookEndpointsResource(http);
    this.webhookEvents = new WebhookEventsResource(http);
    this.sandbox = new SandboxResource(http);
    this.usage = new UsageResource(http);
  }
}

export class TyxterBootstrap {
  readonly agentApiKeyDeviceAuthorizations: AgentApiKeyDeviceAuthorizationsResource;

  constructor(private readonly options: TyxterBootstrapOptions = {}) {
    const baseUrl = options.baseUrl ?? 'https://api.tyxter.com';
    const http = new PublicHttpClient({
      baseUrl,
      fetchImpl: options.fetch ?? fetch,
      defaultTimeoutMs: options.defaultTimeoutMs ?? 30_000,
    });
    this.agentApiKeyDeviceAuthorizations = new AgentApiKeyDeviceAuthorizationsResource(http);
  }
}

export class HttpClient {
  constructor(
    private readonly cfg: {
      apiKey: string;
      baseUrl: string;
      fetchImpl: typeof fetch;
      defaultTimeoutMs: number;
    },
  ) {}

  async request<TResponse>(
    method: 'GET' | 'POST' | 'DELETE' | 'PATCH' | 'PUT',
    path: string,
    body?: unknown,
    headers: Record<string, string> = {},
  ): Promise<TResponse> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.cfg.defaultTimeoutMs);
    try {
      const res = await this.cfg.fetchImpl(`${this.cfg.baseUrl}${path}`, {
        method,
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${this.cfg.apiKey}`,
          ...headers,
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
      const text = await res.text();
      const parsed = text ? JSON.parse(text) : {};
      if (!res.ok) {
        throw parseApiError(res.status, parsed);
      }
      return parsed as TResponse;
    } finally {
      clearTimeout(timeout);
    }
  }

  async requestAbsolute(
    method: 'PUT',
    url: string,
    body: FetchBody,
    headers: Record<string, string> = {},
  ): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.cfg.defaultTimeoutMs);
    try {
      return await this.cfg.fetchImpl(url, {
        method,
        headers,
        body,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }
  }
}

export class PublicHttpClient {
  constructor(
    private readonly cfg: {
      baseUrl: string;
      fetchImpl: typeof fetch;
      defaultTimeoutMs: number;
    },
  ) {}

  async request<TResponse>(
    method: 'GET' | 'POST' | 'DELETE' | 'PATCH' | 'PUT',
    path: string,
    body?: unknown,
    headers: Record<string, string> = {},
  ): Promise<TResponse> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.cfg.defaultTimeoutMs);
    try {
      const res = await this.cfg.fetchImpl(`${this.cfg.baseUrl}${path}`, {
        method,
        headers: {
          'content-type': 'application/json',
          ...headers,
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
      const text = await res.text();
      const parsed = text ? JSON.parse(text) : {};
      if (!res.ok) {
        throw parseApiError(res.status, parsed);
      }
      return parsed as TResponse;
    } finally {
      clearTimeout(timeout);
    }
  }
}

export type { CreateMessageRequest, MessageResponse };
