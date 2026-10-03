import type {
  AutoTopupConfigResponse,
  BillingPaymentMethodResponse,
  BillingPaymentMethodSetupIntentResponse,
  ChangePlanRequest,
  CreditBalanceResponse,
  CurrentPlanResponse,
  ListPlansResponse,
  SubscribePlanRequest,
  SubscribePlanResponse,
  InvoiceDownloadResponse,
  ListBillingPaymentMethodsResponse,
  ListBillingPackagesQuery,
  ListBillingPackagesResponse,
  ListInvoicesQuery,
  ListInvoicesResponse,
  ListLedgerEntriesResponse,
  ListRateCardsQuery,
  ListRateCardsResponse,
  PurchaseBillingPackageRequest,
  RateCardResponse,
  SaveBillingPaymentMethodRequest,
  TopupResponse,
  UpdateAutoTopupConfigRequest,
} from '../contracts.js';

import type { HttpClient } from '../client.js';
import { toQs } from './internal.js';

export interface ListLedgerQuery {
  limit?: number;
  starting_after?: string;
  environment?: 'sandbox' | 'production';
  source_type?: 'usage' | 'credit_topup';
}

export class BillingResource {
  readonly packages = {
    list: (query: ListBillingPackagesQuery = {}) => this.listPackages(query),
    purchase: (body: PurchaseBillingPackageRequest, idempotencyKey?: string) =>
      this.purchasePackage(body, idempotencyKey),
  };
  readonly rateCards = {
    current: () => this.currentRateCard(),
    list: (query: ListRateCardsQuery = {}) => this.listRateCards(query),
  };
  readonly paymentMethods = {
    createSetupIntent: (idempotencyKey?: string) =>
      this.createPaymentMethodSetupIntent(idempotencyKey),
    list: () => this.listPaymentMethods(),
    save: (body: SaveBillingPaymentMethodRequest, idempotencyKey?: string) =>
      this.savePaymentMethod(body, idempotencyKey),
    setDefault: (paymentMethodId: string, idempotencyKey?: string) =>
      this.setDefaultPaymentMethod(paymentMethodId, idempotencyKey),
    delete: (paymentMethodId: string, idempotencyKey?: string) =>
      this.deletePaymentMethod(paymentMethodId, idempotencyKey),
  };
  readonly autoTopup = {
    retrieve: () => this.retrieveAutoTopupConfig(),
    update: (body: UpdateAutoTopupConfigRequest, idempotencyKey?: string) =>
      this.updateAutoTopupConfig(body, idempotencyKey),
  };
  readonly invoices = {
    list: (query: ListInvoicesQuery = {}) => this.listInvoices(query),
    download: (invoiceId: string) => this.downloadInvoice(invoiceId),
  };
  // Subscription plans.
  readonly plans = {
    list: () => this.listPlans(),
    current: () => this.currentPlan(),
    subscribe: (body: SubscribePlanRequest, idempotencyKey?: string) =>
      this.subscribePlan(body, idempotencyKey),
    change: (body: ChangePlanRequest, idempotencyKey?: string) =>
      this.changePlan(body, idempotencyKey),
    cancel: (idempotencyKey?: string) => this.cancelPlan(idempotencyKey),
  };

  constructor(private readonly http: HttpClient) {}

  async listPlans(): Promise<ListPlansResponse> {
    return this.http.request<ListPlansResponse>('GET', '/v1/billing/plans');
  }

  async currentPlan(): Promise<CurrentPlanResponse> {
    return this.http.request<CurrentPlanResponse>('GET', '/v1/billing/plan');
  }

  async subscribePlan(
    body: SubscribePlanRequest,
    idempotencyKey?: string,
  ): Promise<SubscribePlanResponse> {
    return this.http.request<SubscribePlanResponse>('POST', '/v1/billing/plan/subscribe', {
      body,
      idempotencyKey,
    });
  }

  async changePlan(body: ChangePlanRequest, idempotencyKey?: string): Promise<CurrentPlanResponse> {
    return this.http.request<CurrentPlanResponse>('POST', '/v1/billing/plan/change', {
      body,
      idempotencyKey,
    });
  }

  async cancelPlan(idempotencyKey?: string): Promise<CurrentPlanResponse> {
    return this.http.request<CurrentPlanResponse>('POST', '/v1/billing/plan/cancel', {
      idempotencyKey,
    });
  }

