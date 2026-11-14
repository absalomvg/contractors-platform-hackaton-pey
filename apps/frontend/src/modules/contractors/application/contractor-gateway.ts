import type { Contractor } from '../domain/contractor';

export interface ContractorGateway {
  list(signal?: AbortSignal): Promise<Contractor[]>;
}
