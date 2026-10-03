import type {
  CreateProjectRequest,
  ListProjectsQuery,
  ListProjectsResponse,
  ProjectResponse,
} from '../contracts.js';
import type { HttpClient } from '../client.js';
import { toQs } from './internal.js';

export type ProjectWriteOptions = { idempotencyKey?: string };

/** Public, organization-scoped project management. */
export class ProjectsResource {
  constructor(private readonly http: HttpClient) {}

  async create(
    input: CreateProjectRequest,
    options: ProjectWriteOptions = {},
  ): Promise<ProjectResponse> {
    const headers: Record<string, string> = {};
    if (options.idempotencyKey) headers['idempotency-key'] = options.idempotencyKey;
    return this.http.request<ProjectResponse>('POST', '/v1/projects', input, headers);
  }

  async list(query: ListProjectsQuery = {}): Promise<ListProjectsResponse> {
    const qs = toQs({ limit: query.limit, starting_after: query.starting_after });
    return this.http.request<ListProjectsResponse>('GET', `/v1/projects${qs}`);
  }

  async retrieve(projectId: string): Promise<ProjectResponse> {
    return this.http.request<ProjectResponse>('GET', `/v1/projects/${projectId}`);
  }
}
