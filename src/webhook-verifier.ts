import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Tyxter webhook signature helper.
 *
 * Signature payload: `{timestamp}.{raw_body}`
 * Algorithm:         HMAC-SHA256, hex-encoded
 */
export interface VerifyWebhookInput {
  readonly secret: string;
  readonly timestamp: string;
  readonly rawBody: string;
  readonly signature: string;
  /** Reject requests whose timestamp is older than this many seconds (default 5 min). */
  readonly toleranceSeconds?: number;
}

export function verifyWebhookSignature(input: VerifyWebhookInput): boolean {
  const tolerance = input.toleranceSeconds ?? 300;
  const ts = Number(input.timestamp);
  if (!Number.isFinite(ts)) return false;

  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - ts) > tolerance) return false;

  const expected = createHmac('sha256', input.secret)
    .update(`${input.timestamp}.${input.rawBody}`)
    .digest('hex');

  if (expected.length !== input.signature.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(input.signature));
}
