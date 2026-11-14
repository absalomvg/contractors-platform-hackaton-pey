export type DeliveryChannel = 'PAYMENT_LINK' | 'CODI_QR';

export type ChargeStatus = 'PENDING_PAYMENT' | 'SETTLED' | 'EXPIRED';

export type FilterTab = 'ALL' | ChargeStatus;

export type ViewportMode = 'desktop' | 'mobile';

export type DashboardScreen = 'dashboard' | 'clients' | 'payment' | 'workflow' | 'profile';

export interface ServiceOption {
  readonly name: string;
  readonly feeCents: number;
}

export interface CustomerRecord {
  readonly id: string;
  readonly name: string;
  readonly phone: string;
  readonly email: string;
  readonly notes: string;
}

export interface ChargeRecord {
  readonly id: string;
  readonly customerId: string;
  readonly concept: string;
  readonly amountCents: number;
  readonly channel: DeliveryChannel;
  readonly status: ChargeStatus;
  readonly reminderCount: number;
  readonly lastReminderLabel: string;
  readonly dateLabel: string;
}

export interface ContractorProfile {
  readonly contractorId: string;
  readonly ownerName: string;
  readonly businessName: string;
  readonly profession: string;
  readonly businessActivity: string;
  readonly rfc: string;
  readonly taxRegime: string;
  readonly phone: string;
  readonly clabeLast4: string;
}

export interface DashboardPreset {
  readonly profile: ContractorProfile;
  readonly services: ServiceOption[];
  readonly customers: CustomerRecord[];
  readonly charges: ChargeRecord[];
}

export interface CustomerBalanceSummary {
  readonly customer: CustomerRecord;
  readonly pendingAmountCents: number;
  readonly settledAmountCents: number;
  readonly pendingCount: number;
}

export function formatMxnCents(amountCents: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(amountCents / 100);
}

export function computeCustomerBalances(
  customers: CustomerRecord[],
  charges: ChargeRecord[],
): CustomerBalanceSummary[] {
  return customers.map((customer) => {
    const customerCharges = charges.filter((charge) => charge.customerId === customer.id);
    const pendingCharges = customerCharges.filter((charge) => charge.status !== 'SETTLED');
    const settledCharges = customerCharges.filter((charge) => charge.status === 'SETTLED');
    return {
      customer,
      pendingAmountCents: pendingCharges.reduce((sum, item) => sum + item.amountCents, 0),
      settledAmountCents: settledCharges.reduce((sum, item) => sum + item.amountCents, 0),
      pendingCount: pendingCharges.length,
    };
  });
}

