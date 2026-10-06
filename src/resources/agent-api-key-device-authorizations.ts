import type {
  AgentApiKeyDeviceAuthorizationResponse,
  AgentApiKeyDeviceTokenRequest,
  AgentApiKeyDeviceTokenResponse,
  CreateAgentApiKeyDeviceAuthorizationRequest,
} from '../contracts.js';
import type { PublicHttpClient } from '../client.js';

export class AgentApiKeyDeviceAuthorizationsResource {
  constructor(private readonly http: PublicHttpClient) {}

  async create(
    input: CreateAgentApiKeyDeviceAuthorizationRequest,
    options: { traceId?: string } = {},
  ): Promise<AgentApiKeyDeviceAuthorizationResponse> {
    return this.http.request<AgentApiKeyDeviceAuthorizationResponse>(
      'POST',
      '/v1/agent-api-key-device-authorizations',
      input,
      options.traceId ? { 'tyxter-trace-id': options.traceId } : {},
    );
  }

  async token(
    input: AgentApiKeyDeviceTokenRequest,
    options: { traceId?: string } = {},
  ): Promise<AgentApiKeyDeviceTokenResponse> {
    return this.http.request<AgentApiKeyDeviceTokenResponse>(
      'POST',
      '/v1/agent-api-key-device-authorizations/token',
      input,
      options.traceId ? { 'tyxter-trace-id': options.traceId } : {},
    );
  }
}
