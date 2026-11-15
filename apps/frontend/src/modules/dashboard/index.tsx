import type { UpdateOnboardingProfileRequest } from '@platform/contracts';
import type { DashboardGateway } from './application/dashboard-gateway';
import { httpDashboardGateway } from './infrastructure/http-dashboard-gateway';
import { createMockDashboard } from './infrastructure/mock-dashboard-gateway';
import { DashboardWorkspace as Workspace } from './presentation/DashboardWorkspace';

const mock = createMockDashboard();

/**
 * The backend implements only GET /profile today. The rest of the dashboard,
 * customers directory, and payments contract runs on the persistent local
 * adapter synced with the onboarding `firstCustomer`; swap each method for
 * httpDashboardGateway as backend modules ship.
 */
const gateway: DashboardGateway = { ...mock, profile: httpDashboardGateway.profile };

interface DashboardWorkspaceProps {
  readonly contractorId: string;
  readonly preloadDemo?: boolean;
  /** Called when the backend does not know the contractor or rejects the session (401/403/404). */
  readonly onNotFound: () => void;
  readonly onSignOut: () => void;
  readonly onUpdateProfile?: (patch: UpdateOnboardingProfileRequest) => Promise<void>;
}

export function DashboardWorkspace({
  contractorId,
  preloadDemo = false,
  onNotFound,
  onSignOut,
  onUpdateProfile,
}: DashboardWorkspaceProps) {
  if (preloadDemo) {
    mock.preloadDemoData(contractorId);
  }
  return (
    <Workspace
      gateway={gateway}
      payments={mock}
      customersDirectory={mock}
      demo={mock}
      contractorId={contractorId}
      onNotFound={onNotFound}
      onSignOut={onSignOut}
      onUpdateProfile={onUpdateProfile}
    />
  );
}
