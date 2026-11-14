import type { ContractorProfile, CustomerRecord } from '../domain/dashboard';

export interface RemoteDashboardProfile {
  readonly profile: ContractorProfile;
  readonly firstCustomer: CustomerRecord;
}

export interface DashboardGateway {
  fetchProfile(contractorId: string, signal?: AbortSignal): Promise<RemoteDashboardProfile>;
}
