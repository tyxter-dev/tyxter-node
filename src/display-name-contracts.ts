import type { PhoneNumberResponse, ProviderConnectionResponse } from './contracts.js';

/** Advisory codes are stable; messages are informational, not Meta review results. */
export type DisplayNameWarningCode =
  | 'display_name_promotional_word'
  | 'display_name_symbols'
  | 'display_name_phone_digits'
  | 'display_name_all_caps'
  | 'display_name_personal_name_suffix'
  | 'display_name_mismatch_business'
  | 'display_name_format';
export interface DisplayNameWarning {
  code: DisplayNameWarningCode;
  field: 'display_name';
  message: string;
}
export interface PhoneNumberMutationResponse extends Omit<PhoneNumberResponse, 'renewal'> {
  warnings?: DisplayNameWarning[];
}
export interface MetaConnectionMutationResponse extends ProviderConnectionResponse {
  warnings?: DisplayNameWarning[];
}
