import type { HttpClient } from '../client.js';
import type {
  AutomationResponse,
  AutomationRunResponse,
  AutomationVersionResponse,
  AutomationWebhookSecretResponse,
  CreateAutomationRequest,
  CreateAutomationRunRequest,
  CreateAutomationVersionRequest,
  DeleteAutomationResponse,
  ListAutomationRunsResponse,
  ListAutomationStepRunsResponse,
  ListAutomationVersionsResponse,
  ListAutomationsResponse,
  PublishAutomationRequest,
  UpdateAutomationRequest,
} from '../contracts.js';
import { toQs } from './internal.js';

type RequestOptions = { idempotencyKey?: string; traceId?: string };

function headersFor(options: RequestOptions): Record<string, string> {
  const headers: Record<string, string> = {};
  if (options.idempotencyKey) headers['idempotency-key'] = options.idempotencyKey;
  if (options.traceId) headers['tyxter-trace-id'] = options.traceId;
  return headers;
}

export class AutomationsResource {
  constructor(private readonly http: HttpClient) {}

  async create(
    input: CreateAutomationRequest,
    options: RequestOptions = {},
  ): Promise<AutomationResponse> {
    return this.http.request<AutomationResponse>(
      'POST',
      '/v1/automations',
      input,
      headersFor(options),
    );
  }

  async list(
    query: { limit?: number; starting_after?: string; status?: string } = {},
  ): Promise<ListAutomationsResponse> {
    return this.http.request<ListAutomationsResponse>('GET', `/v1/automations${toQs(query)}`);
  }

  async retrieve(id: string): Promise<AutomationResponse> {
    return this.http.request<AutomationResponse>('GET', `/v1/automations/${id}`);
  }

  async update(id: string, input: UpdateAutomationRequest): Promise<AutomationResponse> {
    return this.http.request<AutomationResponse>('PATCH', `/v1/automations/${id}`, input);
  }

  async delete(id: string): Promise<DeleteAutomationResponse> {
    return this.http.request<DeleteAutomationResponse>('DELETE', `/v1/automations/${id}`);
  }

  async createVersion(
    id: string,
    input: CreateAutomationVersionRequest,
    options: RequestOptions = {},
  ): Promise<AutomationVersionResponse> {
    return this.http.request<AutomationVersionResponse>(
      'POST',
      `/v1/automations/${id}/versions`,
      input,
      headersFor(options),
    );
  }

  async listVersions(
    id: string,
    query: { limit?: number; starting_after?: string } = {},
  ): Promise<ListAutomationVersionsResponse> {
    return this.http.request<ListAutomationVersionsResponse>(
      'GET',
      `/v1/automations/${id}/versions${toQs(query)}`,
    );
  }

  async publish(
    id: string,
    input: PublishAutomationRequest,
    options: RequestOptions = {},
  ): Promise<AutomationResponse> {
    return this.http.request<AutomationResponse>(
      'POST',
      `/v1/automations/${id}/publish`,
      input,
      headersFor(options),
    );
  }

  async pause(id: string, options: RequestOptions = {}): Promise<AutomationResponse> {
    return this.http.request<AutomationResponse>(
      'POST',
      `/v1/automations/${id}/pause`,
      {},
      headersFor(options),
    );
  }

  async resume(id: string, options: RequestOptions = {}): Promise<AutomationResponse> {
    return this.http.request<AutomationResponse>(
      'POST',
      `/v1/automations/${id}/resume`,
      {},
      headersFor(options),
    );
  }

  async createRun(
    id: string,
    input: CreateAutomationRunRequest = {},
    options: RequestOptions = {},
  ): Promise<AutomationRunResponse> {
    return this.http.request<AutomationRunResponse>(
      'POST',
      `/v1/automations/${id}/runs`,
      input,
      headersFor(options),
    );
  }

  async listRuns(
    id: string,
    query: { limit?: number; starting_after?: string; status?: string } = {},
  ): Promise<ListAutomationRunsResponse> {
    return this.http.request<ListAutomationRunsResponse>(
      'GET',
      `/v1/automations/${id}/runs${toQs(query)}`,
    );
  }

  async retrieveRun(id: string): Promise<AutomationRunResponse> {
    return this.http.request<AutomationRunResponse>('GET', `/v1/automation-runs/${id}`);
  }

  async listRunSteps(
    id: string,
    query: { limit?: number; starting_after?: string } = {},
  ): Promise<ListAutomationStepRunsResponse> {
    return this.http.request<ListAutomationStepRunsResponse>(
      'GET',
      `/v1/automation-runs/${id}/steps${toQs(query)}`,
    );
  }

  async cancelRun(id: string): Promise<AutomationRunResponse> {
    return this.http.request<AutomationRunResponse>('POST', `/v1/automation-runs/${id}/cancel`, {});
  }

  async invokeWebhook(
    slug: string,
    input: CreateAutomationRunRequest = {},
    options: RequestOptions = {},
  ): Promise<AutomationRunResponse> {
    return this.http.request<AutomationRunResponse>(
      'POST',
      `/v1/automation-webhooks/${slug}`,
      input,
      headersFor(options),
    );
  }

  async rotateWebhookSecret(
    automationId: string,
    slug: string,
    options: RequestOptions = {},
  ): Promise<AutomationWebhookSecretResponse> {
    return this.http.request<AutomationWebhookSecretResponse>(
      'POST',
      `/v1/automations/${automationId}/webhook-triggers/${slug}/rotate-secret`,
      undefined,
      headersFor(options),
    );
  }
}
