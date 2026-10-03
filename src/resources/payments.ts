import type { HttpClient } from '../client.js';
import type {
  CreatePaymentRequest,
  ListPaymentsQuery,
  ListPaymentsResponse,
  PaymentResponse,
  RequestPaymentApprovalRequest,
} from '../contracts.js';
import { toQs } from './internal.js';

export type PaymentWriteOptions = { idempotencyKey?: string; traceId?: string };

export class PaymentsResource {
  constructor(private readonly http: HttpClient) {}

  async create(
    input: CreatePaymentRequest,
    options: PaymentWriteOptions = {},
  ): Promise<PaymentResponse> {
    return this.http.request<PaymentResponse>(
      'POST',
      '/v1/payments',
      input,
      paymentHeaders(options),
    );
  }

  async list(query: Partial<ListPaymentsQuery> = {}): Promise<ListPaymentsResponse> {
    return this.http.request<ListPaymentsResponse>('GET', `/v1/payments${toQs(query)}`);
  }

  async retrieve(paymentId: string): Promise<PaymentResponse> {
    return this.http.request<PaymentResponse>('GET', `/v1/payments/${paymentId}`);
  }

  async requestApproval(
    paymentId: string,
    input: RequestPaymentApprovalRequest = {},
    options: PaymentWriteOptions = {},
  ): Promise<PaymentResponse> {
    return this.http.request<PaymentResponse>(
      'POST',
      `/v1/payments/${paymentId}/request-approval`,
      input,
      paymentHeaders(options),
    );
  }
}

function paymentHeaders(options: PaymentWriteOptions): Record<string, string> {
  const headers: Record<string, string> = {};
  if (options.idempotencyKey) headers['idempotency-key'] = options.idempotencyKey;
  if (options.traceId) headers['tyxter-trace-id'] = options.traceId;
  return headers;
}
