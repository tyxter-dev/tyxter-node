import type {
  FiscalDocumentDownloadResponse,
  FiscalDocumentResponse,
  ListFiscalDocumentsQuery,
  ListFiscalDocumentsResponse,
} from '../contracts.js';

import type { HttpClient } from '../client.js';
import { toQs } from './internal.js';

/**
 * Fiscal / NFS-e read resource. Org-scoped, environment-agnostic
 * legal service-tax documents — all routes require the `fiscal:read` scope and
 * stay reachable even when production credit is exhausted (a tax document is
 * never balance-gated). Reads never expose the certificate, signed DPS, stored
 * event bodies, or config snapshots.
 */
export class FiscalResource {
  constructor(private readonly http: HttpClient) {}

  async list(query: ListFiscalDocumentsQuery = {}): Promise<ListFiscalDocumentsResponse> {
    const qs = toQs({
      limit: query.limit,
      starting_after: query.starting_after,
      status: query.status,
      source_kind: query.source_kind,
    });
    return this.http.request<ListFiscalDocumentsResponse>('GET', `/v1/fiscal/nfse${qs}`);
  }

  async retrieve(fiscalDocumentId: string): Promise<FiscalDocumentResponse> {
    return this.http.request<FiscalDocumentResponse>('GET', `/v1/fiscal/nfse/${fiscalDocumentId}`);
  }

  /** Short-lived (15 minute) presigned DANFSE PDF download URL. */
  async downloadDanfse(fiscalDocumentId: string): Promise<FiscalDocumentDownloadResponse> {
    return this.http.request<FiscalDocumentDownloadResponse>(
      'GET',
      `/v1/fiscal/nfse/${fiscalDocumentId}/danfse`,
    );
  }

  /** Short-lived (15 minute) presigned authorized NFS-e XML download URL. */
  async downloadXml(fiscalDocumentId: string): Promise<FiscalDocumentDownloadResponse> {
    return this.http.request<FiscalDocumentDownloadResponse>(
      'GET',
      `/v1/fiscal/nfse/${fiscalDocumentId}/xml`,
    );
  }
}
