import { ContractorsPage } from '../modules/contractors';
import { DashboardWorkspace } from '../modules/dashboard';
import { OnboardingForm } from '../modules/onboarding';

export function App() {
  return (
    <main>
      <h1>Plataforma de contratistas</h1>
      <OnboardingForm />
      <DashboardWorkspace />
      <ContractorsPage />
    </main>
  );
}
