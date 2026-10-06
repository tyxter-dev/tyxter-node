import type {
  BulkImportContactsRequest,
  BulkImportContactsResponse,
  ContactDataExportResponse,
  ContactErasureResponse,
  ContactResponse,
  ListContactsResponse,
  ListContactsQuery,
  OptInRequest,
  OptOutRequest,
} from '../contracts.js';
import type { HttpClient } from '../client.js';
import { toQs } from './internal.js';

export class ContactsResource {
  constructor(private readonly http: HttpClient) {}

  async optIn(
    input: OptInRequest,
    options: { idempotencyKey?: string; traceId?: string } = {},
  ): Promise<ContactResponse> {
    const headers: Record<string, string> = {};
    if (options.idempotencyKey) headers['idempotency-key'] = options.idempotencyKey;
    if (options.traceId) headers['tyxter-trace-id'] = options.traceId;
    return this.http.request<ContactResponse>('POST', '/v1/contacts/opt-in', input, headers);
  }

  async optOut(
    input: OptOutRequest,
    options: { idempotencyKey?: string; traceId?: string } = {},
  ): Promise<ContactResponse> {
    const headers: Record<string, string> = {};
    if (options.idempotencyKey) headers['idempotency-key'] = options.idempotencyKey;
    if (options.traceId) headers['tyxter-trace-id'] = options.traceId;
    return this.http.request<ContactResponse>('POST', '/v1/contacts/opt-out', input, headers);
  }

  async list(query: ListContactsQuery = {}): Promise<ListContactsResponse> {
    const qs = toQs({ ...query });
    return this.http.request<ListContactsResponse>('GET', `/v1/contacts${qs}`);
  }

  async bulkImport(
    input: BulkImportContactsRequest,
    options: { idempotencyKey?: string; traceId?: string } = {},
  ): Promise<BulkImportContactsResponse> {
    const headers: Record<string, string> = {};
    if (options.idempotencyKey) headers['idempotency-key'] = options.idempotencyKey;
    if (options.traceId) headers['tyxter-trace-id'] = options.traceId;
    return this.http.request<BulkImportContactsResponse>(
      'POST',
      '/v1/contacts/bulk-import',
      input,
      headers,
    );
  }

  /** LGPD right of access — contact row + message-metadata summary. */
  async export(
    contactId: string,
    options: { idempotencyKey?: string } = {},
  ): Promise<ContactDataExportResponse> {
    const headers: Record<string, string> = {};
    if (options.idempotencyKey) headers['idempotency-key'] = options.idempotencyKey;
    return this.http.request<ContactDataExportResponse>(
      'POST',
      `/v1/contacts/${contactId}/export`,
      undefined,
      headers,
    );
  }

  /** LGPD right of erasure — tombstones the contact and redacts its messages. */
  async erase(
    contactId: string,
    options: { idempotencyKey?: string } = {},
  ): Promise<ContactErasureResponse> {
    const headers: Record<string, string> = {};
    if (options.idempotencyKey) headers['idempotency-key'] = options.idempotencyKey;
    return this.http.request<ContactErasureResponse>(
      'DELETE',
      `/v1/contacts/${contactId}`,
      undefined,
      headers,
    );
  }
}
