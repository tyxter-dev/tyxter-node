import type {
  ListUsageRecordsQuery,
  ListUsageRecordsResponse,
  UsageQuery,
  UsageSummaryResponse,
} from '../contracts.js';
import type { HttpClient } from '../client.js';
import { toQs } from './internal.js';

export class UsageResource {
  constructor(private readonly http: HttpClient) {}

  async retrieve(query: UsageQuery): Promise<UsageSummaryResponse> {
    const qs = toQs({
      period_start: query.period_start,
      period_end: query.period_end,
      environment: query.environment,
      group_by: query.group_by,
    });
    return this.http.request<UsageSummaryResponse>('GET', `/v1/usage${qs}`);
  }

  async listRecords(query: Partial<ListUsageRecordsQuery> = {}): Promise<ListUsageRecordsResponse> {
    return this.http.request<ListUsageRecordsResponse>('GET', `/v1/usage/records${toQs(query)}`);
  }
}
