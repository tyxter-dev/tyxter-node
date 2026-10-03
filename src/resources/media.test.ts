import { describe, expect, it, vi } from 'vitest';
import { Tyxter } from '../client.js';

type CapturedCall = {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: unknown;
};

function mediaAsset(status: 'pending' | 'ready' | 'consumed' = 'ready') {
  return {
    id: 'mda_123',
    object: 'media_asset',
    source: 'customer',
    provider: null,
    provider_media_id: null,
    kind: 'image',
    lifecycle: 'single_use',
    filename: 'promo.png',
    mime_type: 'image/png',
    byte_length: 4,
    status,
    expires_at: '2026-05-28T12:00:00Z',
    upload_expires_at: '2026-05-21T12:30:00Z',
    completed_at: status === 'ready' ? '2026-05-21T12:00:10Z' : null,
    consumed_at: status === 'consumed' ? '2026-05-21T12:05:00Z' : null,
    consumed_by_message_id: status === 'consumed' ? 'msg_123' : null,
    deleted_at: null,
    failure_code: null,
    failure_message: null,
    trace_id: 'trc_media',
    created_at: '2026-05-21T12:00:00Z',
    updated_at: '2026-05-21T12:00:10Z',
  };
}

function uploadSession() {
  return {
    id: 'mda_123',
    object: 'media_upload',
    upload_url: 'https://storage.example.test/upload/mda_123',
    upload_method: 'PUT',
    upload_headers: { 'content-type': 'image/png' },
    expires_at: '2026-05-21T12:30:00Z',
  };
}

function withMediaCapture() {
  const calls: CapturedCall[] = [];
  const fetchImpl = vi.fn(
    async (
      url: string,
      init: {
        method?: string;
        headers?: Record<string, string>;
        body?: unknown;
        signal?: unknown;
      },
    ) => {
      calls.push({
        url,
        method: init.method ?? 'GET',
        headers: init.headers ?? {},
        body: init.body,
      });
      if (url === 'http://test/v1/media/uploads') {
        return jsonResponse(uploadSession(), 201);
      }
      if (url === 'https://storage.example.test/upload/mda_123') {
        return new Response('', { status: 200 });
      }
      if (url === 'http://test/v1/media/uploads/mda_123/complete') {
        return jsonResponse(mediaAsset(), 200);
      }
      if (url === 'http://test/v1/media?lifecycle=library&status=ready&kind=image') {
        return jsonResponse(
          { object: 'list', data: [{ ...mediaAsset(), lifecycle: 'library' }], has_more: false },
          200,
        );
      }
      if (url === 'http://test/v1/media?source=inbound_provider') {
        return jsonResponse(
          {
            object: 'list',
            data: [{ ...mediaAsset('consumed'), source: 'inbound_provider' }],
            has_more: false,
          },
          200,
        );
      }
      if (url === 'http://test/v1/media/storage-usage') {
        return jsonResponse(
          {
            object: 'media_storage_usage',
            used_bytes: 4,
            limit_bytes: 524288000,
            available_bytes: 524287996,
            percent_used: 0,
          },
          200,
        );
      }
      if (url === 'http://test/v1/media/mda_123/download-url') {
        return jsonResponse(
          {
            id: 'mda_123',
            object: 'media_asset_download',
            download_url: 'http://test/v1/media/blobs/signed-token',
            expires_at: '2026-05-21T12:05:00Z',
          },
          200,
        );
      }
      if (url === 'http://test/v1/media/mda_123' && init.method === 'DELETE') {
        return jsonResponse({ id: 'mda_123', object: 'media_asset', deleted: true }, 200);
      }
      if (url === 'http://test/v1/media/mda_123') {
        return jsonResponse(mediaAsset(), 200);
      }
      return jsonResponse({ error: { type: 'not_found', code: 'not_found' } }, 404);
    },
  ) as unknown as typeof fetch;
  const client = new Tyxter({
    apiKey: 'tx_sandbox_aaaaaaaaaaaaaaaaaaaaaaaa',
    baseUrl: 'http://test',
    fetch: fetchImpl,
  });
  return { client, calls };
}

