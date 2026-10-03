import type {
  DataRetentionPolicyResponse,
  UpdateDataRetentionPolicyRequest,
} from '../contracts.js';
import type { HttpClient } from '../client.js';

/**
 * Data-retention policy (`GET/PATCH /v1/data-retention`). The environment is
 * taken from the API key, so a sandbox key reads/writes the sandbox policy and a
 * production key the production one. `update()` accepts an optional
 * `Idempotency-Key`; a retried call with the same key and body replays the
 * stored response.
 */
export class DataRetentionResource {
  constructor(private readonly http: HttpClient) {}

  /** Read the current retention policy for the key's environment. */
  async get(): Promise<DataRetentionPolicyResponse> {
    return this.http.request<DataRetentionPolicyResponse>('GET', '/v1/data-retention');
  }

  /** Update the retention window and/or export switch (at least one field). */
  async update(
    input: UpdateDataRetentionPolicyRequest,
    options: { idempotencyKey?: string } = {},
  ): Promise<DataRetentionPolicyResponse> {
    const headers: Record<string, string> = {};
    if (options.idempotencyKey) headers['idempotency-key'] = options.idempotencyKey;
    return this.http.request<DataRetentionPolicyResponse>(
      'PATCH',
      '/v1/data-retention',
      input,
      headers,
    );
  }
}
