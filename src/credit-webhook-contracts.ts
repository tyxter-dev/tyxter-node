import type { WebhookEventEnvelope } from './contracts.js';

export interface CreditHardBlockLiftedWebhookData {
  organization_id: string;
  balance_brl: string;
  floor_brl: string;
  top_up_url: string;
}
export interface CreditHardBlockEngagedWebhookData extends CreditHardBlockLiftedWebhookData {
  trigger: 'usage' | 'phone_renewal' | 'reversal' | 'reconciliation';
}
export type CreditHardBlockEngagedWebhookEnvelope = WebhookEventEnvelope<
  'credit.hard_block_engaged',
  CreditHardBlockEngagedWebhookData
>;
export type CreditHardBlockLiftedWebhookEnvelope = WebhookEventEnvelope<
  'credit.hard_block_lifted',
  CreditHardBlockLiftedWebhookData
>;

/** Existing `credit.topped_up` snapshot. `provider` is absent for historical replay. */
export interface CreditToppedUpWebhookData {
  topup_id: string;
  amount_brl: string;
  payment_method: 'pix' | 'card' | 'x402' | 'manual' | 'promotion';
  provider?: 'stripe' | 'abacate_pay' | 'manual' | 'promotion';
  balance_brl: string;
}

export type CreditToppedUpWebhookEnvelope = WebhookEventEnvelope<
  'credit.topped_up',
  CreditToppedUpWebhookData
>;
