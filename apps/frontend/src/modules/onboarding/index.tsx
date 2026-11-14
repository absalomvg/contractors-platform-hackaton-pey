import { httpOnboardingGateway } from './infrastructure/http-onboarding-gateway';
import { OnboardingForm as Form } from './presentation/OnboardingForm';

export function OnboardingForm({ onCreated }: { onCreated?: (id: string) => void }) {
  return <Form gateway={httpOnboardingGateway} onCreated={onCreated} />;
}
