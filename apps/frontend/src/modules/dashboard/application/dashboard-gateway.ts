import type {
  CancelChargeRequest,
  ChargesQuery,
  CustomerRowDto,
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
import type { CustomerProfileRecord, NewCustomerInput } from '../domain/dashboard';

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

/** Customer creation, business profile editing, and full directory lookup. */
export interface CustomersDirectoryGateway {
  createCustomer(contractorId: string, input: NewCustomerInput): Promise<CustomerRowDto>;
  updateCustomer(contractorId: string, customerId: string, input: NewCustomerInput): Promise<CustomerRowDto>;
  listDetails(contractorId: string): Record<string, CustomerProfileRecord>;
  listPhones(contractorId: string): Record<string, string>;
  syncFirstCustomer(contractorId: string, firstCustomer: { name: string; phone: string; email: string }): void;
}

/**
 * Operations owned by the payments module (docs/workflow.md: POST /api/payments,
 * /remind and the pey webhook). Not part of the dashboard contract; the
 * prototype uses a local gateway until that module exposes them.
 */
export interface PaymentsGateway {
  createCharge(contractorId: string, input: NewChargeInput): Promise<CreatedChargeResult>;
  sendReminder(contractorId: string, chargeId: string): Promise<DashboardChargeDto>;
}

export interface NewChargeInput {
  readonly customerId: string;
  readonly concept: string;
  readonly amountCents: number;
  readonly dueDate: string;
  readonly method: PaymentMethodDto;
}

export interface CreatedChargeResult {
  readonly charge: DashboardChargeDto;
  readonly method: PaymentMethodDto;
  readonly paymentLinkUrl?: string;
  readonly codiQrString?: string;
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
