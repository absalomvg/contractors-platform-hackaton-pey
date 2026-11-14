import { ContractorsPage as Page } from './presentation/ContractorsPage';
import { httpContractorGateway } from './infrastructure/http-contractor-gateway';

export function ContractorsPage() {
  return <Page gateway={httpContractorGateway} />;
}
