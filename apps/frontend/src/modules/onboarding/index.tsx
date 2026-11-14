import { httpOnboardingGateway } from './infrastructure/http-onboarding-gateway';
import { OnboardingForm as Form } from './presentation/OnboardingForm';

export function OnboardingForm() {
  return <Form gateway={httpOnboardingGateway} />;
}
