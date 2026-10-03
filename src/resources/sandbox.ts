import type {
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

  constructor(private readonly http: HttpClient) {
    this.inboundMessages = new SandboxInboundMessagesResource(http);
    this.templates = new SandboxTemplatesResource(http);
    this.payments = new SandboxPaymentsResource(http);
    this.llm = new SandboxLLMResource(http);
  }

  async quickstart(): Promise<SandboxQuickstartResponse> {
    return this.http.request<SandboxQuickstartResponse>('GET', '/v1/sandbox/quickstart');
  }
}
