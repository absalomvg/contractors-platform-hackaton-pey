import type {
  ChargeField,
  ChargesQuery,
  CustomerRowDto,
  CustomerStanding,
  DashboardChargeDto,
  DashboardErrorCode,
  DashboardProfileDto,
  DashboardSummaryDto,
  PaymentMethod,
  UpdateDashboardChargeRequest,
} from '@platform/contracts';
import {
  DashboardApiError,
  type DashboardGateway,
  type NewChargeInput,
  type PaymentsGateway,
} from '../application/dashboard-gateway';
import {
  AMOUNT_MAX_CENTS,
  AMOUNT_MIN_CENTS,
  CONCEPT_MAX_LENGTH,
  DASHBOARD_TIMEZONE,
  MANUAL_PAYMENT_METHODS,
  MAX_TAGS,
  NOTE_MAX_LENGTH,
  TAG_MAX_LENGTH,
  todayInMexico,
} from '../domain/dashboard';

/*
 * In-memory implementation of the dashboard contract, used while the charges
 * module does not exist. It applies the same rules the backend must enforce:
 * optimistic concurrency (`version`), editable fields per status, and which
 * charges can be paid or cancelled.
 */

export const MOCK_CONTRACTOR_ID = 'demo';

const EDITABLE_FIELDS: Record<DashboardChargeDto['status'], ChargeField[]> = {
  pending: ['concept', 'dueDate', 'amountCents', 'note', 'tags'],
  paid: ['note', 'tags'],
  cancelled: ['note', 'tags'],
};
const ALL_METHODS: PaymentMethod[] = ['codi', 'card', 'cash', 'transfer', 'other'];
const CARD_FEE = { feeRate: 0.036, fixedFeeCents: 300, vatRate: 0.16 };
const FREE_PLAN_CUSTOMER_LIMIT = 5;
const MAX_TOP_DEBTORS = 5;
const DAY_MS = 86_400_000;

const MESSAGES = {
  chargeNotFound: 'No se encontró el cobro.',
  invalidCharge: 'Revisa los datos del cobro.',
  versionConflict: 'El cobro cambió mientras lo editabas. Revisa la versión actual.',
  fieldNotEditable: 'Este dato ya no se puede modificar.',
  chargeNotPayable: 'Este cobro ya está pagado o cancelado.',
  chargeNotCancellable: 'Solo puedes cancelar cobros pendientes.',
} as const;

interface MockCustomer {
  readonly customerId: string;
  readonly name: string;
  readonly phone: string;
  readonly email: string;
}

type StoredCharge = Omit<DashboardChargeDto, 'overdue' | 'editableFields' | 'customerName'>;

function addDays(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}
const instant = (date: string, time = '17:00:00') => `${date}T${time}-06:00`;
const daysBetween = (from: string, to: string) => Math.round((Date.parse(to) - Date.parse(from)) / DAY_MS);

