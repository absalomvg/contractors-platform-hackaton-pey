/** Transport DTOs only. No domain entities or business logic. */
export interface ContractorDto {
  id: string;
  name: string;
  specialty: string;
}

export interface ListContractorsResponse {
  contractors: ContractorDto[];
}

export interface ClientDto {
  name: string;
  phone: string;
  email: string;
}

export interface CreateOnboardingRequest {
  name: string;
  profession: string;
  client: ClientDto;
  taxRegime?: string;
  businessName: string;
  businessActivity: string;
  rfc: string;
}

export interface OnboardingDto extends CreateOnboardingRequest {
  id: string;
}

export type PaymentMethodDto = "PAYMENT_LINK" | "CODI_QR";

export type PaymentStatusDto =
  | "PENDING_PAYMENT"
  | "SETTLED"
  | "UNDERPAID"
  | "EXPIRED"
  | "CANCELLED";

export interface CreatePaymentIntentRequest {
  onboardingId: string;
  clientName: string;
  clientPhone?: string;
  clientEmail?: string;
  concept: string;
  amountCents: number;
  method: PaymentMethodDto;
}

export interface PaymentIntentDto {
  id: string;
  onboardingId: string;
  clientName: string;
  clientPhone?: string;
  clientEmail?: string;
  concept: string;
  amountCents: number;
  method: PaymentMethodDto;
  status: PaymentStatusDto;
  paymentLinkUrl?: string;
  codiQrId?: string;
  codiQrString?: string;
  codiQrImage?: string;
  reminderCount: number;
  lastReminderSentAt?: string;
  createdAt: string;
  settledAt?: string;
}

export interface ClientBalanceDto {
  clientName: string;
  clientPhone?: string;
  clientEmail?: string;
  settledAmountCents: number;
  pendingAmountCents: number;
  pendingCount: number;
}

export interface ApiErrorResponse {
  message: string;
  errors?: Record<string, string>;
}
