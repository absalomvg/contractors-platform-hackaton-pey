import type { FieldErrors, Onboarding, OnboardingInput } from '../domain/onboarding';

export interface OnboardingGateway {
  create(input: OnboardingInput): Promise<Onboarding>;
}

export class OnboardingError extends Error {
  constructor(message: string, readonly fields: FieldErrors = {}) {
    super(message);
    this.name = 'OnboardingError';
  }
}
