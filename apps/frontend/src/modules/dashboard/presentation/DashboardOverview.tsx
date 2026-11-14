import type { DashboardChargeDto, DashboardProfileDto, DashboardSummaryDto } from '@platform/contracts';
import {
  CHARGE_BADGE_LABELS,
  PAYMENT_METHOD_LABELS,
  chargeBadge,
  formatDate,
  formatInstant,
  formatMxnCents,
  type ChargeFilter,
  type DashboardScreen,
} from '../domain/dashboard';
import { ArrowRightIcon, BoltIcon, ListIcon, PlusIcon, UsersIcon, XIcon } from './DashboardIcons';

interface DashboardOverviewProps {
  readonly profile: DashboardProfileDto;
  readonly summary: DashboardSummaryDto;
  readonly recentCharges: readonly DashboardChargeDto[];
  readonly clabeLabel: string;
  readonly showFirstChargeGuide: boolean;
  readonly onDismissGuide: () => void;
  readonly onNavigate: (screen: DashboardScreen) => void;
  readonly onOpenChargesWithFilter: (filter: ChargeFilter) => void;
  readonly onStartFirstCharge: () => void;
}

const BADGE_CLASS: Record<string, string> = {
  pending: 'is-pending',
  overdue: 'is-overdue',
  paid: 'is-paid',
  cancelled: 'is-cancelled',
};

function percentLabel(ratio: number | null): string {
  return ratio === null ? '—' : `${Math.round(ratio * 100)}%`;
}

export function DashboardOverview({
  profile,
  summary,
  recentCharges,
  clabeLabel,
  showFirstChargeGuide,
  onDismissGuide,
  onNavigate,
  onOpenChargesWithFilter,
  onStartFirstCharge,
}: DashboardOverviewProps) {
  return (
    <div className="db-stack">
      {showFirstChargeGuide && (
        <section className="db-hero-banner" aria-label="Guía de primer cobro">
          <span className="db-hero-tag">Cuenta lista · Directo a CLABE {clabeLabel}</span>
          <h2>Hola, {profile.name}</h2>
          <p>
            Ya tienes registrado a <strong>{profile.firstCustomer.name}</strong>. Crea tu primer enlace de pago o QR CoDi en segundos.
          </p>
          <div className="db-hero-actions">
            <button type="button" className="db-btn-accent" onClick={onStartFirstCharge}>
              <BoltIcon />
              <span>Cobrar a {profile.firstCustomer.name}</span>
            </button>
            <button type="button" className="db-btn-ghost" style={{ color: '#cbd5e1' }} onClick={onDismissGuide} aria-label="Ocultar guía">
              <XIcon />
              <span>Ocultar</span>
            </button>
          </div>
        </section>
      )}

      <section className="db-kpi-grid" aria-label="Resumen financiero">
        <article className="db-kpi-card">
          <span className="db-kpi-label">Cobrado este mes</span>
          <strong className="db-kpi-value">{formatMxnCents(summary.collected.amountCents)}</strong>
          <span className="db-kpi-meta">
            {summary.collected.count} pagos · efectividad {percentLabel(summary.collectionRate.ratio)}
          </span>
        </article>

        <article className="db-kpi-card">
          <span className="db-kpi-label">Por cobrar</span>
          <strong className="db-kpi-value is-warn">{formatMxnCents(summary.outstanding.amountCents)}</strong>
          <span className="db-kpi-meta">
            {summary.outstanding.count} cobros · {summary.outstanding.customerCount} clientes
          </span>
        </article>

        <article className="db-kpi-card">
          <span className="db-kpi-label">Vencido</span>
          <strong className="db-kpi-value">{formatMxnCents(summary.overdue.amountCents)}</strong>
          <span className="db-kpi-meta">
            {summary.overdue.oldestDaysOverdue === null
              ? 'Al día, sin atrasos'
              : `${summary.overdue.count} cobros · máx. ${summary.overdue.oldestDaysOverdue} días`}
          </span>
        </article>

        <article className="db-kpi-card">
          <span className="db-kpi-label">Ahorro CoDi</span>
          <strong className="db-kpi-value">{formatMxnCents(summary.commissionSavings.amountCents)}</strong>
          <span className="db-kpi-meta">{summary.reminders.sent} recordatorios enviados</span>
        </article>
      </section>

      <section className="db-quick-bar" aria-label="Acciones rápidas">
        <button type="button" className="db-quick-tile is-primary" onClick={() => onNavigate('payment')}>
          <BoltIcon />
          <span>Cobro rápido (Link / CoDi)</span>
        </button>
        <button type="button" className="db-quick-tile" onClick={() => onNavigate('clients')}>
          <PlusIcon />
          <span>Registrar cliente</span>
        </button>
        <button type="button" className="db-quick-tile" onClick={() => onOpenChargesWithFilter('pending')}>
          <ListIcon />
          <span>Pendientes ({summary.outstanding.count})</span>
        </button>
      </section>

      <section className="db-card db-stack" aria-label="Últimos movimientos">
        <div className="db-section-header">
          <div>
            <h3>Actividad reciente de pagos</h3>
            <p className="db-muted">Estatus actualizado de tus últimos cobros.</p>
          </div>
          <button type="button" className="db-btn-secondary" onClick={() => onNavigate('charges')}>
            <span>Ver todos</span>
            <ArrowRightIcon />
          </button>
        </div>

        {recentCharges.length === 0 ? (
          <p className="db-muted">Aún no hay cobros registrados. Crea el primero desde Pagos rápidos.</p>
        ) : (
          <div className="db-charges-cards" style={{ display: 'flex' }}>
            {recentCharges.slice(0, 3).map((charge) => {
              const badge = chargeBadge(charge);
              return (
                <article key={charge.chargeId} className="db-charge-card">
                  <div className="db-charge-card-top">
                    <div>
                      <strong>{charge.customerName}</strong>
                      <p className="db-muted">{charge.concept}</p>
                      <p className="db-muted">
                        {charge.status === 'paid' && charge.paidAt
                          ? `${PAYMENT_METHOD_LABELS[charge.paymentMethod ?? 'other']} · ${formatInstant(charge.paidAt)}`
                          : `Vence ${formatDate(charge.dueDate)}`}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div className="db-charge-amount">{formatMxnCents(charge.amountCents)}</div>
                      <span className={`db-badge ${BADGE_CLASS[badge]}`}>{CHARGE_BADGE_LABELS[badge]}</span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <div className="db-row-actions">
          <button type="button" className="db-btn-ghost" onClick={() => onNavigate('clients')}>
            <UsersIcon />
            <span>Ir al directorio de clientes</span>
          </button>
        </div>
      </section>
    </div>
  );
}
