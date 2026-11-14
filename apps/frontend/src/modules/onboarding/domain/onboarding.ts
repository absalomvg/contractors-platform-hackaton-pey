export interface OnboardingInput {
  name: string;
  profession: string;
  client: { name: string; phone: string; email: string };
  taxRegime?: string;
  businessName: string;
  businessActivity: string;
  rfc: string;
}

export interface Onboarding extends OnboardingInput {
  id: string;
}

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
  };
  for (const [field, value] of Object.entries(required)) {
    if (!value.trim()) errors[field] = 'Este campo es obligatorio.';
    else if (value.length > 255) errors[field] = 'Usa un máximo de 255 caracteres.';
  }
  if (input.client.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.client.email)) {
    errors['client.email'] = 'Escribe un email válido.';
  }
  const phoneDigits = input.client.phone.replace(/\D/g, '');
  if (input.client.phone && (!/^\+?[0-9 ()-]+$/.test(input.client.phone) || phoneDigits.length < 7 || phoneDigits.length > 15)) {
    errors['client.phone'] = 'Escribe un teléfono de entre 7 y 15 dígitos.';
  }
  if (input.rfc && !/^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/.test(input.rfc)) {
    errors.rfc = 'Escribe un RFC de 12 o 13 caracteres con formato válido.';
  }
  if (input.taxRegime && input.taxRegime.length > 255) errors.taxRegime = 'Usa un máximo de 255 caracteres.';
  return errors;
}
