import type {
  CreateFeedbackRequest,
  FeedbackReceiptResponse,
  ListPublicFeedbackReportsQuery,
  ListPublicFeedbackReportsResponse,
  PublicFeedbackReportResponse,
} from '../contracts.js';
import type { HttpClient } from '../client.js';
import { toQs } from './internal.js';

export type CreateFeedbackOptions = { idempotencyKey?: string; traceId?: string };

/**
 * `POST /v1/feedback` requires an `Idempotency-Key`. To keep the call ergonomic
 * we generate one per logical call when the caller omits it, and reuse it for
 * internal retries. Pass an explicit `idempotencyKey` to control it.
 */
function generateIdempotencyKey(): string {
  const cryptoObj = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (cryptoObj?.randomUUID) return cryptoObj.randomUUID();
  return `idem_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
}

export class FeedbackResource {
  constructor(private readonly http: HttpClient) {}

  /** List only API-origin feedback reports for the key's tenant tuple. */
  async list(
    query: ListPublicFeedbackReportsQuery = {},
  ): Promise<ListPublicFeedbackReportsResponse> {
    const qs = toQs({ after: query.after, limit: query.limit });
    return this.http.request<ListPublicFeedbackReportsResponse>('GET', `/v1/feedback${qs}`);
  }

  /** Read one API-origin feedback report in the key's tenant tuple. */
  async get(id: string): Promise<PublicFeedbackReportResponse> {
    return this.http.request<PublicFeedbackReportResponse>('GET', `/v1/feedback/${id}`);
  }

  /**
   * Report an unexpected failure. The SDK does NOT automatically attach request
   * headers, environment variables, the original request body, or local config
   * — only the `message`, optional `related_error`, and optional `context` you
   * pass are sent.
   */
  async create(
    input: CreateFeedbackRequest,
    options: CreateFeedbackOptions = {},
  ): Promise<FeedbackReceiptResponse> {
    const headers: Record<string, string> = {
      'idempotency-key': options.idempotencyKey ?? generateIdempotencyKey(),
    };
    if (options.traceId) headers['tyxter-trace-id'] = options.traceId;
    return this.http.request<FeedbackReceiptResponse>('POST', '/v1/feedback', input, headers);
  }
}
