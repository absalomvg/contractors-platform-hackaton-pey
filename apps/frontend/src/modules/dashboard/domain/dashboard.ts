import type {
  ChargeField,
  ChargesQuery,
  ChargeStatus,
  CustomerStanding,
  DashboardChargeDto,
  ManualPaymentMethod,
  PaymentMethod,
} from '@platform/contracts';

/* Values fixed by the dashboard contract (docs/dashboard-api.md). */
export const CONCEPT_MAX_LENGTH = 40;
export const NOTE_MAX_LENGTH = 500;
export const MAX_TAGS = 10;
export const TAG_MAX_LENGTH = 30;
export const AMOUNT_MIN_CENTS = 1;
export const AMOUNT_MAX_CENTS = 100_000_000;
export const SEARCH_MIN_LENGTH = 2;
export const DASHBOARD_TIMEZONE = 'America/Mexico_City';

export const MANUAL_PAYMENT_METHODS: readonly ManualPaymentMethod[] = ['cash', 'transfer', 'other'];

export type ViewportMode = 'desktop' | 'mobile';
export type DashboardScreen = 'dashboard' | 'clients' | 'payment' | 'workflow' | 'profile';

/** Table tabs. Each maps to a ChargesQuery of the contract. */
export type ChargeFilter = 'all' | 'pending' | 'overdue' | 'paid' | 'cancelled';

export const CHARGE_FILTERS: readonly { readonly id: ChargeFilter; readonly label: string }[] = [
  { id: 'all', label: 'Todos' },
  { id: 'pending', label: '⏳ Pendientes' },
  { id: 'overdue', label: '⚠ Vencidos' },
  { id: 'paid', label: '✓ Pagados' },
  { id: 'cancelled', label: '✕ Cancelados' },
];

export function chargesQueryFor(filter: ChargeFilter, search: string): ChargesQuery {
  const query: ChargesQuery = {};
  if (filter === 'overdue') query.overdue = true;
  else if (filter !== 'all') query.status = filter;
  const term = search.trim();
  if (term.length >= SEARCH_MIN_LENGTH) query.search = term;
  return query;
}

/** Visual state of a charge: `overdue` is a flag on pending charges, not a status. */
export type ChargeBadge = 'pending' | 'overdue' | 'paid' | 'cancelled';

export function chargeBadge(charge: Pick<DashboardChargeDto, 'status' | 'overdue'>): ChargeBadge {
  if (charge.status === 'pending' && charge.overdue) return 'overdue';
  return charge.status;
}

export const CHARGE_BADGE_LABELS: Record<ChargeBadge, string> = {
  pending: '⏳ Pendiente',
  overdue: '⚠ Vencido',
  paid: '✓ Pagado',
  cancelled: '✕ Cancelado',
};

export const CHARGE_STATUS_LABELS: Record<ChargeStatus, string> = {
  pending: 'Pendiente',
  paid: 'Pagado',
  cancelled: 'Cancelado',
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  codi: 'CoDi',
  card: 'Tarjeta',
  cash: 'Efectivo',
  transfer: 'Transferencia',
  other: 'Otro',
};

export const STANDING_LABELS: Record<CustomerStanding, string> = {
  overdue: 'Vencido',
  pending: 'Pendiente',
  up_to_date: 'Al día',
};

export const CHARGE_FIELD_LABELS: Record<ChargeField, string> = {
  concept: 'Concepto',
  dueDate: 'Fecha límite',
  amountCents: 'Monto',
  note: 'Nota privada',
  tags: 'Etiquetas',
};

export function canEdit(charge: DashboardChargeDto, field: ChargeField): boolean {
  return charge.editableFields.includes(field);
}

export function formatMxnCents(amountCents: number): string {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amountCents / 100);
}

/** Pesos typed by the user → integer cents, or null when invalid. */
export function pesosToCents(value: string): number | null {
  const pesos = Number(value);
  if (!Number.isFinite(pesos)) return null;
  const cents = Math.round(pesos * 100);
  return cents >= AMOUNT_MIN_CENTS && cents <= AMOUNT_MAX_CENTS ? cents : null;
}

/** Formats a contract date (YYYY-MM-DD) without shifting it across timezones. */
export function formatDate(date: string): string {
  const [year, month, day] = date.split('-').map(Number);
  return new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short', timeZone: 'UTC' }).format(
    new Date(Date.UTC(year!, month! - 1, day!)),
  );
}

export function formatInstant(instant: string): string {
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: DASHBOARD_TIMEZONE,
  }).format(new Date(instant));
}

/** Today as YYYY-MM-DD in the contract timezone. */
export function todayInMexico(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: DASHBOARD_TIMEZONE }).format(now);
}

export function parseTags(value: string): string[] {
  return [...new Set(value.split(',').map((tag) => tag.trim()).filter(Boolean))];
}
