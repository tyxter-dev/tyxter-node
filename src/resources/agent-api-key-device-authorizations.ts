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
  ): Promise<AgentApiKeyDeviceAuthorizationResponse> {
    return this.http.request<AgentApiKeyDeviceAuthorizationResponse>(
      'POST',
      '/v1/agent-api-key-device-authorizations',
      input,
    );
  }

  async token(input: AgentApiKeyDeviceTokenRequest): Promise<AgentApiKeyDeviceTokenResponse> {
    return this.http.request<AgentApiKeyDeviceTokenResponse>(
      'POST',
      '/v1/agent-api-key-device-authorizations/token',
      input,
    );
  }
}