/** Five records, one per state the dashboard must render. */
function seed(today: string): { customers: MockCustomer[]; charges: StoredCharge[] } {
  const customers: MockCustomer[] = [
    { customerId: 'cus_mateo', name: 'Mateo Hernández', phone: '5541238910', email: 'mateo@ejemplo.mx' },
    { customerId: 'cus_sofia', name: 'Sofía Ramírez', phone: '5587654321', email: 'sofia@ejemplo.mx' },
    { customerId: 'cus_diego', name: 'Diego Castellanos', phone: '5533445566', email: 'diego@ejemplo.mx' },
    { customerId: 'cus_lucia', name: 'Lucía Mendoza', phone: '5599887766', email: 'lucia@ejemplo.mx' },
    { customerId: 'cus_andres', name: 'Andrés Villalobos', phone: '5522334455', email: 'andres@ejemplo.mx' },
  ];
  const base = (id: string, customerId: string, concept: string, amountCents: number, createdDaysAgo: number, dueInDays: number): StoredCharge => ({
    chargeId: id,
    version: 1,
    customerId,
    concept,
    amountCents,
    dueDate: addDays(today, dueInDays),
    status: 'pending',
    createdAt: instant(addDays(today, -createdDaysAgo), '09:00:00'),
    updatedAt: instant(addDays(today, -createdDaysAgo), '09:00:00'),
    paidAt: null,
    paymentMethod: null,
    cancelledAt: null,
    reminderCount: 0,
    note: null,
    tags: [],
  });
  const charges: StoredCharge[] = [
    // 1. Pending, due in a few days.
    { ...base('ch_001', 'cus_mateo', 'Mensualidad', 85_000, 2, 6), tags: ['mensualidad'] },
    // 2. Pending and overdue, two reminders sent.
    { ...base('ch_002', 'cus_sofia', 'Mensualidad anterior', 85_000, 20, -9), reminderCount: 2, tags: ['mensualidad'] },
    // 3. Paid through pey (CoDi).
    {
      ...base('ch_003', 'cus_diego', 'Clase individual', 90_000, 8, -1),
      status: 'paid',
      paidAt: instant(addDays(today, -3), '12:30:00'),
      paymentMethod: 'codi',
      version: 2,
      updatedAt: instant(addDays(today, -3), '12:30:00'),
    },
    // 4. Paid by hand (cash), recorded by the business.
    {
      ...base('ch_004', 'cus_lucia', 'Uniforme e inscripción', 120_000, 10, -4),
      status: 'paid',
      paidAt: instant(addDays(today, -5), '18:10:00'),
      paymentMethod: 'cash',
      reminderCount: 1,
      note: 'Pagó en efectivo al terminar la clase.',
      version: 2,
      updatedAt: instant(addDays(today, -5), '18:10:00'),
    },
    // 5. Cancelled by the business.
    {
      ...base('ch_005', 'cus_andres', 'Clínica sabatina', 35_000, 12, -2),
      status: 'cancelled',
      cancelledAt: instant(addDays(today, -6), '10:00:00'),
      note: 'Se suspendió la clínica por lluvia.',
      version: 2,
      updatedAt: instant(addDays(today, -6), '10:00:00'),
    },
  ];
  return { customers, charges };
}

const MOCK_PROFILE: DashboardProfileDto = {
  contractorId: MOCK_CONTRACTOR_ID,
  name: 'Carlos Morales',
  profession: 'Profesor de básquetbol',
  business: {
    name: 'Academia Hoops',
    activity: 'Deportes y entrenamiento',
    rfc: 'MOCC880101AB1',
    taxRegime: 'RESICO',
    taxpayerType: 'individual',
    clabeLast4: '7771',
  },
  firstCustomer: { name: 'Mateo Hernández', phone: '5541238910', email: 'mateo@ejemplo.mx' },
  onboarding: { status: 'complete', pendingFields: [] },
};

function fail(status: number, message: string, code?: DashboardErrorCode, fields?: Record<string, string>): never {
  throw new DashboardApiError(message, status, code, fields);
}

const normalize = (value: string) => value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

export interface MockDashboard extends DashboardGateway, PaymentsGateway {
  /** Simulates the pey webhook paying the oldest pending charge with CoDi. */
  simulateProviderPayment(): string | null;
  /** Simulates another device editing a charge, so the next write gets 409. */
  simulateConcurrentEdit(chargeId: string): void;
  reset(): void;
}

