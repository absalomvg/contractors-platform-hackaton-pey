import { useEffect } from 'react';
import { DashboardWorkspace } from '../modules/dashboard';
import { OnboardingForm } from '../modules/onboarding';
import { dashboardPath, navigate, ROUTES, useRoute } from './router';
import { clearSession, readSession, saveSession } from './session';

function Redirect({ to }: { to: string }) {
  useEffect(() => navigate(to, { replace: true }), [to]);
  return null;
}

export function App() {
  const route = useRoute();

  function handleRegistered(contractorId: string) {
    saveSession(contractorId);
    navigate(dashboardPath(contractorId));
  }

  function handleSignOut() {
    clearSession();
    navigate(ROUTES.onboarding);
  }

  switch (route.name) {
    case 'onboarding':
      return (
        <main>
          <h1>Plataforma de contratistas</h1>
          <OnboardingForm onCreated={handleRegistered} />
        </main>
      );
    case 'dashboard':
      return (
        <main>
          <DashboardWorkspace
            key={route.contractorId}
            contractorId={route.contractorId}
            onNotFound={handleSignOut}
            onSignOut={handleSignOut}
          />
        </main>
      );
    case 'root':
    case 'notFound': {
      // Dashboard only after onboarding: without a session, register first.
      const contractorId = readSession();
      return <Redirect to={contractorId ? dashboardPath(contractorId) : ROUTES.onboarding} />;
    }
  }
}
