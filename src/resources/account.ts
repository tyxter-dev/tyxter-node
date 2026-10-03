import type { AccountProfileResponse } from '../contracts.js';
import type { HttpClient } from '../client.js';

export class AccountResource {
  constructor(private readonly http: HttpClient) {}

  async retrieve(): Promise<AccountProfileResponse> {
    return this.http.request<AccountProfileResponse>('GET', '/v1/account');
  }

  async me(): Promise<AccountProfileResponse> {
    return this.http.request<AccountProfileResponse>('GET', '/v1/me');
  }
}
