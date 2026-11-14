import type { ApiErrorResponse, CreateOnboardingRequest, OnboardingDto } from '@platform/contracts';
import { OnboardingError, type OnboardingGateway } from '../application/onboarding-gateway';

export const httpOnboardingGateway: OnboardingGateway = {
  async create(input) {
    const payload: CreateOnboardingRequest = { ...input, client: { ...input.client } };
    const response = await fetch('/api/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      let error: ApiErrorResponse;
      try {
        error = await response.json();
      } catch {
        throw new OnboardingError('No fue posible guardar el registro. Inténtalo de nuevo.');
      }
      throw new OnboardingError(error.message, error.errors);
    }
    const data: OnboardingDto = await response.json();
    return { ...data, client: { ...data.client } };
  },
};
