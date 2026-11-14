import { useId, useState, type FormEvent } from 'react';
import type { CustomerRowDto, DashboardCustomersDto, DashboardSummaryDto } from '@platform/contracts';
import {
  PAYMENT_METHOD_LABELS,
  STANDING_LABELS,
  formatDate,
  formatMxPhone,
  formatMxnCents,
  mxPhoneDigits,
  validateNewCustomer,
  type CustomerFieldErrors,
  type NewCustomerInput,
} from '../domain/dashboard';
import { BoltIcon, ListIcon, PlusIcon, XIcon } from './DashboardIcons';

interface CustomersViewProps {
  readonly customersData: DashboardCustomersDto;
  readonly summary: DashboardSummaryDto;
  readonly customerPhones: Readonly<Record<string, string>>;
  readonly onCreateCustomer: (input: NewCustomerInput) => Promise<CustomerRowDto>;
  readonly onChargeCustomer: (customerId: string) => void;
  readonly onViewCustomerCharges: (customerName: string) => void;
}

const EMPTY_CUSTOMER: NewCustomerInput = { name: '', phone: '', email: '' };

const STANDING_BADGE_CLASS: Record<CustomerRowDto['standing'], string> = {
  overdue: 'is-overdue',
  pending: 'is-pending',
  up_to_date: 'is-paid',
};

