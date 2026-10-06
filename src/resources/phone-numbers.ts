import type { PhoneNumberMutationResponse } from '../display-name-contracts.js';
import type {
  ConnectPhoneNumberRequest,
  CompleteSalvyPhoneRegistrationRequest,
  ImportSalvyPhoneNumberRequest,
  ListAvailableRegionsResponse,
  ListPhoneNumbersResponse,
  PhoneNumberResponse,
  PhoneNumberReadResponse,
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

  async retrieve(id: string): Promise<PhoneNumberReadResponse> {
    return this.http.request<PhoneNumberReadResponse>('GET', `/v1/phone-numbers/${id}`);
  }

  async provision(
    input: ProvisionPhoneNumberRequest,
    options: { idempotencyKey?: string } = {},
  ): Promise<PhoneNumberMutationResponse> {
    const headers: Record<string, string> = {};
    if (options.idempotencyKey) headers['idempotency-key'] = options.idempotencyKey;
    return this.http.request<PhoneNumberMutationResponse>(
      'POST',
      '/v1/phone-numbers/provision',
      input,
      headers,
    );
  }

  async connect(
    input: ConnectPhoneNumberRequest,
    options: { idempotencyKey?: string } = {},
  ): Promise<PhoneNumberMutationResponse> {
    const headers: Record<string, string> = {};
    if (options.idempotencyKey) headers['idempotency-key'] = options.idempotencyKey;
    return this.http.request<PhoneNumberMutationResponse>(
      'POST',
      '/v1/phone-numbers/connect',
      input,
      headers,
    );
  }

  /** Imports one explicitly selected cached account-owned Salvy resource. */
  async importSalvy(
    input: ImportSalvyPhoneNumberRequest,
    idempotencyKey: string,
  ): Promise<PhoneNumberResponse> {
    return this.http.request<PhoneNumberResponse>('POST', '/v1/phone-numbers/import-salvy', input, {
      'Idempotency-Key': idempotencyKey,
    });
  }

  /** Queues independent Meta ownership validation for an imported Salvy number. */
  async completeSalvyRegistration(
    id: string,
    input: CompleteSalvyPhoneRegistrationRequest,
    idempotencyKey: string,
  ): Promise<PhoneNumberResponse> {
    return this.http.request<PhoneNumberResponse>(
      'POST',
      `/v1/phone-numbers/${id}/salvy/complete-registration`,
      input,
      { 'Idempotency-Key': idempotencyKey },
    );
  }

  async disconnect(id: string): Promise<PhoneNumberResponse> {
    return this.http.request<PhoneNumberResponse>('DELETE', `/v1/phone-numbers/${id}`);
  }

  /** Ends optional customer-Salvy management and keeps this same BYON phone. */
  async convertToByon(id: string, idempotencyKey: string): Promise<PhoneNumberResponse> {
    return this.http.request<PhoneNumberResponse>(
      'POST',
      `/v1/phone-numbers/${id}/convert-to-byon`,
      {},
      { 'Idempotency-Key': idempotencyKey },
    );
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
