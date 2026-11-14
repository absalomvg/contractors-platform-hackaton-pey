/* Mexican phone helpers shared by onboarding and dashboard (technical utility). */

/** Mexican mobile numbers have 10 digits; pey CoDi requires exactly that. */
export const MX_PHONE_DIGITS = 10;
const MX_COUNTRY_CODE = '52';

/** Keeps up to 10 national digits; drops a pasted +52 / 52 prefix. */
export function mxPhoneDigits(value: string): string {
  let digits = value.replace(/\D/g, '');
  if (digits.length > MX_PHONE_DIGITS && digits.startsWith(MX_COUNTRY_CODE)) digits = digits.slice(MX_COUNTRY_CODE.length);
  return digits.slice(0, MX_PHONE_DIGITS);
}

/** "5541238910" → "55 4123 8910" (partial input is formatted as typed). */
export function formatMxPhone(digits: string): string {
  return [digits.slice(0, 2), digits.slice(2, 6), digits.slice(6, 10)].filter(Boolean).join(' ');
}
