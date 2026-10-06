import type {
  TyxterErrorBody,
  TyxterErrorType,
  WebhookListenSessionConflictDetails,
} from './contracts.js';

export class TyxterApiError extends Error {
  readonly status: number;
  readonly type: TyxterErrorType;
  readonly code: string;
  readonly param?: string;
  readonly retryAfterMs?: number;
  readonly retryable?: false;
  readonly requestId?: string;
  readonly traceId?: string;
  readonly details?: WebhookListenSessionConflictDetails;
  readonly body: TyxterErrorBody;

  constructor(status: number, body: TyxterErrorBody) {
    super(body.message);
    this.name = 'TyxterApiError';
    this.status = status;
    this.type = body.type;
    this.code = body.code;
    this.param = body.param;
    this.retryAfterMs = body.retry_after_ms;
    this.retryable = body.retryable;
    this.requestId = body.request_id;
    this.traceId = body.trace_id;
    this.details = body.details;
    this.body = body;
  }
}

export function parseApiError(status: number, parsed: unknown): TyxterApiError | Error {
  if (
    typeof parsed === 'object' &&
    parsed !== null &&
    'error' in parsed &&
    typeof (parsed as { error: unknown }).error === 'object' &&
    (parsed as { error: { type?: unknown } }).error?.type
  ) {
    return new TyxterApiError(status, (parsed as { error: TyxterErrorBody }).error);
  }
  return new Error(`tyxter API error ${status}: ${JSON.stringify(parsed)}`);
}
