import type {
  GroupResponse,
  InboundSandboxMessageRequest,
  MessageResponse,
  PaymentResponse,
  SandboxLLMFailureRequest,
  SandboxLLMFailureResponse,
  SandboxPaymentStatusRequest,
  SandboxQuickstartResponse,
  SandboxTemplateStatusRequest,
  TemplateResponse,
} from '../contracts.js';
import type { HttpClient } from '../client.js';

export class SandboxInboundMessagesResource {
  constructor(private readonly http: HttpClient) {}

  async create(
    input: InboundSandboxMessageRequest,
    options: { idempotencyKey?: string; traceId?: string } = {},
  ): Promise<MessageResponse> {
    const headers: Record<string, string> = {};
    if (options.idempotencyKey) headers['idempotency-key'] = options.idempotencyKey;
    if (options.traceId) headers['tyxter-trace-id'] = options.traceId;
    return this.http.request<MessageResponse>(
      'POST',
      '/v1/sandbox/inbound-messages',
      input,
      headers,
    );
  }
}

export class SandboxTemplatesResource {
  constructor(private readonly http: HttpClient) {}

  async setStatus(
    templateId: string,
    input: SandboxTemplateStatusRequest,
    options: { traceId?: string } = {},
  ): Promise<TemplateResponse> {
    const headers: Record<string, string> = {};
    if (options.traceId) headers['tyxter-trace-id'] = options.traceId;
    return this.http.request<TemplateResponse>(
      'POST',
      `/v1/sandbox/templates/${encodeURIComponent(templateId)}/status`,
      input,
      headers,
    );
  }
}

export class SandboxPaymentsResource {
  constructor(private readonly http: HttpClient) {}

  async setStatus(
    paymentId: string,
    input: SandboxPaymentStatusRequest,
    options: { idempotencyKey?: string; traceId?: string } = {},
  ): Promise<PaymentResponse> {
    const headers: Record<string, string> = {};
    if (options.idempotencyKey) headers['idempotency-key'] = options.idempotencyKey;
    if (options.traceId) headers['tyxter-trace-id'] = options.traceId;
    return this.http.request<PaymentResponse>(
      'POST',
      `/v1/sandbox/payments/${encodeURIComponent(paymentId)}/status`,
      input,
      headers,
    );
  }
}

/**
 * WhatsApp Business groups in sandbox (beta). Not exported on its own: reach it
 * as `client.sandbox.groups`.
 */
class SandboxGroupsResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * `POST /v1/sandbox/groups/:group_id/participants` (scope `groups:write`,
   * sandbox keys only; a production key gets
   * `400 sandbox_group_participant_sandbox_only`). Simulates Meta reporting
   * that the participant with WhatsApp ID `wa_id` joined (`join`) or left
   * (`remove`) an `active` WhatsApp Business group, and returns the group with
   * its `participants`. A join of a current member or a removal of a
   * non-member changes nothing, so a retry never records the fact twice, with
   * or without `idempotencyKey`. A ninth joined participant is
   * `409 group_participant_limit_reached` (Meta documents a cap of eight); any
   * status other than `active` is `409 group_not_active`. The id is
   * percent-encoded like `groups.retrieve`.
   */
  async simulateParticipant(
    groupId: string,
    input: { wa_id: string; action: 'join' | 'remove' },
    options: { idempotencyKey?: string } = {},
  ): Promise<GroupResponse> {
    const headers: Record<string, string> = {};
    if (options.idempotencyKey) headers['idempotency-key'] = options.idempotencyKey;
    return this.http.request<GroupResponse>(
      'POST',
      `/v1/sandbox/groups/${encodeURIComponent(groupId)}/participants`,
      input,
      headers,
    );
  }
}

export class SandboxLLMResource {
  constructor(private readonly http: HttpClient) {}

  async setFailure(
    input: SandboxLLMFailureRequest,
    options: { idempotencyKey?: string; traceId?: string } = {},
  ): Promise<SandboxLLMFailureResponse> {
    const headers: Record<string, string> = {};
    if (options.idempotencyKey) headers['idempotency-key'] = options.idempotencyKey;
    if (options.traceId) headers['tyxter-trace-id'] = options.traceId;
    return this.http.request<SandboxLLMFailureResponse>(
      'POST',
      '/v1/sandbox/llm/failure',
      input,
      headers,
    );
  }
}

export class SandboxResource {
  readonly inboundMessages: SandboxInboundMessagesResource;
  readonly templates: SandboxTemplatesResource;
  readonly payments: SandboxPaymentsResource;
  readonly llm: SandboxLLMResource;
  readonly groups: SandboxGroupsResource;

  constructor(private readonly http: HttpClient) {
    this.inboundMessages = new SandboxInboundMessagesResource(http);
    this.templates = new SandboxTemplatesResource(http);
    this.payments = new SandboxPaymentsResource(http);
    this.llm = new SandboxLLMResource(http);
    this.groups = new SandboxGroupsResource(http);
  }

  async quickstart(): Promise<SandboxQuickstartResponse> {
    return this.http.request<SandboxQuickstartResponse>('GET', '/v1/sandbox/quickstart');
  }
}
