import type { DashboardGateway } from './application/dashboard-gateway';
import { httpDashboardGateway } from './infrastructure/http-dashboard-gateway';
import { createMockDashboard, mockCustomers } from './infrastructure/mock-dashboard-gateway';
import { DashboardWorkspace as Workspace } from './presentation/DashboardWorkspace';

const mock = createMockDashboard();
const customerPhones = Object.fromEntries(mockCustomers().map((customer) => [customer.customerId, customer.phone]));

/**
 * The backend implements only GET /profile today. The rest of the dashboard
 * contract is served by the in-memory mock (5 sample charges) until the charges
 * module exists; swap each method for httpDashboardGateway as it ships.
 */
const gateway: DashboardGateway = { ...mock, profile: httpDashboardGateway.profile };

interface DashboardWorkspaceProps {
  readonly contractorId: string;
  /** Called when the backend does not know the contractor (404). */
  readonly onNotFound: () => void;
  readonly onSignOut: () => void;
}

export function DashboardWorkspace({ contractorId, onNotFound, onSignOut }: DashboardWorkspaceProps) {
  return (
    <Workspace
      gateway={gateway}
      payments={mock}
      demo={mock}
      contractorId={contractorId}
      customerPhones={customerPhones}
      onNotFound={onNotFound}
      onSignOut={onSignOut}
    />
  );
}
