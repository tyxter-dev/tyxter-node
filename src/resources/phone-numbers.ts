import type {
  ConnectPhoneNumberRequest,
  ListAvailableRegionsResponse,
  ListPhoneNumbersResponse,
  PhoneNumberResponse,
  ProvisionPhoneNumberRequest,
  TransferPhoneNumberRequest,
} from '../contracts.js';
import type { HttpClient } from '../client.js';
import { toQs } from './internal.js';

export class PhoneNumbersResource {
  constructor(private readonly http: HttpClient) {}

  async list(
    query: { limit?: number; starting_after?: string; status?: string } = {},
  ): Promise<ListPhoneNumbersResponse> {
    return this.http.request<ListPhoneNumbersResponse>('GET', `/v1/phone-numbers${toQs(query)}`);
  }

  async retrieve(id: string): Promise<PhoneNumberResponse> {
    return this.http.request<PhoneNumberResponse>('GET', `/v1/phone-numbers/${id}`);
  }

  async provision(
    input: ProvisionPhoneNumberRequest,
    options: { idempotencyKey?: string } = {},
  ): Promise<PhoneNumberResponse> {
    const headers: Record<string, string> = {};
    if (options.idempotencyKey) headers['idempotency-key'] = options.idempotencyKey;
    return this.http.request<PhoneNumberResponse>(
      'POST',
      '/v1/phone-numbers/provision',
      input,
      headers,
    );
  }

  async connect(
    input: ConnectPhoneNumberRequest,
    options: { idempotencyKey?: string } = {},
  ): Promise<PhoneNumberResponse> {
    const headers: Record<string, string> = {};
    if (options.idempotencyKey) headers['idempotency-key'] = options.idempotencyKey;
    return this.http.request<PhoneNumberResponse>(
      'POST',
      '/v1/phone-numbers/connect',
      input,
      headers,
    );
  }

  async disconnect(id: string): Promise<PhoneNumberResponse> {
    return this.http.request<PhoneNumberResponse>('DELETE', `/v1/phone-numbers/${id}`);
  }

  /** 202 — Salvy phones go release_requested → released via the worker; BYON releases directly. */
  async release(
    id: string,
    options: { idempotencyKey?: string } = {},
  ): Promise<PhoneNumberResponse> {
    const headers: Record<string, string> = {};
    if (options.idempotencyKey) headers['idempotency-key'] = options.idempotencyKey;
    return this.http.request<PhoneNumberResponse>(
      'POST',
      `/v1/phone-numbers/${id}/release`,
      undefined,
      headers,
    );
  }

  /** Moves a number between environments in the same organization. */
  async transfer(
    id: string,
    input: TransferPhoneNumberRequest,
    options: { idempotencyKey?: string } = {},
  ): Promise<PhoneNumberResponse> {
    const headers: Record<string, string> = {};
    if (options.idempotencyKey) headers['idempotency-key'] = options.idempotencyKey;
    return this.http.request<PhoneNumberResponse>(
      'POST',
      `/v1/phone-numbers/${id}/transfer`,
      input,
      headers,
    );
  }

  async availableRegions(): Promise<ListAvailableRegionsResponse> {
    return this.http.request<ListAvailableRegionsResponse>(
      'GET',
      '/v1/phone-numbers/available-regions',
    );
  }
}