export const DASHBOARD_PRESETS: Record<'basket' | 'yoga' | 'english', DashboardPreset> = {
  basket: {
    profile: {
      contractorId: 'demo-basket',
      ownerName: 'Carlos Morales',
      businessName: 'Academia Hoops Basquetbol',
      profession: 'Profesor de Basquetbol',
      businessActivity: 'Deportes y Entrenamiento',
      rfc: 'MOCX880101AAA',
      taxRegime: 'RESICO',
      phone: '5512345678',
      clabeLast4: '4821',
    },
    services: [
      { name: 'Mensualidad Noviembre', feeCents: 85_000 },
      { name: 'Clínica de Tiro', feeCents: 45_000 },
      { name: 'Uniforme + Inscripción', feeCents: 120_000 },
    ],
    customers: [
      { id: 'cli_1', name: 'Mateo Hernández', phone: '5541238910', email: 'mateo.hoops@ejemplo.mx', notes: 'Juvenil · Mar/Jue 17:00' },
      { id: 'cli_2', name: 'Sofía Ramírez', phone: '5587654321', email: 'sofia.ramirez@ejemplo.mx', notes: 'Infantil · Lun/Mié 16:00' },
      { id: 'cli_3', name: 'Diego Castellanos', phone: '5533445566', email: 'diego.cast@ejemplo.mx', notes: 'Entrenamiento Individual' },
      { id: 'cli_4', name: 'Lucía Mendoza', phone: '5599887766', email: 'lucia.mendoza@ejemplo.mx', notes: 'Juvenil · Mar/Jue 17:00' },
      { id: 'cli_5', name: 'Andrés Villalobos', phone: '5522334455', email: 'andres.villa@ejemplo.mx', notes: 'Clínica Sabatina' },
    ],
    charges: [
      { id: 'pi_101', customerId: 'cli_1', concept: 'Mensualidad Noviembre', amountCents: 85_000, channel: 'PAYMENT_LINK', status: 'PENDING_PAYMENT', reminderCount: 1, lastReminderLabel: 'Hace 2 días', dateLabel: '14 Nov' },
      { id: 'pi_102', customerId: 'cli_2', concept: 'Mensualidad Noviembre', amountCents: 85_000, channel: 'PAYMENT_LINK', status: 'EXPIRED', reminderCount: 2, lastReminderLabel: 'Ayer 18:40', dateLabel: '10 Nov' },
      { id: 'pi_103', customerId: 'cli_3', concept: 'Entrenamiento Individual', amountCents: 90_000, channel: 'PAYMENT_LINK', status: 'PENDING_PAYMENT', reminderCount: 0, lastReminderLabel: 'Sin enviar', dateLabel: '14 Nov' },
      { id: 'pi_104', customerId: 'cli_5', concept: 'Clínica de Tiro', amountCents: 35_000, channel: 'CODI_QR', status: 'PENDING_PAYMENT', reminderCount: 0, lastReminderLabel: 'Sin enviar', dateLabel: '14 Nov' },
      { id: 'pi_105', customerId: 'cli_4', concept: 'Mensualidad Noviembre', amountCents: 85_000, channel: 'PAYMENT_LINK', status: 'SETTLED', reminderCount: 1, lastReminderLabel: 'Pagado al 1er aviso', dateLabel: '12 Nov' },
      { id: 'pi_106', customerId: 'cli_1', concept: 'Mensualidad Octubre', amountCents: 85_000, channel: 'PAYMENT_LINK', status: 'SETTLED', reminderCount: 0, lastReminderLabel: '—', dateLabel: '05 Oct' },
      { id: 'pi_107', customerId: 'cli_3', concept: 'Uniforme + Inscripción', amountCents: 120_000, channel: 'CODI_QR', status: 'SETTLED', reminderCount: 0, lastReminderLabel: '—', dateLabel: '02 Nov' },
      { id: 'pi_108', customerId: 'cli_5', concept: 'Clase muestra', amountCents: 20_000, channel: 'CODI_QR', status: 'SETTLED', reminderCount: 0, lastReminderLabel: '—', dateLabel: '01 Nov' },
    ],
  },
  yoga: {
    profile: {
      contractorId: 'demo-yoga',
      ownerName: 'Elena Vargas',
      businessName: 'Prana Yoga Studio',
      profession: 'Instructora de Yoga',
      businessActivity: 'Salud, Yoga y Bienestar',
      rfc: 'VAAE900512AAA',
      taxRegime: 'RESICO',
      phone: '5598765432',
      clabeLast4: '9104',
    },
    services: [
      { name: 'Paquete 8 Clases Vinyasa', feeCents: 110_000 },
      { name: 'Clase Suelta (Drop-in)', feeCents: 22_000 },
      { name: 'Taller Respiración', feeCents: 65_000 },
    ],
    customers: [
      { id: 'cli_1', name: 'Mariana Solís', phone: '5541112233', email: 'mariana@ejemplo.mx', notes: 'Vinyasa 7:00 am' },
      { id: 'cli_2', name: 'Fernanda Ríos', phone: '5582223344', email: 'fer.rios@ejemplo.mx', notes: 'Hatha 19:00 hrs' },
      { id: 'cli_3', name: 'Pablo Orozco', phone: '5534445566', email: 'pablo.o@ejemplo.mx', notes: 'Sábados Restaurativo' },
    ],
    charges: [
      { id: 'pi_201', customerId: 'cli_1', concept: 'Paquete 8 Clases Vinyasa', amountCents: 110_000, channel: 'PAYMENT_LINK', status: 'PENDING_PAYMENT', reminderCount: 1, lastReminderLabel: 'Ayer', dateLabel: '14 Nov' },
      { id: 'pi_202', customerId: 'cli_2', concept: 'Taller Respiración', amountCents: 65_000, channel: 'CODI_QR', status: 'PENDING_PAYMENT', reminderCount: 0, lastReminderLabel: 'Sin enviar', dateLabel: '13 Nov' },
      { id: 'pi_203', customerId: 'cli_3', concept: 'Paquete 8 Clases Vinyasa', amountCents: 110_000, channel: 'PAYMENT_LINK', status: 'SETTLED', reminderCount: 0, lastReminderLabel: '—', dateLabel: '11 Nov' },
    ],
  },
  english: {
    profile: {
      contractorId: 'demo-english',
      ownerName: 'David Treviño',
      businessName: 'SpeakFluently English',
      profession: 'Maestro de Inglés Privado',
      businessActivity: 'Educación e Idiomas',
      rfc: 'TEDX850820AAA',
      taxRegime: 'Persona Física (PFAE)',
      phone: '5566778899',
      clabeLast4: '3309',
    },
    services: [
      { name: 'Mensualidad Inglés Conversacional', feeCents: 140_000 },
      { name: 'Preparación TOEFL', feeCents: 180_000 },
      { name: 'Sesión Entrevista 1-a-1', feeCents: 50_000 },
    ],
    customers: [
      { id: 'cli_1', name: 'Roberto Guzmán', phone: '5549998877', email: 'roberto.g@ejemplo.mx', notes: 'Business English' },
      { id: 'cli_2', name: 'Daniela Pineda', phone: '5581112299', email: 'daniela.p@ejemplo.mx', notes: 'TOEFL' },
      { id: 'cli_3', name: 'Jorge Salgado', phone: '5537776655', email: 'jorge.s@ejemplo.mx', notes: 'Entrevista Tech' },
    ],
    charges: [
      { id: 'pi_301', customerId: 'cli_1', concept: 'Mensualidad Inglés', amountCents: 140_000, channel: 'PAYMENT_LINK', status: 'PENDING_PAYMENT', reminderCount: 1, lastReminderLabel: 'Hace 1 día', dateLabel: '14 Nov' },
      { id: 'pi_302', customerId: 'cli_2', concept: 'Preparación TOEFL', amountCents: 180_000, channel: 'CODI_QR', status: 'EXPIRED', reminderCount: 2, lastReminderLabel: 'Hace 3 días', dateLabel: '08 Nov' },
      { id: 'pi_303', customerId: 'cli_3', concept: 'Sesión Entrevista 1-a-1', amountCents: 50_000, channel: 'PAYMENT_LINK', status: 'SETTLED', reminderCount: 0, lastReminderLabel: '—', dateLabel: '12 Nov' },
    ],
  },
};