describe('MediaResource', () => {
  it('creates, completes, and retrieves media assets', async () => {
    const { client, calls } = withMediaCapture();

    await expect(
      client.media.createUpload(
        {
          kind: 'image',
          filename: 'promo.png',
          mime_type: 'image/png',
          byte_length: 4,
        },
        { idempotencyKey: 'idem_create_media', traceId: 'trc_media' },
      ),
    ).resolves.toMatchObject({ object: 'media_upload', upload_method: 'PUT' });
    await expect(
      client.media.completeUpload('mda_123', {
        idempotencyKey: 'idem_complete_media',
        traceId: 'trc_media',
      }),
    ).resolves.toMatchObject({ object: 'media_asset', status: 'ready' });
    await expect(client.media.retrieve('mda_123')).resolves.toMatchObject({
      id: 'mda_123',
      object: 'media_asset',
    });

    expect(calls[0]).toMatchObject({
      url: 'http://test/v1/media/uploads',
      method: 'POST',
      headers: {
        authorization: 'Bearer tx_sandbox_aaaaaaaaaaaaaaaaaaaaaaaa',
        'content-type': 'application/json',
        'idempotency-key': 'idem_create_media',
        'tyxter-trace-id': 'trc_media',
      },
    });
    expect(calls[1]).toMatchObject({
      url: 'http://test/v1/media/uploads/mda_123/complete',
      method: 'POST',
      headers: {
        'idempotency-key': 'idem_complete_media',
        'tyxter-trace-id': 'trc_media',
      },
    });
    expect(calls[2]).toMatchObject({
      url: 'http://test/v1/media/mda_123',
      method: 'GET',
    });
  });

  it('uploads bytes to the signed storage URL before completing the asset', async () => {
    const { client, calls } = withMediaCapture();

    await expect(
      client.media.upload(
        {
          kind: 'image',
          filename: 'promo.png',
          mime_type: 'image/png',
          byte_length: 4,
          body: 'data',
        },
        {
          createIdempotencyKey: 'idem_create_media',
          completeIdempotencyKey: 'idem_complete_media',
          traceId: 'trc_media',
        },
      ),
    ).resolves.toMatchObject({ object: 'media_asset', status: 'ready' });

    expect(calls.map((call) => `${call.method} ${call.url}`)).toEqual([
      'POST http://test/v1/media/uploads',
      'PUT https://storage.example.test/upload/mda_123',
      'POST http://test/v1/media/uploads/mda_123/complete',
    ]);
    expect(calls[1]).toMatchObject({
      headers: { 'content-type': 'image/png' },
      body: 'data',
    });
    expect(calls[1]?.headers).not.toHaveProperty('authorization');
  });

  it('lists, deletes, and retrieves media storage usage', async () => {
    const { client, calls } = withMediaCapture();

    await expect(
      client.media.list({ lifecycle: 'library', status: 'ready', kind: 'image' }),
    ).resolves.toMatchObject({
      object: 'list',
      data: [expect.objectContaining({ lifecycle: 'library' })],
    });
    await expect(client.media.storageUsage()).resolves.toMatchObject({
      object: 'media_storage_usage',
      used_bytes: 4,
    });
    await expect(client.media.delete('mda_123')).resolves.toEqual({
      id: 'mda_123',
      object: 'media_asset',
      deleted: true,
    });

    expect(calls.map((call) => `${call.method} ${call.url}`)).toEqual([
      'GET http://test/v1/media?lifecycle=library&status=ready&kind=image',
      'GET http://test/v1/media/storage-usage',
      'DELETE http://test/v1/media/mda_123',
    ]);
  });

  it('forwards the source filter so inbound-captured media can be listed on its own', async () => {
    const { client, calls } = withMediaCapture();

    await expect(client.media.list({ source: 'inbound_provider' })).resolves.toMatchObject({
      object: 'list',
      data: [expect.objectContaining({ source: 'inbound_provider' })],
    });

    expect(calls.map((call) => `${call.method} ${call.url}`)).toEqual([
      'GET http://test/v1/media?source=inbound_provider',
    ]);
  });

  it('mints a short-lived download URL for an asset', async () => {
    const { client, calls } = withMediaCapture();

    await expect(client.media.createDownloadUrl('mda_123')).resolves.toEqual({
      id: 'mda_123',
      object: 'media_asset_download',
      download_url: 'http://test/v1/media/blobs/signed-token',
      expires_at: '2026-05-21T12:05:00Z',
    });
    expect(calls[0]).toMatchObject({
      method: 'GET',
      url: 'http://test/v1/media/mda_123/download-url',
    });
  });
});

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