export function createMockDashboard(): MockDashboard {
  let state = seed(todayInMexico());
  let sequence = state.charges.length;

  const today = () => todayInMexico();
  const now = () => new Date().toISOString();
  const customerName = (id: string) => state.customers.find((c) => c.customerId === id)?.name ?? 'Cliente';
  const isOverdue = (charge: StoredCharge) => charge.status === 'pending' && charge.dueDate < today();

  function view(charge: StoredCharge): DashboardChargeDto {
    return {
      ...charge,
      tags: [...charge.tags],
      customerName: customerName(charge.customerId),
      overdue: isOverdue(charge),
      editableFields: [...EDITABLE_FIELDS[charge.status]],
    };
  }

  function find(chargeId: string): StoredCharge {
    return state.charges.find((charge) => charge.chargeId === chargeId) ?? fail(404, MESSAGES.chargeNotFound);
  }

  function checkVersion(charge: StoredCharge, version: number) {
    if (charge.version !== version) fail(409, MESSAGES.versionConflict, 'version_conflict');
  }

  function save(next: StoredCharge): DashboardChargeDto {
    const stored = { ...next, version: next.version + 1, updatedAt: now() };
    state.charges = state.charges.map((charge) => (charge.chargeId === stored.chargeId ? stored : charge));
    return view(stored);
  }

  function validate(body: UpdateDashboardChargeRequest) {
    const errors: Record<string, string> = {};
    if (body.concept !== undefined && (!body.concept.trim() || body.concept.trim().length > CONCEPT_MAX_LENGTH)) {
      errors.concept = `Usa entre 1 y ${CONCEPT_MAX_LENGTH} caracteres.`;
    }
    if (body.amountCents !== undefined && (!Number.isInteger(body.amountCents) || body.amountCents < AMOUNT_MIN_CENTS || body.amountCents > AMOUNT_MAX_CENTS)) {
      errors.amountCents = 'Ingresa un monto válido.';
    }
    if (body.dueDate !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(body.dueDate)) errors.dueDate = 'Usa el formato AAAA-MM-DD.';
    if (body.note && body.note.length > NOTE_MAX_LENGTH) errors.note = `Usa como máximo ${NOTE_MAX_LENGTH} caracteres.`;
    if (body.tags && (body.tags.length > MAX_TAGS || body.tags.some((tag) => tag.length > TAG_MAX_LENGTH))) {
      errors.tags = `Hasta ${MAX_TAGS} etiquetas de ${TAG_MAX_LENGTH} caracteres.`;
    }
    if (Object.keys(errors).length) fail(422, MESSAGES.invalidCharge, undefined, errors);
  }

  function rows(): CustomerRowDto[] {
    return state.customers.map((customer) => {
      const own = state.charges.filter((charge) => charge.customerId === customer.customerId);
      const pending = own.filter((charge) => charge.status === 'pending');
      const overdue = pending.filter(isOverdue);
      const upcoming = pending.filter((charge) => !isOverdue(charge)).map((charge) => charge.dueDate).sort();
      const lastPaid = own
        .filter((charge) => charge.status === 'paid')
        .sort((a, b) => (b.paidAt ?? '').localeCompare(a.paidAt ?? ''))[0];
      const standing: CustomerStanding = overdue.length ? 'overdue' : pending.length ? 'pending' : 'up_to_date';
      return {
        customerId: customer.customerId,
        name: customer.name,
        standing,
        balance: {
          outstandingCents: pending.reduce((sum, charge) => sum + charge.amountCents, 0),
          overdueCents: overdue.reduce((sum, charge) => sum + charge.amountCents, 0),
        },
        lastPayment: lastPaid ? { amountCents: lastPaid.amountCents, paidAt: lastPaid.paidAt!, method: lastPaid.paymentMethod! } : null,
        nextDueDate: upcoming[0] ?? null,
        oldestDueDate: overdue.map((charge) => charge.dueDate).sort()[0] ?? null,
      };
    });
  }

  const gateway: MockDashboard = {
    async profile(contractorId) {
      return { ...MOCK_PROFILE, contractorId };
    },

    async summary(contractorId, query = {}) {
      const to = query.to ?? today();
      const from = query.from ?? `${to.slice(0, 8)}01`;
      const inPeriod = (date: string | null) => !!date && date.slice(0, 10) >= from && date.slice(0, 10) <= to;
      const paid = state.charges.filter((charge) => charge.status === 'paid' && inPeriod(charge.paidAt));
      const issued = state.charges.filter((charge) => charge.status !== 'cancelled' && inPeriod(charge.createdAt));
      const pending = state.charges.filter((charge) => charge.status === 'pending');
      const overdue = pending.filter(isOverdue);
      const sum = (list: StoredCharge[]) => list.reduce((total, charge) => total + charge.amountCents, 0);
      const customersOf = (list: StoredCharge[]) => new Set(list.map((charge) => charge.customerId)).size;
      const codi = paid.filter((charge) => charge.paymentMethod === 'codi');
      const debtors = rows()
        .filter((row) => row.balance.overdueCents > 0)
        .sort((a, b) => b.balance.overdueCents - a.balance.overdueCents)
        .slice(0, MAX_TOP_DEBTORS);
      return {
        contractorId,
        period: { from, to, timezone: DASHBOARD_TIMEZONE },
        currency: 'MXN',
        generatedAt: now(),
        collected: { amountCents: sum(paid), count: paid.length, changePercent: null },
        outstanding: { amountCents: sum(pending), count: pending.length, customerCount: customersOf(pending) },
        overdue: {
          amountCents: sum(overdue),
          count: overdue.length,
          customerCount: customersOf(overdue),
          oldestDaysOverdue: overdue.length ? Math.max(...overdue.map((charge) => daysBetween(charge.dueDate, today()))) : null,
        },
        collectionRate: {
          ratio: issued.length ? issued.filter((charge) => charge.status === 'paid').length / issued.length : null,
          paidCount: issued.filter((charge) => charge.status === 'paid').length,
          issuedCount: issued.length,
        },
        averageDaysToPay: paid.length
          ? paid.reduce((total, charge) => total + daysBetween(charge.createdAt.slice(0, 10), charge.paidAt!.slice(0, 10)), 0) / paid.length
          : null,
        reminders: {
          sent: state.charges.reduce((total, charge) => total + charge.reminderCount, 0),
          paidWithoutReminderRatio: paid.length ? paid.filter((charge) => charge.reminderCount === 0).length / paid.length : null,
        },
        commissionSavings: {
          amountCents: Math.round(codi.reduce((total, charge) => total + (charge.amountCents * CARD_FEE.feeRate + CARD_FEE.fixedFeeCents) * (1 + CARD_FEE.vatRate), 0)),
          assumption: CARD_FEE,
        },
        paymentMethods: ALL_METHODS.map((method) => {
          const list = paid.filter((charge) => charge.paymentMethod === method);
          return { method, amountCents: sum(list), count: list.length };
        }),
        customers: { active: state.customers.length, plan: 'free', limit: FREE_PLAN_CUSTOMER_LIMIT },
        topDebtors: debtors.map((row) => ({
          customerId: row.customerId,
          name: row.name,
          amountCents: row.balance.overdueCents,
          overdueCount: state.charges.filter((charge) => charge.customerId === row.customerId && isOverdue(charge)).length,
          oldestDueDate: row.oldestDueDate!,
        })),
      } satisfies DashboardSummaryDto;
    },

    async charges(_contractorId, query: ChargesQuery = {}) {
      const term = query.search ? normalize(query.search) : '';
      const list = state.charges
        .filter((charge) => !query.status || charge.status === query.status)
        .filter((charge) => query.overdue === undefined || isOverdue(charge) === query.overdue)
        .filter((charge) => !query.customerId || charge.customerId === query.customerId)
        .filter((charge) => !query.tag || charge.tags.includes(query.tag))
        .filter((charge) => !term || normalize(charge.concept).includes(term) || normalize(customerName(charge.customerId)).includes(term))
        .sort((a, b) => {
          if (query.sort === 'amount') return b.amountCents - a.amountCents;
          if (query.sort === 'created') return b.createdAt.localeCompare(a.createdAt);
          return a.dueDate.localeCompare(b.dueDate);
        })
        .map(view);
      return {
        charges: list,
        totals: { count: list.length, amountCents: list.reduce((total, charge) => total + charge.amountCents, 0) },
        nextCursor: null,
      };
    },

    async customers(_contractorId, query = {}) {
      const term = query.search ? normalize(query.search) : '';
      const all = rows().filter((row) => !term || normalize(row.name).includes(term));
      return {
        customers: all.filter((row) => !query.standing || row.standing === query.standing),
        counts: {
          all: all.length,
          overdue: all.filter((row) => row.standing === 'overdue').length,
          pending: all.filter((row) => row.standing === 'pending').length,
          upToDate: all.filter((row) => row.standing === 'up_to_date').length,
        },
        nextCursor: null,
      };
    },

    async updateCharge(_contractorId, chargeId, body) {
      const charge = find(chargeId);
      checkVersion(charge, body.version);
      const { version: _version, ...changes } = body;
      for (const field of Object.keys(changes) as ChargeField[]) {
        if (changes[field] !== undefined && !EDITABLE_FIELDS[charge.status].includes(field)) {
          fail(422, MESSAGES.fieldNotEditable, 'field_not_editable', { [field]: MESSAGES.fieldNotEditable });
        }
      }
      validate(body);
      return save({
        ...charge,
        concept: changes.concept?.trim() ?? charge.concept,
        dueDate: changes.dueDate ?? charge.dueDate,
        amountCents: changes.amountCents ?? charge.amountCents,
        note: changes.note === undefined ? charge.note : changes.note?.trim() || null,
        tags: changes.tags ?? charge.tags,
      });
    },

    async recordManualPayment(_contractorId, chargeId, body) {
      const charge = find(chargeId);
      checkVersion(charge, body.version);
      if (charge.status !== 'pending') fail(409, MESSAGES.chargeNotPayable, 'charge_not_payable');
      if (!MANUAL_PAYMENT_METHODS.includes(body.method)) fail(422, MESSAGES.invalidCharge, undefined, { method: 'Elige un método válido.' });
      return save({
        ...charge,
        status: 'paid',
        paymentMethod: body.method,
        paidAt: body.paidAt ?? now(),
        note: body.note?.trim() || charge.note,
      });
    },

    async cancelCharge(_contractorId, chargeId, body) {
      const charge = find(chargeId);
      checkVersion(charge, body.version);
      if (charge.status !== 'pending') fail(409, MESSAGES.chargeNotCancellable, 'charge_not_cancellable');
      return save({ ...charge, status: 'cancelled', cancelledAt: now(), note: body.reason?.trim() || charge.note });
    },

    async createCharge(_contractorId, input: NewChargeInput) {
      sequence += 1;
      const created: StoredCharge = {
        chargeId: `ch_${String(sequence).padStart(3, '0')}`,
        version: 1,
        customerId: input.customerId,
        concept: input.concept,
        amountCents: input.amountCents,
        dueDate: input.dueDate,
        status: 'pending',
        createdAt: now(),
        updatedAt: now(),
        paidAt: null,
        paymentMethod: null,
        cancelledAt: null,
        reminderCount: 0,
        note: null,
        tags: [],
      };
      state.charges = [created, ...state.charges];
      return view(created);
    },

    async sendReminder(_contractorId, chargeId) {
      const charge = find(chargeId);
      if (charge.status !== 'pending') fail(409, MESSAGES.chargeNotPayable, 'charge_not_payable');
      return save({ ...charge, reminderCount: charge.reminderCount + 1 });
    },

    simulateProviderPayment() {
      const next = state.charges
        .filter((charge) => charge.status === 'pending')
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];
      if (!next) return null;
      save({ ...next, status: 'paid', paymentMethod: 'codi', paidAt: now() });
      return next.chargeId;
    },

    simulateConcurrentEdit(chargeId) {
      const charge = find(chargeId);
      state.charges = state.charges.map((item) =>
        item.chargeId === chargeId ? { ...charge, version: charge.version + 1, updatedAt: now() } : item,
      );
    },

    reset() {
      state = seed(todayInMexico());
      sequence = state.charges.length;
    },
  };
  return gateway;
}

export function mockCustomers(): readonly MockCustomer[] {
  return seed(todayInMexico()).customers;
}
