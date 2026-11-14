import { httpDashboardGateway } from './infrastructure/http-dashboard-gateway';
import { DashboardWorkspace as Workspace } from './presentation/DashboardWorkspace';

export function DashboardWorkspace({ contractorId }: { contractorId?: string }) {
  return <Workspace gateway={httpDashboardGateway} contractorId={contractorId} />;
}