export function CustomersView({
  customersData,
  summary,
  customerPhones,
  onCreateCustomer,
  onChargeCustomer,
  onViewCustomerCharges,
}: CustomersViewProps) {
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<NewCustomerInput>(EMPTY_CUSTOMER);
  const [errors, setErrors] = useState<CustomerFieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const baseId = useId();

  const normalizedTerm = search.trim().toLowerCase();
  const visibleCustomers = customersData.customers.filter(
    (row) =>
      !normalizedTerm ||
      row.name.toLowerCase().includes(normalizedTerm) ||
      (customerPhones[row.customerId] ?? '').includes(normalizedTerm),
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleaned: NewCustomerInput = {
      name: form.name.trim(),
      phone: mxPhoneDigits(form.phone),
      email: form.email.trim(),
    };
    const nextErrors = validateNewCustomer(cleaned);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setSaving(true);
    setSubmitError(null);
    try {
      await onCreateCustomer(cleaned);
      setForm(EMPTY_CUSTOMER);
      setShowForm(false);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'No fue posible registrar al cliente.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="db-stack">
      <div className="db-section-header">
        <div>
          <h2>Clientes y saldos</h2>
          <p className="db-muted">
            {customersData.counts.overdue} vencidos · {customersData.counts.pending} pendientes · {customersData.counts.upToDate} al día · plan{' '}
            {summary.customers.plan} ({summary.customers.active}/{summary.customers.limit ?? '∞'})
          </p>
        </div>
        <button type="button" className="db-btn-primary" onClick={() => setShowForm((prev) => !prev)}>
          {showForm ? <XIcon /> : <PlusIcon />}
          <span>{showForm ? 'Cerrar formulario' : 'Registrar cliente'}</span>
        </button>
      </div>

      {showForm && (
        <form className="db-card db-stack" onSubmit={handleSubmit} noValidate aria-label="Registrar nuevo cliente">
          <div>
            <h3>Nuevo cliente</h3>
            <p className="db-muted">Guárdalo para enviarle cobros por WhatsApp o CoDi con un toque.</p>
          </div>

          <div className="db-form-grid">
            <div className="form-field">
              <label htmlFor={`${baseId}-cust-name`}>Nombre completo</label>
              <input
                id={`${baseId}-cust-name`}
                value={form.name}
                placeholder="Ej. Laura Mendoza"
                aria-invalid={Boolean(errors.name)}
                aria-describedby={errors.name ? `${baseId}-cust-name-err` : undefined}
                onChange={(event) => {
                  setForm((prev) => ({ ...prev, name: event.target.value }));
                  setErrors((prev) => ({ ...prev, name: undefined }));
                }}
                required
              />
              {errors.name && (
                <small id={`${baseId}-cust-name-err`} role="alert" className="field-error">
                  {errors.name}
                </small>
              )}
            </div>

            <div className="form-field">
              <label htmlFor={`${baseId}-cust-phone`}>Teléfono (10 dígitos)</label>
              <div className="masked-input">
                <span className="masked-input-prefix" aria-hidden="true">
                  +52
                </span>
                <input
                  id={`${baseId}-cust-phone`}
                  type="tel"
                  inputMode="tel"
                  placeholder="55 1234 5678"
                  value={formatMxPhone(form.phone)}
                  aria-invalid={Boolean(errors.phone)}
                  aria-describedby={errors.phone ? `${baseId}-cust-phone-err` : undefined}
                  onChange={(event) => {
                    setForm((prev) => ({ ...prev, phone: mxPhoneDigits(event.target.value) }));
                    setErrors((prev) => ({ ...prev, phone: undefined }));
                  }}
                  required
                />
              </div>
              {errors.phone && (
                <small id={`${baseId}-cust-phone-err`} role="alert" className="field-error">
                  {errors.phone}
                </small>
              )}
            </div>

            <div className="form-field">
              <label htmlFor={`${baseId}-cust-email`}>Correo electrónico</label>
              <input
                id={`${baseId}-cust-email`}
                type="email"
                inputMode="email"
                placeholder="Ej. laura@ejemplo.mx"
                value={form.email}
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? `${baseId}-cust-email-err` : undefined}
                onChange={(event) => {
                  setForm((prev) => ({ ...prev, email: event.target.value }));
                  setErrors((prev) => ({ ...prev, email: undefined }));
                }}
                required
              />
              {errors.email && (
                <small id={`${baseId}-cust-email-err`} role="alert" className="field-error">
                  {errors.email}
                </small>
              )}
            </div>
          </div>

          {submitError && (
            <p role="alert" className="db-error-banner">
              {submitError}
            </p>
          )}

          <div className="db-row-actions">
            <button type="submit" className="db-btn-accent" disabled={saving}>
              {saving ? 'Guardando cliente...' : 'Guardar cliente'}
            </button>
            <button type="button" className="db-btn-secondary" onClick={() => setShowForm(false)}>
              Cancelar
            </button>
          </div>
        </form>
      )}

      <input
        type="search"
        className="db-search-input"
        placeholder="Buscar cliente por nombre o teléfono..."
        aria-label="Buscar clientes"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />

      {visibleCustomers.length === 0 ? (
        <div className="db-card">
          <p className="db-muted">No hay clientes que coincidan con tu búsqueda.</p>
        </div>
      ) : (
        <div className="db-clients-grid">
          {visibleCustomers.map((row) => {
            const phone = customerPhones[row.customerId];
            return (
              <article key={row.customerId} className="db-card db-client-card">
                <div className="db-client-top">
                  <div>
                    <h3>{row.name}</h3>
                    <p className="db-muted">
                      {phone ? `+52 ${formatMxPhone(phone)}` : 'Sin teléfono'}
                      {row.lastPayment
                        ? ` · Último pago ${formatMxnCents(row.lastPayment.amountCents)} (${PAYMENT_METHOD_LABELS[row.lastPayment.method]})`
                        : ''}
                    </p>
                  </div>
                  <span className={`db-badge ${STANDING_BADGE_CLASS[row.standing]}`}>
                    {STANDING_LABELS[row.standing]}
                  </span>
                </div>

                <div className="db-client-balances">
                  <div>
                    <span>Por cobrar</span>
                    <strong>{formatMxnCents(row.balance.outstandingCents)}</strong>
                  </div>
                  <div>
                    <span>Vencido</span>
                    <strong style={{ color: row.balance.overdueCents > 0 ? '#b45309' : undefined }}>
                      {formatMxnCents(row.balance.overdueCents)}
                    </strong>
                  </div>
                </div>

                <p className="db-muted">
                  {row.oldestDueDate
                    ? `Vencido desde ${formatDate(row.oldestDueDate)}`
                    : row.nextDueDate
                      ? `Próximo vencimiento ${formatDate(row.nextDueDate)}`
                      : 'Sin cobros pendientes'}
                </p>

                <div className="db-row-actions">
                  <button type="button" className="db-btn-accent" onClick={() => onChargeCustomer(row.customerId)}>
                    <BoltIcon />
                    <span>Cobrar</span>
                  </button>
                  <button type="button" className="db-btn-secondary" onClick={() => onViewCustomerCharges(row.name)}>
                    <ListIcon />
                    <span>Ver pagos</span>
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
