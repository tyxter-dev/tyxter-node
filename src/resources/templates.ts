import type {
  CreateTemplateRequest,
  DuplicateTemplateRequest,
  EstimateTemplateCostRequest,
  ListTemplatesResponse,
  TemplateCostEstimateResponse,
  TemplateAnalyticsResponse,
  TemplateGenerationRequest,
  TemplateGenerationResponse,
  TemplateResponse,
  UpdateTemplateRequest,
} from '../contracts.js';
import type { HttpClient } from '../client.js';
import { toQs } from './internal.js';

export type TemplateGenerationOptions = {
  idempotencyKey?: string;
};

export type TemplateMutationOptions = {
  idempotencyKey?: string;
};

function mutationHeaders(options: TemplateMutationOptions): Record<string, string> {
  const headers: Record<string, string> = {};
  if (options.idempotencyKey) headers['idempotency-key'] = options.idempotencyKey;
  return headers;
}

export class TemplatesResource {
  constructor(private readonly http: HttpClient) {}

  async create(
    input: CreateTemplateRequest,
    options: TemplateMutationOptions = {},
  ): Promise<TemplateResponse> {
    return this.http.request<TemplateResponse>(
      'POST',
      '/v1/templates',
      input,
      mutationHeaders(options),
    );
  }

  async generate(
    input: TemplateGenerationRequest,
    options: TemplateGenerationOptions = {},
  ): Promise<TemplateGenerationResponse> {
    const headers: Record<string, string> = {};
    if (options.idempotencyKey) headers['idempotency-key'] = options.idempotencyKey;
    return this.http.request<TemplateGenerationResponse>(
      'POST',
      '/v1/templates/generate',
      input,
      headers,
    );
  }

  async list(
    query: { limit?: number; starting_after?: string } = {},
  ): Promise<ListTemplatesResponse> {
    return this.http.request<ListTemplatesResponse>('GET', `/v1/templates${toQs(query)}`);
  }

  async retrieve(id: string): Promise<TemplateResponse> {
    return this.http.request<TemplateResponse>('GET', `/v1/templates/${id}`);
  }

  async update(
    id: string,
    input: UpdateTemplateRequest,
    options: TemplateMutationOptions = {},
  ): Promise<TemplateResponse> {
    return this.http.request<TemplateResponse>(
      'PATCH',
      `/v1/templates/${id}`,
      input,
      mutationHeaders(options),
    );
  }

  async submit(id: string, options: TemplateMutationOptions = {}): Promise<TemplateResponse> {
    return this.http.request<TemplateResponse>(
      'POST',
      `/v1/templates/${id}/submit`,
      undefined,
      mutationHeaders(options),
    );
  }

  async duplicate(
    id: string,
    input: DuplicateTemplateRequest = {},
    options: TemplateMutationOptions = {},
  ): Promise<TemplateResponse> {
    return this.http.request<TemplateResponse>(
      'POST',
      `/v1/templates/${id}/duplicate`,
      input,
      mutationHeaders(options),
    );
  }

  async analytics(id: string): Promise<TemplateAnalyticsResponse> {
    return this.http.request<TemplateAnalyticsResponse>('GET', `/v1/templates/${id}/analytics`);
  }

  async estimateCost(
    id: string,
    input: EstimateTemplateCostRequest = {},
  ): Promise<TemplateCostEstimateResponse> {
    return this.http.request<TemplateCostEstimateResponse>(
      'POST',
      `/v1/templates/${id}/estimate-cost`,
      input,
    );
  }

  async delete(id: string): Promise<TemplateResponse> {
    return this.http.request<TemplateResponse>('DELETE', `/v1/templates/${id}`);
  }
}
