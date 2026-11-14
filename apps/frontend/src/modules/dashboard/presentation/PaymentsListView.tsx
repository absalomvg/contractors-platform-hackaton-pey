import type { JSX } from 'react';
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
  /** Row to highlight, e.g. the charge just created. */
  readonly highlightedChargeId?: string | null;
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
  highlightedChargeId,
}: PaymentsListViewProps) {
  /** One primary action per row; the rest live in the "⋯" menu. */
  function renderActions(charge: DashboardChargeDto) {
    const secondary: { kind: ChargeActionKind; label: string; icon: JSX.Element }[] =
      charge.status === 'pending'
        ? [
            { kind: 'reminder', label: 'Enviar recordatorio', icon: <BellIcon /> },
            { kind: 'edit', label: 'Editar', icon: <EditIcon /> },
            { kind: 'cancel', label: 'Cancelar cobro', icon: <XIcon /> },
          ]
        : [{ kind: 'edit', label: 'Editar nota', icon: <EditIcon /> }];
    return (
      <div className="db-row-actions db-row-actions-compact">
        {charge.status === 'pending' && (
          <button type="button" className="db-action-btn is-ok" onClick={() => onOpenAction('payment', charge)}>
            <CheckIcon />
            <span>Registrar pago</span>
          </button>
        )}
        <details className="db-row-menu">
          <summary className="db-action-btn" aria-label={`Más acciones para ${charge.concept} de ${charge.customerName}`}>
            ⋯
          </summary>
          <div className="db-row-menu-list">
            {secondary.map((item) => (
              <button
                key={item.kind}
                type="button"
                onClick={(event) => {
                  event.currentTarget.closest('details')?.removeAttribute('open');
                  onOpenAction(item.kind, charge);
                }}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </details>
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

        {filterCounts.all === 0 ? (
          <div className="db-empty-state">
            <strong>Aún no tienes cobros</strong>
            <p className="db-muted">Crea tu primer cobro y aparecerá aquí con su estatus.</p>
            <button type="button" className="db-btn-accent" onClick={onCreatePayment}>
              <PlusIcon />
              <span>Crear mi primer cobro</span>
            </button>
          </div>
        ) : charges.charges.length === 0 ? (
          <p className="db-muted">No hay cobros que coincidan con este estatus o búsqueda.</p>
        ) : (
          <>
            {/* Mobile-first Cards (< 768px) */}
            <div className="db-charges-cards">
              {charges.charges.map((charge) => {
                const badge = chargeBadge(charge);
                return (
                  <article key={charge.chargeId} className={`db-charge-card${charge.chargeId === highlightedChargeId ? ' is-new' : ''}`}>
                    <div className="db-charge-card-top">
                      <div>
                        <strong>{charge.customerName}</strong>
                        <p className="db-muted">{charge.concept}</p>
                        <p className="db-muted">{statusDetail(charge)}</p>
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
                    <th className="text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {charges.charges.map((charge) => {
                    const badge = chargeBadge(charge);
                    return (
                      <tr key={charge.chargeId} className={charge.chargeId === highlightedChargeId ? 'is-new' : undefined}>
                        <td>
                          <strong>{charge.customerName}</strong>
                        </td>
                        <td>{charge.concept}</td>
                        <td className="text-right tabular">
                          <strong>{formatMxnCents(charge.amountCents)}</strong>
                        </td>
                        <td>
                          <span className={`db-badge ${BADGE_CLASS[badge]}`}>{CHARGE_BADGE_LABELS[badge]}</span>
                          <div className="db-muted">{statusDetail(charge)}</div>
                        </td>
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
