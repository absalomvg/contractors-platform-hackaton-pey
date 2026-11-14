import type {
  CancelChargeRequest,
  ChargesQuery,
  CustomersQuery,
  DashboardChargeDto,
  DashboardChargesDto,
  DashboardCustomersDto,
  DashboardErrorCode,
  DashboardProfileDto,
  DashboardSummaryDto,
  ManualPaymentRequest,
  PaymentMethodDto,
  PeriodQuery,
  UpdateDashboardChargeRequest,
} from '@platform/contracts';

/** Endpoints of the dashboard contract (/api/contractors/{contractorId}/dashboard/*). */
export interface DashboardGateway {
  profile(contractorId: string, signal?: AbortSignal): Promise<DashboardProfileDto>;
  summary(contractorId: string, query?: PeriodQuery, signal?: AbortSignal): Promise<DashboardSummaryDto>;
  charges(contractorId: string, query?: ChargesQuery, signal?: AbortSignal): Promise<DashboardChargesDto>;
  customers(contractorId: string, query?: CustomersQuery, signal?: AbortSignal): Promise<DashboardCustomersDto>;
  updateCharge(contractorId: string, chargeId: string, body: UpdateDashboardChargeRequest): Promise<DashboardChargeDto>;
  recordManualPayment(contractorId: string, chargeId: string, body: ManualPaymentRequest): Promise<DashboardChargeDto>;
  cancelCharge(contractorId: string, chargeId: string, body: CancelChargeRequest): Promise<DashboardChargeDto>;
}

/**
 * Operations owned by the payments module (docs/workflow.md: POST /api/payments,
 * /remind and the pey webhook). Not part of the dashboard contract; the
 * prototype uses a mock until that module exposes them.
 */
export interface PaymentsGateway {
  createCharge(contractorId: string, input: NewChargeInput): Promise<DashboardChargeDto>;
  sendReminder(contractorId: string, chargeId: string): Promise<DashboardChargeDto>;
}

/** Existing customer, or a new one created together with the charge. */
export type ChargeCustomerInput =
  | { readonly customerId: string }
  | { readonly name: string; readonly phone: string; readonly email?: string };

export interface NewChargeInput {
  readonly customer: ChargeCustomerInput;
  readonly concept: string;
  readonly amountCents: number;
  readonly dueDate: string;
  /** How pey collects it (CreatePaymentIntentRequest.method). */
  readonly method: PaymentMethodDto;
}

/** Error of a dashboard call. Branch on `code`, never on `message`. */
export class DashboardApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: DashboardErrorCode,
    readonly fields: Record<string, string> = {},
  ) {
    super(message);
    this.name = 'DashboardApiError';
  }
}
