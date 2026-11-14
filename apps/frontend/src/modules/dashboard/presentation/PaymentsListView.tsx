import type { DashboardChargeDto, DashboardChargesDto } from '@platform/contracts';
import {
  CHARGE_BADGE_LABELS,
  CHARGE_FILTERS,
  PAYMENT_METHOD_LABELS,
  chargeBadge,
  formatDate,
  formatInstant,
  formatMxnCents,
  type ChargeBadge,
  type ChargeFilter,
} from '../domain/dashboard';
import { BellIcon, CheckIcon, EditIcon, PlusIcon, XIcon } from './DashboardIcons';

export type ChargeActionKind = 'reminder' | 'payment' | 'cancel' | 'edit';

interface PaymentsListViewProps {
  readonly charges: DashboardChargesDto;
  readonly filter: ChargeFilter;
  readonly filterCounts: Record<ChargeFilter, number>;
  readonly search: string;
  readonly onFilterChange: (next: ChargeFilter) => void;
  readonly onSearchChange: (next: string) => void;
  readonly onOpenAction: (kind: ChargeActionKind, charge: DashboardChargeDto) => void;
  readonly onCreatePayment: () => void;
}

const BADGE_CLASS: Record<ChargeBadge, string> = {
  pending: 'is-pending',
  overdue: 'is-overdue',
  paid: 'is-paid',
  cancelled: 'is-cancelled',
};

function statusDetail(charge: DashboardChargeDto): string {
  if (charge.status === 'paid' && charge.paidAt) {
    return `${PAYMENT_METHOD_LABELS[charge.paymentMethod ?? 'other']} · ${formatInstant(charge.paidAt)}`;
  }
  if (charge.status === 'cancelled' && charge.cancelledAt) {
    return `Cancelado · ${formatInstant(charge.cancelledAt)}`;
  }
  return `Vence ${formatDate(charge.dueDate)}`;
}

export function PaymentsListView({
  charges,
  filter,
  filterCounts,
  search,
  onFilterChange,
  onSearchChange,
  onOpenAction,
  onCreatePayment,
}: PaymentsListViewProps) {
  function renderActions(charge: DashboardChargeDto) {
    return (
      <div className="db-row-actions">
        {charge.status === 'pending' && (
          <>
            <button type="button" className="db-action-btn is-warn" onClick={() => onOpenAction('reminder', charge)}>
              <BellIcon />
              <span>Recordar</span>
            </button>
            <button type="button" className="db-action-btn is-ok" onClick={() => onOpenAction('payment', charge)}>
              <CheckIcon />
              <span>Registrar pago</span>
            </button>
            <button type="button" className="db-action-btn" onClick={() => onOpenAction('cancel', charge)}>
              <XIcon />
              <span>Cancelar</span>
            </button>
          </>
        )}
        <button type="button" className="db-action-btn" onClick={() => onOpenAction('edit', charge)}>
          <EditIcon />
          <span>Editar</span>
        </button>
      </div>
    );
  }

  return (
    <div className="db-stack">
      <div className="db-section-header">
        <div>
          <h2>Lista de pagos y estatus</h2>
          <p className="db-muted">
            {charges.totals.count} cobros · {formatMxnCents(charges.totals.amountCents)}
          </p>
        </div>
        <button type="button" className="db-btn-accent" onClick={onCreatePayment}>
          <PlusIcon />
          <span>Nuevo cobro</span>
        </button>
      </div>

      <section className="db-card db-stack" aria-label="Listado de cobros">
        <div className="db-section-header">
          <div className="db-filter-row" role="tablist" aria-label="Filtrar pagos por estatus">
            {CHARGE_FILTERS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={filter === id}
                className="db-filter-pill"
                onClick={() => onFilterChange(id)}
              >
                {label} ({filterCounts[id]})
              </button>
            ))}
          </div>

          <input
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Buscar cliente o concepto..."
            aria-label="Buscar pagos"
            className="db-search-input"
          />
        </div>

        {charges.charges.length === 0 ? (
          <p className="db-muted">No hay cobros que coincidan con este estatus o búsqueda.</p>
        ) : (
          <>
            {/* Mobile-first Cards (< 768px) */}
            <div className="db-charges-cards">
              {charges.charges.map((charge) => {
                const badge = chargeBadge(charge);
                return (
                  <article key={charge.chargeId} className="db-charge-card">
                    <div className="db-charge-card-top">
                      <div>
                        <strong>{charge.customerName}</strong>
                        <p className="db-muted">{charge.concept}</p>
                        <p className="db-muted">{statusDetail(charge)}</p>
                        {(charge.tags.length > 0 || charge.note) && (
                          <p className="db-muted">
                            {charge.tags.map((tag) => `#${tag}`).join(' ')}
                            {charge.note ? ` · ${charge.note}` : ''}
                          </p>
                        )}
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div className="db-charge-amount">{formatMxnCents(charge.amountCents)}</div>
                        <span className={`db-badge ${BADGE_CLASS[badge]}`}>{CHARGE_BADGE_LABELS[badge]}</span>
                      </div>
                    </div>
                    {renderActions(charge)}
                  </article>
                );
              })}
            </div>

            {/* Desktop Table (>= 768px) */}
            <div className="db-table-wrap">
              <table className="db-table">
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Concepto</th>
                    <th className="text-right">Monto</th>
                    <th>Estatus</th>
                    <th>Recordatorios</th>
                    <th className="text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {charges.charges.map((charge) => {
                    const badge = chargeBadge(charge);
                    return (
                      <tr key={charge.chargeId}>
                        <td>
                          <strong>{charge.customerName}</strong>
                          <div className="db-muted">
                            {charge.chargeId} · v{charge.version}
                          </div>
                        </td>
                        <td>
                          <strong>{charge.concept}</strong>
                          {(charge.tags.length > 0 || charge.note) && (
                            <div className="db-muted">
                              {charge.tags.map((tag) => `#${tag}`).join(' ')}
                              {charge.note ? ` · ${charge.note}` : ''}
                            </div>
                          )}
                        </td>
                        <td className="text-right tabular">
                          <strong>{formatMxnCents(charge.amountCents)}</strong>
                        </td>
                        <td>
                          <span className={`db-badge ${BADGE_CLASS[badge]}`}>{CHARGE_BADGE_LABELS[badge]}</span>
                          <div className="db-muted">{statusDetail(charge)}</div>
                        </td>
                        <td className="tabular">{charge.reminderCount} env.</td>
                        <td className="text-right">{renderActions(charge)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
