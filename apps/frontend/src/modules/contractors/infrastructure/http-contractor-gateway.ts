import type { ListContractorsResponse } from '@platform/contracts';
import type { ContractorGateway } from '../application/contractor-gateway';

export const httpContractorGateway: ContractorGateway = {
  async list(signal) {
    const response = await fetch('/api/contractors', { signal });
    if (!response.ok) throw new Error('No fue posible cargar los contratistas');
    const data: ListContractorsResponse = await response.json();
    return data.contractors.map(({ id, name, specialty }) => ({ id, name, specialty }));
  },
};
