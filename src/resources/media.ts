import type {
  CreateMediaUploadRequest,
  DeleteMediaAssetResponse,
  ListMediaAssetsQuery,
  ListMediaAssetsResponse,
  MediaAssetDownloadResponse,
  MediaAssetResponse,
  MediaStorageUsageResponse,
  MediaUploadResponse,
} from '../contracts.js';
import type { FetchBody, HttpClient } from '../client.js';
import { toQs } from './internal.js';

export type MediaWriteOptions = { idempotencyKey?: string; traceId?: string };

export interface UploadMediaInput extends CreateMediaUploadRequest {
  body: FetchBody;
}

export interface UploadMediaOptions {
  createIdempotencyKey?: string;
  completeIdempotencyKey?: string;
  traceId?: string;
}

export class MediaResource {
  constructor(private readonly http: HttpClient) {}

  async createUpload(
    input: CreateMediaUploadRequest,
    options: MediaWriteOptions = {},
  ): Promise<MediaUploadResponse> {
    const headers = mediaHeaders(options);
    return this.http.request<MediaUploadResponse>('POST', '/v1/media/uploads', input, headers);
  }

  async completeUpload(
    assetId: string,
    options: MediaWriteOptions = {},
  ): Promise<MediaAssetResponse> {
    const headers = mediaHeaders(options);
    return this.http.request<MediaAssetResponse>(
      'POST',
      `/v1/media/uploads/${assetId}/complete`,
      undefined,
      headers,
    );
  }

  async retrieve(assetId: string): Promise<MediaAssetResponse> {
    return this.http.request<MediaAssetResponse>('GET', `/v1/media/${assetId}`);
  }

  async createDownloadUrl(assetId: string): Promise<MediaAssetDownloadResponse> {
    return this.http.request<MediaAssetDownloadResponse>(
      'GET',
      `/v1/media/${assetId}/download-url`,
    );
  }

  async list(query: Partial<ListMediaAssetsQuery> = {}): Promise<ListMediaAssetsResponse> {
    return this.http.request<ListMediaAssetsResponse>('GET', `/v1/media${toQs(query)}`);
  }

  async delete(assetId: string): Promise<DeleteMediaAssetResponse> {
    return this.http.request<DeleteMediaAssetResponse>('DELETE', `/v1/media/${assetId}`);
  }

  async storageUsage(): Promise<MediaStorageUsageResponse> {
    return this.http.request<MediaStorageUsageResponse>('GET', '/v1/media/storage-usage');
  }

  async upload(
    input: UploadMediaInput,
    options: UploadMediaOptions = {},
  ): Promise<MediaAssetResponse> {
    const { body, ...request } = input;
    const session = await this.createUpload(request, {
      idempotencyKey: options.createIdempotencyKey,
      traceId: options.traceId,
    });
    const upload = await this.http.requestAbsolute(
      session.upload_method,
      session.upload_url,
      body,
      session.upload_headers,
    );
    if (!upload.ok) {
      throw new Error(`Media upload failed with HTTP ${upload.status}.`);
    }
    return this.completeUpload(session.id, {
      idempotencyKey: options.completeIdempotencyKey,
      traceId: options.traceId,
    });
  }
}

function mediaHeaders(options: MediaWriteOptions): Record<string, string> {
  const headers: Record<string, string> = {};
  if (options.idempotencyKey) headers['idempotency-key'] = options.idempotencyKey;
  if (options.traceId) headers['tyxter-trace-id'] = options.traceId;
  return headers;
}
