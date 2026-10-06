import type { HttpClient } from '../client.js';
import type { GroupEligibilityResponse, GroupResponse, ListGroupsResponse } from '../contracts.js';
import { toQs } from './internal.js';

/**
 * WhatsApp Business groups (beta): business-owned groups on a Cloud API number,
 * created through Meta's Groups API. Never personal WhatsApp groups created in
 * the WhatsApp or WhatsApp Business app. What is offered today is listed on the
 * `/api-reference/groups` docs page.
 */
export class GroupsResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * `GET /v1/groups/eligibility` (scope `groups:read`). `phone_number_id` is the
   * Tyxter phone number id. The answer is read from Tyxter; the call never
   * reaches Meta.
   */
  async retrieveEligibility(query: { phone_number_id: string }): Promise<GroupEligibilityResponse> {
    return this.http.request<GroupEligibilityResponse>(
      'GET',
      `/v1/groups/eligibility${toQs(query)}`,
    );
  }

  /**
   * `POST /v1/groups/eligibility-checks` (scope `groups:write`, 202). Asks Tyxter
   * to read the phone number's eligibility facts again; the call never reaches
   * Meta. The response holds the answer stored at accept time and the new
   * `check_requested_at`; poll {@link retrieveEligibility} until `checked_at` is
   * later. A check normally completes shortly after it is accepted, but no
   * completion time is promised: if `checked_at` has not passed
   * `check_requested_at` within your own timeout, that check did not complete;
   * request a new one (with a new `idempotencyKey`) at any time. Pass
   * `idempotencyKey` to make a retry replay the first response.
   */
  async createEligibilityCheck(
    body: { phone_number_id: string },
    options: { idempotencyKey?: string } = {},
  ): Promise<GroupEligibilityResponse> {
    const headers: Record<string, string> = {};
    if (options.idempotencyKey) headers['idempotency-key'] = options.idempotencyKey;
    return this.http.request<GroupEligibilityResponse>(
      'POST',
      '/v1/groups/eligibility-checks',
      body,
      headers,
    );
  }

  /**
   * `POST /v1/groups` (scope `groups:write`, 202). Accepts a WhatsApp Business
   * group on a Tyxter phone number and returns it with `status: 'pending'` and
   * its Tyxter `id`; the call never reaches Meta. A new group stays `pending`
   * until a Tyxter worker resolves its create outcome; a create the worker
   * finds it cannot send (for example the number was released meanwhile) ends `failed`
   * with a `failure.code` saying why. `join_approval_mode` accepts
   * only `auto_approve`. Pass `idempotencyKey` to make a retry replay the first
   * response (same group id).
   */
  async create(
    body: {
      phone_number_id: string;
      subject: string;
      description?: string | null;
      join_approval_mode?: 'auto_approve';
    },
    options: { idempotencyKey?: string } = {},
  ): Promise<GroupResponse> {
    const headers: Record<string, string> = {};
    if (options.idempotencyKey) headers['idempotency-key'] = options.idempotencyKey;
    return this.http.request<GroupResponse>('POST', '/v1/groups', body, headers);
  }

  /**
   * `GET /v1/groups` (scope `groups:read`). Groups of the key's environment,
   * newest first, with cursor pagination and optional `phone_number_id` and
   * `status` filters.
   */
  async list(
    query: {
      limit?: number;
      starting_after?: string;
      phone_number_id?: string;
      status?: GroupResponse['status'];
    } = {},
  ): Promise<ListGroupsResponse> {
    return this.http.request<ListGroupsResponse>('GET', `/v1/groups${toQs(query)}`);
  }

  /**
   * `GET /v1/groups/:group_id` (scope `groups:read`). `groupId` is the Tyxter
   * group id, never Meta's. The id is percent-encoded into one path segment,
   * so a personal WhatsApp group invite link or app group id is refused with
   * `422 personal_whatsapp_group_not_supported` (an invite link sent unencoded
   * by a raw HTTP call matches no route: `404 route_not_found`); any other
   * unknown id is `404 group_not_found`.
   */
  async retrieve(groupId: string): Promise<GroupResponse> {
    return this.http.request<GroupResponse>('GET', `/v1/groups/${encodeURIComponent(groupId)}`);
  }

  /**
   * `DELETE /v1/groups/:group_id` (scope `groups:write`, 202). Deletes a
   * WhatsApp Business group by its Tyxter id; the call never reaches Meta. An
   * `active` group comes back `deleting` (a Tyxter worker then deletes it), a
   * `failed` group comes back `deleted`, and a `deleting` or `deleted` group
   * comes back unchanged; a `pending` group is a `409 group_not_active`. Works
   * even when the `groups` feature family is disabled. The id is
   * percent-encoded like `retrieve`. Pass `idempotencyKey` to make a retry
   * replay the first response.
   */
  async delete(groupId: string, options: { idempotencyKey?: string } = {}): Promise<GroupResponse> {
    const headers: Record<string, string> = {};
    if (options.idempotencyKey) headers['idempotency-key'] = options.idempotencyKey;
    return this.http.request<GroupResponse>(
      'DELETE',
      `/v1/groups/${encodeURIComponent(groupId)}`,
      undefined,
      headers,
    );
  }

  /**
   * `POST /v1/groups/:group_id/invite-link/reset` (scope `groups:write`, 202).
   * Resets the invite link of an `active` WhatsApp Business group by its Tyxter
   * id; the call never reaches Meta and returns the group still `active`, with
   * the link the reset will replace. While the group stays `active`, a Tyxter
   * worker then stores the new link (read it with {@link retrieve}), or records
   * `failure` and keeps the old link. While the group is `deleting`, the
   * reset's outcome leaves `failure` to the delete, and in production a reset
   * not yet sent when the delete is accepted is not sent (reset again if the
   * delete is refused). Any other status is a `409 group_not_active`. Refused with
   * `403 feature_disabled` when the `groups` feature family is disabled. The id
   * is percent-encoded like `retrieve`. Pass `idempotencyKey` so a retry
   * replays the first response instead of resetting the link again.
   */
  async resetInviteLink(
    groupId: string,
    options: { idempotencyKey?: string } = {},
  ): Promise<GroupResponse> {
    const headers: Record<string, string> = {};
    if (options.idempotencyKey) headers['idempotency-key'] = options.idempotencyKey;
    return this.http.request<GroupResponse>(
      'POST',
      `/v1/groups/${encodeURIComponent(groupId)}/invite-link/reset`,
      undefined,
      headers,
    );
  }
}