  async listInvoices(query: ListInvoicesQuery = {}): Promise<ListInvoicesResponse> {
    const qs = toQs({
      limit: query.limit,
      starting_after: query.starting_after,
      project_id: query.project_id,
    });
    return this.http.request<ListInvoicesResponse>('GET', `/v1/invoices${qs}`);
  }

  async downloadInvoice(invoiceId: string): Promise<InvoiceDownloadResponse> {
    return this.http.request<InvoiceDownloadResponse>('GET', `/v1/invoices/${invoiceId}/download`);
  }

  async balance(): Promise<CreditBalanceResponse> {
    return this.http.request<CreditBalanceResponse>('GET', '/v1/billing/balance');
  }

  async currentRateCard(): Promise<RateCardResponse> {
    return this.http.request<RateCardResponse>('GET', '/v1/rate-cards/current');
  }

  async listRateCards(query: ListRateCardsQuery = {}): Promise<ListRateCardsResponse> {
    const qs = toQs({
      limit: query.limit,
      starting_after: query.starting_after,
      currency: query.currency,
    });
    return this.http.request<ListRateCardsResponse>('GET', `/v1/rate-cards${qs}`);
  }

  async listLedger(query: ListLedgerQuery = {}): Promise<ListLedgerEntriesResponse> {
    const qs = toQs({
      limit: query.limit,
      starting_after: query.starting_after,
      environment: query.environment,
      source_type: query.source_type,
    });
    return this.http.request<ListLedgerEntriesResponse>('GET', `/v1/billing/ledger${qs}`);
  }

  async listPackages(query: ListBillingPackagesQuery = {}): Promise<ListBillingPackagesResponse> {
    const qs = toQs({
      limit: query.limit,
      starting_after: query.starting_after,
      status: query.status,
    });
    return this.http.request<ListBillingPackagesResponse>('GET', `/v1/billing/packages${qs}`);
  }

  async purchasePackage(
    body: PurchaseBillingPackageRequest,
    idempotencyKey?: string,
  ): Promise<TopupResponse> {
    return this.http.request<TopupResponse>(
      'POST',
      '/v1/billing/packages/purchase',
      body,
      idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {},
    );
  }

  async createPaymentMethodSetupIntent(
    idempotencyKey?: string,
  ): Promise<BillingPaymentMethodSetupIntentResponse> {
    return this.http.request<BillingPaymentMethodSetupIntentResponse>(
      'POST',
      '/v1/billing/payment-methods/setup-intent',
      undefined,
      idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {},
    );
  }

  async listPaymentMethods(): Promise<ListBillingPaymentMethodsResponse> {
    return this.http.request<ListBillingPaymentMethodsResponse>(
      'GET',
      '/v1/billing/payment-methods',
    );
  }

  async savePaymentMethod(
    body: SaveBillingPaymentMethodRequest,
    idempotencyKey?: string,
  ): Promise<BillingPaymentMethodResponse> {
    return this.http.request<BillingPaymentMethodResponse>(
      'POST',
      '/v1/billing/payment-methods',
      body,
      idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {},
    );
  }

  async setDefaultPaymentMethod(
    paymentMethodId: string,
    idempotencyKey?: string,
  ): Promise<BillingPaymentMethodResponse> {
    return this.http.request<BillingPaymentMethodResponse>(
      'POST',
      `/v1/billing/payment-methods/${paymentMethodId}/default`,
      undefined,
      idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {},
    );
  }

  async deletePaymentMethod(
    paymentMethodId: string,
    idempotencyKey?: string,
  ): Promise<BillingPaymentMethodResponse> {
    return this.http.request<BillingPaymentMethodResponse>(
      'DELETE',
      `/v1/billing/payment-methods/${paymentMethodId}`,
      undefined,
      idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {},
    );
  }

  async retrieveAutoTopupConfig(): Promise<AutoTopupConfigResponse> {
    return this.http.request<AutoTopupConfigResponse>('GET', '/v1/billing/auto-topup');
  }

  async updateAutoTopupConfig(
    body: UpdateAutoTopupConfigRequest,
    idempotencyKey?: string,
  ): Promise<AutoTopupConfigResponse> {
    return this.http.request<AutoTopupConfigResponse>(
      'PUT',
      '/v1/billing/auto-topup',
      body,
      idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {},
    );
  }
}
