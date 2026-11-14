import { MX_PHONE_DIGITS } from '../../../shared/phone';

export { MX_PHONE_DIGITS, formatMxPhone, mxPhoneDigits } from '../../../shared/phone';

export interface OnboardingInput {
  name: string;
  profession: string;
  client: { name: string; phone: string; email: string };
  taxRegime?: string;
  businessName: string;
  businessActivity: string;
  rfc: string;
  clabe: string;
}

export interface Onboarding extends OnboardingInput {
  id: string;
}

/** Common activities of the platform's micro-businesses. The API stores the
 * label as free text (`businessActivity`), so the list can grow freely. */
export const BUSINESS_ACTIVITIES = [
  'Educación y clases particulares',
  'Deportes y entrenamiento',
  'Salud y bienestar',
  'Belleza y estética',
  'Construcción y remodelación',
  'Electricidad y plomería',
  'Reparación y mantenimiento',
  'Limpieza y servicios del hogar',
  'Alimentos y bebidas',
  'Comercio y abarrotes',
  'Diseño, fotografía y creatividad',
  'Tecnología y soporte',
  'Consultoría y servicios profesionales',
  'Transporte y mensajería',
  'Cuidado de mascotas',
] as const;

/** Select value that reveals a free-text activity. */
export const OTHER_BUSINESS_ACTIVITY = 'Otro';

export type FieldErrors = Record<string, string>;

export function validateOnboarding(input: OnboardingInput): FieldErrors {
  const errors: FieldErrors = {};
  const required = {
    name: input.name,
    profession: input.profession,
    'client.name': input.client.name,
    'client.phone': input.client.phone,
    'client.email': input.client.email,
    businessName: input.businessName,
    businessActivity: input.businessActivity,
    rfc: input.rfc,
    clabe: input.clabe,
  };
  for (const [field, value] of Object.entries(required)) {
    if (!value.trim()) errors[field] = 'Este campo es obligatorio.';
    else if (value.length > 255) errors[field] = 'Usa un máximo de 255 caracteres.';
  }
  if (input.client.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.client.email)) {
    errors['client.email'] = 'Escribe un email válido.';
  }
  if (input.client.phone && !/^\d{10}$/.test(input.client.phone)) {
    errors['client.phone'] = `Escribe un teléfono de ${MX_PHONE_DIGITS} dígitos.`;
  }
  if (input.rfc && !/^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/.test(input.rfc)) {
    errors.rfc = 'Escribe un RFC de 12 o 13 caracteres con formato válido.';
  }
  if (input.clabe && !isValidClabe(input.clabe)) {
    errors.clabe = 'Escribe una CLABE válida de 18 dígitos.';
  }
  if (input.taxRegime && input.taxRegime.length > 255) errors.taxRegime = 'Usa un máximo de 255 caracteres.';
  return errors;
}

const CLABE_WEIGHTS = [3, 7, 1];

/** 18 digits whose last one is the Banxico check digit (weights 3, 7, 1). */
export function isValidClabe(clabe: string): boolean {
  if (!/^\d{18}$/.test(clabe)) return false;
  const sum = [...clabe.slice(0, 17)].reduce((total, digit, index) => total + (Number(digit) * CLABE_WEIGHTS[index % 3]!) % 10, 0);
  return Number(clabe[17]) === (10 - (sum % 10)) % 10;
}

export function normalizeClabe(value: string): string {
  return value.replace(/[\s-]/g, '');
}

export type OnboardingStepNumber = 1 | 2 | 3;

export const ONBOARDING_STEP_FIELDS: Record<OnboardingStepNumber, readonly string[]> = {
  1: ['name', 'profession'],
  2: ['businessName', 'businessActivity', 'rfc', 'taxRegime', 'clabe'],
  3: ['client.name', 'client.phone', 'client.email'],
};

/** Validates only the specified onboarding fields by reusing full domain rules. */
export function validateOnboardingStep(
  input: OnboardingInput,
  fields: readonly string[],
): FieldErrors {
  const allErrors = validateOnboarding(input);
  const scoped: FieldErrors = {};
  for (const field of fields) {
    if (allErrors[field]) {
      scoped[field] = allErrors[field];
    }
  }
  return scoped;
}

/** Returns the earliest step index (1-3) containing a validation error. */
export function findFirstErrorStep(errors: FieldErrors): OnboardingStepNumber {
  const keys = Object.keys(errors);
  for (const step of [1, 2, 3] as const) {
    if (ONBOARDING_STEP_FIELDS[step].some((field) => keys.includes(field))) {
      return step;
    }
  }
  return 1;
}
