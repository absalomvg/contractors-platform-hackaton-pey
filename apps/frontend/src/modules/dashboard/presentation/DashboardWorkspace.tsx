import { useCallback, useEffect, useState, type FormEvent } from 'react';
import type {
  CustomerRowDto,
  DashboardChargeDto,
  DashboardChargesDto,
  DashboardCustomersDto,
  DashboardProfileDto,
  DashboardSummaryDto,
  ManualPaymentMethod,
} from '@platform/contracts';
import { DashboardApiError, type DashboardGateway, type PaymentsGateway } from '../application/dashboard-gateway';
import {
  CHARGE_BADGE_LABELS,
  CHARGE_FIELD_LABELS,
  CHARGE_FILTERS,
  CONCEPT_MAX_LENGTH,
  MANUAL_PAYMENT_METHODS,
  NOTE_MAX_LENGTH,
  PAYMENT_METHOD_LABELS,
  STANDING_LABELS,
  canEdit,
  chargeBadge,
  chargesQueryFor,
  formatDate,
  formatInstant,
  formatMxnCents,
  parseTags,
  pesosToCents,
  todayInMexico,
  type ChargeBadge,
  type ChargeFilter,
  type DashboardScreen,
  type ViewportMode,
} from '../domain/dashboard';

/** Prototype-only hooks of the mock data source. */
export interface DemoControls {
  simulateProviderPayment(): string | null;
  simulateConcurrentEdit(chargeId: string): void;
  reset(): void;
}

interface DashboardWorkspaceProps {
  readonly gateway: DashboardGateway;
  readonly payments: PaymentsGateway;
  readonly contractorId: string;
  readonly demo?: DemoControls;
  readonly customerPhones?: Readonly<Record<string, string>>;
  readonly onNotFound?: () => void;
  readonly onSignOut?: () => void;
}

type Modal =
  | { kind: 'reminder'; charge: DashboardChargeDto }
  | { kind: 'payment'; charge: DashboardChargeDto }
  | { kind: 'cancel'; charge: DashboardChargeDto }
  | { kind: 'edit'; charge: DashboardChargeDto };

const BADGE_CLASS: Record<ChargeBadge, string> = {
  pending: 'praxis-badge-pending',
  overdue: 'praxis-badge-expired',
  paid: 'praxis-badge-paid',
  cancelled: 'praxis-badge-cancelled',
};

function percent(ratio: number | null): string {
  return ratio === null ? '—' : `${Math.round(ratio * 100)}%`;
}

export function DashboardWorkspace({ gateway, payments, contractorId, demo, customerPhones = {}, onNotFound, onSignOut }: DashboardWorkspaceProps) {
  const [viewport, setViewport] = useState<ViewportMode>('desktop');
  const [screen, setScreen] = useState<DashboardScreen>('dashboard');
  const [filter, setFilter] = useState<ChargeFilter>('all');
  const [search, setSearch] = useState('');

  const [profile, setProfile] = useState<DashboardProfileDto | null>(null);
  const [summary, setSummary] = useState<DashboardSummaryDto | null>(null);
  const [allCharges, setAllCharges] = useState<DashboardChargeDto[]>([]);
  const [charges, setCharges] = useState<DashboardChargesDto | null>(null);
  const [customers, setCustomers] = useState<DashboardCustomersDto | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [modal, setModal] = useState<Modal | null>(null);
  const [modalErrors, setModalErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [showFirstChargeGuide, setShowFirstChargeGuide] = useState(true);

  const [newCustomerId, setNewCustomerId] = useState('');
  const [newConcept, setNewConcept] = useState('Mensualidad');
  const [newAmount, setNewAmount] = useState('850');
  const [newDueDate, setNewDueDate] = useState(todayInMexico());

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  const notify = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast((current) => (current === message ? null : current)), 3600);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    Promise.all([
      gateway.profile(contractorId, signal),
      gateway.summary(contractorId, {}, signal),
      gateway.charges(contractorId, {}, signal),
      gateway.charges(contractorId, chargesQueryFor(filter, search), signal),
      gateway.customers(contractorId, {}, signal),
    ])
      .then(([nextProfile, nextSummary, everyCharge, filtered, nextCustomers]) => {
        if (signal.aborted) return;
        setProfile(nextProfile);
        setSummary(nextSummary);
        setAllCharges(everyCharge.charges);
        setCharges(filtered);
        setCustomers(nextCustomers);
        setLoadError(null);
        setNewCustomerId((current) => current || nextCustomers.customers[0]?.customerId || '');
      })
      .catch((error: unknown) => {
        if (signal.aborted) return;
        if (error instanceof DashboardApiError && error.status === 404 && onNotFound) {
          onNotFound();
          return;
        }
        setLoadError(error instanceof Error ? error.message : 'No fue posible cargar el tablero.');
      });
    return () => controller.abort();
  }, [gateway, contractorId, filter, search, reloadKey, onNotFound]);

  function openModal(next: Modal) {
    setModalErrors({});
    setModal(next);
  }

  /** Runs a write; on version_conflict reloads so the user sees the current charge. */
  async function mutate(action: () => Promise<DashboardChargeDto>, success: (charge: DashboardChargeDto) => string) {
    setBusy(true);
    try {
      const charge = await action();
      setModal(null);
      notify(success(charge));
    } catch (error) {
      if (!(error instanceof DashboardApiError)) {
        notify('No fue posible conectar con el servidor.');
      } else if (error.code === 'version_conflict' || error.status === 404) {
        setModal(null);
        notify(error.message);
      } else {
        setModalErrors({ form: error.message, ...error.fields });
      }
    } finally {
      setBusy(false);
      reload();
    }
  }

  function handleManualPayment(event: FormEvent<HTMLFormElement>, charge: DashboardChargeDto) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const method = String(data.get('method')) as ManualPaymentMethod;
    const note = String(data.get('note') ?? '').trim();
    void mutate(
      () => gateway.recordManualPayment(contractorId, charge.chargeId, { version: charge.version, method, ...(note ? { note } : {}) }),
      (paid) => `Pago registrado: ${formatMxnCents(paid.amountCents)} de ${paid.customerName} (${PAYMENT_METHOD_LABELS[method]})`,
    );
  }

  function handleCancel(event: FormEvent<HTMLFormElement>, charge: DashboardChargeDto) {
    event.preventDefault();
    const reason = String(new FormData(event.currentTarget).get('reason') ?? '').trim();
    void mutate(
      () => gateway.cancelCharge(contractorId, charge.chargeId, { version: charge.version, ...(reason ? { reason } : {}) }),
      (cancelled) => `Cobro cancelado: ${cancelled.concept} de ${cancelled.customerName}`,
    );
  }

  function handleEdit(event: FormEvent<HTMLFormElement>, charge: DashboardChargeDto) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const text = (name: string) => String(data.get(name) ?? '').trim();
    const body: Parameters<DashboardGateway['updateCharge']>[2] = { version: charge.version };
    if (canEdit(charge, 'concept') && text('concept') !== charge.concept) body.concept = text('concept');
    if (canEdit(charge, 'dueDate') && text('dueDate') !== charge.dueDate) body.dueDate = text('dueDate');
    if (canEdit(charge, 'amountCents')) {
      const cents = pesosToCents(text('amount'));
      if (cents === null) {
        setModalErrors({ amountCents: 'Ingresa un monto válido.' });
        return;
      }
      if (cents !== charge.amountCents) body.amountCents = cents;
    }
    if (text('note') !== (charge.note ?? '')) body.note = text('note') || null;
    const tags = parseTags(text('tags'));
    if (tags.join(',') !== charge.tags.join(',')) body.tags = tags;
    void mutate(
      () => gateway.updateCharge(contractorId, charge.chargeId, body),
      (updated) => `Cobro actualizado: ${updated.concept} (versión ${updated.version})`,
    );
  }

  function handleReminder(charge: DashboardChargeDto, via: 'WhatsApp' | 'Correo') {
    void mutate(
      () => payments.sendReminder(contractorId, charge.chargeId),
      (updated) => `Recordatorio ${updated.reminderCount} enviado por ${via} a ${updated.customerName}`,
    );
  }

  function handleCreateCharge(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amountCents = pesosToCents(newAmount);
    if (!newCustomerId || amountCents === null || !newConcept.trim()) {
      notify('Revisa cliente, concepto y monto.');
      return;
    }
    void payments
      .createCharge(contractorId, { customerId: newCustomerId, concept: newConcept.trim(), amountCents, dueDate: newDueDate })
      .then((created) => {
        setFilter('all');
        setScreen('dashboard');
        notify(`Cobro creado: ${formatMxnCents(created.amountCents)} para ${created.customerName}`);
        reload();
      });
  }

  function handleSimulatePayment() {
    const chargeId = demo?.simulateProviderPayment();
    notify(chargeId ? `Webhook pey simulado: ${chargeId} pagado con CoDi` : 'No hay cobros pendientes.');
    reload();
  }

  function handleSimulateConflict() {
    const target = allCharges.find((charge) => charge.status === 'pending');
    if (!demo || !target) return;
    demo.simulateConcurrentEdit(target.chargeId);
    notify(`Otro dispositivo editó "${target.concept}". Tu siguiente cambio a ese cobro recibirá 409 version_conflict.`);
  }

  function handleReset() {
    demo?.reset();
    setFilter('all');
    setSearch('');
    notify('Datos de prueba restaurados (5 registros).');
    reload();
  }

  if (loadError) {
    return (
      <section className="praxis-workspace">
        <p role="alert" className="field-error">{loadError}</p>
        <button type="button" className="praxis-btn-primary" onClick={reload}>Reintentar</button>
      </section>
    );
  }
  if (!profile || !summary || !charges || !customers) {
    return <section className="praxis-workspace" aria-busy="true"><p>Cargando tablero…</p></section>;
  }

  const clabeLabel = profile.business.clabeLast4 ? `•••• ${profile.business.clabeLast4}` : 'CLABE pendiente';
  const filterCounts: Record<ChargeFilter, number> = {
    all: allCharges.length,
    pending: allCharges.filter((charge) => charge.status === 'pending').length,
    overdue: allCharges.filter((charge) => charge.overdue).length,
    paid: allCharges.filter((charge) => charge.status === 'paid').length,
    cancelled: allCharges.filter((charge) => charge.status === 'cancelled').length,
  };
  const activeCustomer = customers.customers.find((row) => row.customerId === newCustomerId);
  const previewAmountCents = pesosToCents(newAmount) ?? 0;

  function renderBadge(charge: DashboardChargeDto) {
    const badge = chargeBadge(charge);
    return <span className={`praxis-badge ${BADGE_CLASS[badge]}`}>{CHARGE_BADGE_LABELS[badge]}</span>;
  }

  function renderStatusDetail(charge: DashboardChargeDto) {
    if (charge.status === 'paid' && charge.paidAt) {
      return `${PAYMENT_METHOD_LABELS[charge.paymentMethod ?? 'other']} · ${formatInstant(charge.paidAt)}`;
    }
    if (charge.status === 'cancelled' && charge.cancelledAt) return `Cancelado ${formatInstant(charge.cancelledAt)}`;
    return `Vence ${formatDate(charge.dueDate)}`;
  }

  function renderActions(charge: DashboardChargeDto) {
    return (
      <div className="praxis-row-actions">
        {charge.status === 'pending' && (
          <>
            <button type="button" className="praxis-action-btn warn" onClick={() => openModal({ kind: 'reminder', charge })}>
              🔔 Recordar
            </button>
            <button type="button" className="praxis-action-btn ok" onClick={() => openModal({ kind: 'payment', charge })}>
              ✓ Registrar pago
            </button>
            <button type="button" className="praxis-action-btn" onClick={() => openModal({ kind: 'cancel', charge })}>
              ✕ Cancelar
            </button>
          </>
        )}
        <button type="button" className="praxis-action-btn" onClick={() => openModal({ kind: 'edit', charge })}>
          ✎ Editar
        </button>
      </div>
    );
  }

  function renderCustomerCard(row: CustomerRowDto) {
    const badgeClass = row.standing === 'overdue' ? 'praxis-badge-expired' : row.standing === 'pending' ? 'praxis-badge-pending' : 'praxis-badge-paid';
    return (
      <div key={row.customerId} className="praxis-card praxis-client-card">
        <div className="praxis-client-top">
          <div>
            <strong>{row.name}</strong>
            <div className="praxis-subcell">
              {row.lastPayment
                ? `Último pago ${formatMxnCents(row.lastPayment.amountCents)} · ${PAYMENT_METHOD_LABELS[row.lastPayment.method]}`
                : 'Sin pagos registrados'}
            </div>
          </div>
          <span className={`praxis-badge ${badgeClass}`}>{STANDING_LABELS[row.standing]}</span>
        </div>
        <div className="praxis-client-balances">
          <div>
            <span>Por cobrar</span>
            <strong className="tabular">{formatMxnCents(row.balance.outstandingCents)}</strong>
          </div>
          <div>
            <span>Vencido</span>
            <strong className="tabular praxis-text-amber">{formatMxnCents(row.balance.overdueCents)}</strong>
          </div>
        </div>
        <div className="praxis-subcell">
          {row.oldestDueDate ? `Vencido desde ${formatDate(row.oldestDueDate)}` : row.nextDueDate ? `Próximo vencimiento ${formatDate(row.nextDueDate)}` : 'Sin cobros pendientes'}
        </div>
        <div className="praxis-row-actions">
          <button
            type="button"
            className="praxis-btn-primary"
            onClick={() => {
              setNewCustomerId(row.customerId);
              setScreen('payment');
            }}
          >
            + Nuevo cobro
          </button>
          <button
            type="button"
            className="praxis-btn-secondary"
            onClick={() => {
              setSearch(row.name);
              setFilter('all');
              setScreen('dashboard');
            }}
          >
            Ver cobros
          </button>
        </div>
      </div>
    );
  }

  return (
    <section aria-labelledby="dashboard-workspace-title" className="praxis-workspace">
      <div className="praxis-toolbar">
        <div className="praxis-toolbar-group">
          <span id="dashboard-workspace-title" className="praxis-toolbar-label">Vista:</span>
          <div className="praxis-pill-toggle" role="group" aria-label="Selector de vista de dispositivo">
            <button type="button" className={viewport === 'desktop' ? 'active' : ''} onClick={() => setViewport('desktop')}>
              🖥️ Desktop
            </button>
            <button type="button" className={viewport === 'mobile' ? 'active' : ''} onClick={() => setViewport('mobile')}>
              📱 Móvil (390×844)
            </button>
          </div>
        </div>

        <div className="praxis-toolbar-group">
          {(
            [
              ['dashboard', '1. Dashboard'],
              ['clients', `2. Clientes (${customers.counts.all})`],
              ['payment', '3. Solicitar pago'],
              ['workflow', '4. Flujo'],
              ['profile', '5. Perfil'],
            ] as const
          ).map(([id, label]) => (
            <button key={id} type="button" className={`praxis-nav-pill ${screen === id ? 'active' : ''}`} onClick={() => setScreen(id)}>
              {label}
            </button>
          ))}
        </div>

        {demo && (
          <div className="praxis-toolbar-group">
            <button type="button" className="praxis-btn-webhook" onClick={handleSimulatePayment}>
              ⚡ Simular pago CoDi
            </button>
            <button type="button" className="praxis-btn-secondary" onClick={handleSimulateConflict}>
              Simular conflicto
            </button>
            <button type="button" className="praxis-btn-secondary" onClick={handleReset}>
              Reiniciar datos
            </button>
          </div>
        )}
      </div>

      {toast && (
        <div role="status" className="praxis-toast">
          <span>✓</span>
          <span>{toast}</span>
        </div>
      )}

      <div className={viewport === 'mobile' ? 'praxis-stage-mobile-wrapper' : ''}>
        <div className={viewport === 'mobile' ? 'praxis-phone-frame' : 'praxis-desktop-frame'}>
          {viewport === 'mobile' && (
            <div className="praxis-phone-statusbar">
              <span className="tabular">9:41</span>
              <span className="praxis-phone-notch" />
              <span>5G · 100%</span>
            </div>
          )}

          <header className="praxis-app-header">
            <div className="praxis-brand">
              <div className="praxis-avatar">{profile.business.name.charAt(0).toUpperCase()}</div>
              <div>
                <div className="praxis-brand-title">
                  <strong>{profile.business.name}</strong>
                  <span className="praxis-clabe-pill">{clabeLabel}</span>
                </div>
                <div className="praxis-brand-sub">
                  {profile.name} · {profile.profession}
                </div>
              </div>
            </div>
            <div className="praxis-header-actions">
              <button type="button" className="praxis-btn-primary" onClick={() => setScreen('payment')}>
                + Cobrar
              </button>
              {onSignOut && (
                <button type="button" className="praxis-btn-secondary" onClick={onSignOut}>
                  Salir
                </button>
              )}
            </div>
          </header>

          <div className="praxis-stage-body">
            {showFirstChargeGuide && (
              <div className="praxis-first-charge-banner">
                <div>
                  <span className="praxis-banner-tag">🎉 Registro completado · Haz tu primer cobro</span>
                  <h3>Bienvenido, {profile.name}</h3>
                  <p>
                    Tus cobros se depositan directo en tu CLABE <strong>{clabeLabel}</strong>.
                  </p>
                </div>
                <div className="praxis-banner-actions">
                  <button
                    type="button"
                    className="praxis-btn-accent"
                    onClick={() => {
                      setScreen('payment');
                      setShowFirstChargeGuide(false);
                    }}
                  >
                    Crear mi primer cobro
                  </button>
                  <button type="button" className="praxis-btn-close-light" onClick={() => setShowFirstChargeGuide(false)} aria-label="Cerrar guía">
                    ✕
                  </button>
                </div>
              </div>
            )}

            {screen === 'dashboard' && (
              <div className="praxis-stack">
                <div className="praxis-kpi-grid">
                  <div className="praxis-kpi-card">
                    <div className="praxis-kpi-top">
                      <span>COBRADO ESTE MES</span>
                      <span className="praxis-badge praxis-badge-paid">Cobranza {percent(summary.collectionRate.ratio)}</span>
                    </div>
                    <div className="praxis-kpi-value tabular">{formatMxnCents(summary.collected.amountCents)}</div>
                    <div className="praxis-kpi-meta">
                      {summary.collected.count} pagos · ahorro en comisiones {formatMxnCents(summary.commissionSavings.amountCents)}
                    </div>
                  </div>

                  <div className="praxis-kpi-card">
                    <div className="praxis-kpi-top">
                      <span>POR COBRAR</span>
                      <span className="praxis-badge praxis-badge-pending">{summary.outstanding.count} pend.</span>
                    </div>
                    <div className="praxis-kpi-value praxis-text-amber tabular">{formatMxnCents(summary.outstanding.amountCents)}</div>
                    <div className="praxis-kpi-meta">En {summary.outstanding.customerCount} clientes · {summary.reminders.sent} recordatorios enviados</div>
                  </div>

                  <div className="praxis-kpi-card">
                    <div className="praxis-kpi-top">
                      <span>VENCIDO</span>
                      <span className="praxis-badge praxis-badge-expired">{summary.overdue.count} cobros</span>
                    </div>
                    <div className="praxis-kpi-value tabular">{formatMxnCents(summary.overdue.amountCents)}</div>
                    <div className="praxis-kpi-meta">
                      {summary.overdue.oldestDaysOverdue === null ? 'Nada vencido' : `El más antiguo lleva ${summary.overdue.oldestDaysOverdue} días`}
                    </div>
                  </div>
                </div>

                <div className="praxis-card">
                  <div className="praxis-table-header">
                    <div>
                      <h3>Cobros</h3>
                      <p className="praxis-muted">
                        {charges.totals.count} cobros · {formatMxnCents(charges.totals.amountCents)}
                      </p>
                    </div>
                    <input
                      type="search"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Buscar cliente o concepto…"
                      aria-label="Buscar cobros"
                      className="praxis-search-input"
                    />
                  </div>

                  <div className="praxis-filter-bar" role="tablist" aria-label="Filtrar cobros por estado">
                    {CHARGE_FILTERS.map(({ id, label }) => (
                      <button
                        key={id}
                        type="button"
                        role="tab"
                        aria-selected={filter === id}
                        className={`praxis-filter-pill ${filter === id ? 'active' : ''}`}
                        onClick={() => setFilter(id)}
                      >
                        {label} ({filterCounts[id]})
                      </button>
                    ))}
                  </div>

                  {charges.charges.length === 0 && <p className="praxis-muted">No hay cobros con estos filtros.</p>}

                  {viewport === 'desktop' ? (
                    <div className="praxis-table-scroll">
                      <table className="praxis-table">
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
                          {charges.charges.map((charge) => (
                            <tr key={charge.chargeId}>
                              <td>
                                <strong>{charge.customerName}</strong>
                                <div className="praxis-subcell">{charge.chargeId} · v{charge.version}</div>
                              </td>
                              <td>
                                <strong>{charge.concept}</strong>
                                <div className="praxis-subcell">
                                  {charge.tags.map((tag) => `#${tag}`).join(' ')}
                                  {charge.note && ` 📝 ${charge.note}`}
                                </div>
                              </td>
                              <td className="text-right tabular">
                                <strong>{formatMxnCents(charge.amountCents)}</strong>
                              </td>
                              <td>
                                {renderBadge(charge)}
                                <div className="praxis-subcell">{renderStatusDetail(charge)}</div>
                              </td>
                              <td>
                                <span className="tabular">{charge.reminderCount} env.</span>
                              </td>
                              <td className="text-right">{renderActions(charge)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="praxis-mobile-cards">
                      {charges.charges.map((charge) => (
                        <div key={charge.chargeId} className="praxis-mobile-card">
                          <div className="praxis-mobile-card-top">
                            <div>
                              <strong>{charge.customerName}</strong>
                              <div className="praxis-subcell">{charge.concept}</div>
                              <div className="praxis-subcell">{renderStatusDetail(charge)}</div>
                            </div>
                            <div className="text-right">
                              <strong className="tabular">{formatMxnCents(charge.amountCents)}</strong>
                              <div>{renderBadge(charge)}</div>
                            </div>
                          </div>
                          <div className="praxis-mobile-card-actions">{renderActions(charge)}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {screen === 'clients' && (
              <div className="praxis-stack">
                <div className="praxis-section-head">
                  <div>
                    <h3>Clientes y saldos</h3>
                    <p className="praxis-muted">
                      {customers.counts.overdue} vencidos · {customers.counts.pending} pendientes · {customers.counts.upToDate} al día ·
                      plan {summary.customers.plan} ({summary.customers.active}/{summary.customers.limit ?? '∞'})
                    </p>
                  </div>
                </div>
                <div className="praxis-clients-grid">{customers.customers.map(renderCustomerCard)}</div>
              </div>
            )}

            {screen === 'payment' && (
              <div className="praxis-payment-grid">
                <form onSubmit={handleCreateCharge} className="praxis-card praxis-stack">
                  <div>
                    <span className="praxis-stage-tag">Módulo de cobros · simulado</span>
                    <h3>Crear cobro</h3>
                  </div>
                  <div className="form-field">
                    <label htmlFor="praxis-pay-customer">Cliente</label>
                    <select id="praxis-pay-customer" value={newCustomerId} onChange={(e) => setNewCustomerId(e.target.value)}>
                      {customers.customers.map((row) => (
                        <option key={row.customerId} value={row.customerId}>
                          {row.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-field">
                    <label htmlFor="praxis-pay-concept">Concepto (máx. {CONCEPT_MAX_LENGTH})</label>
                    <input id="praxis-pay-concept" maxLength={CONCEPT_MAX_LENGTH} value={newConcept} onChange={(e) => setNewConcept(e.target.value)} required />
                  </div>
                  <div className="form-field">
                    <label htmlFor="praxis-pay-amount">Monto en MXN</label>
                    <input id="praxis-pay-amount" type="number" min="0.01" step="0.01" value={newAmount} onChange={(e) => setNewAmount(e.target.value)} required />
                  </div>
                  <div className="form-field">
                    <label htmlFor="praxis-pay-due">Fecha límite</label>
                    <input id="praxis-pay-due" type="date" value={newDueDate} onChange={(e) => setNewDueDate(e.target.value)} required />
                  </div>
                  <button type="submit" className="praxis-btn-accent">
                    Generar cobro →
                  </button>
                </form>

                <div className="praxis-card praxis-stack">
                  <span className="praxis-stage-tag">Vista previa</span>
                  <div className="praxis-preview-dark">
                    <div className="praxis-preview-top">
                      <span>{profile.business.name}</span>
                      <span>CLABE {clabeLabel}</span>
                    </div>
                    <strong>
                      {newConcept} · {activeCustomer?.name ?? 'Cliente'}
                    </strong>
                    <div className="praxis-preview-amount tabular">{formatMxnCents(previewAmountCents)}</div>
                    <span className="praxis-subcell">Vence {formatDate(newDueDate)}</span>
                  </div>
                  {activeCustomer && customerPhones[activeCustomer.customerId] && (
                    <a
                      className="praxis-btn-accent text-center"
                      href={`https://wa.me/52${customerPhones[activeCustomer.customerId]}?text=${encodeURIComponent(
                        `Hola ${activeCustomer.name}, te comparto tu cobro por ${formatMxnCents(previewAmountCents)} (${newConcept}).`,
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      💬 Enviar por WhatsApp
                    </a>
                  )}
                </div>
              </div>
            )}

            {screen === 'workflow' && (
              <div className="praxis-kpi-grid">
                <div className="praxis-card">
                  <span className="praxis-stage-tag">Etapa 1 · Registro</span>
                  <h3>Onboarding + CLABE</h3>
                  <ul className="praxis-list">
                    <li><code>POST /api/onboarding</code> guarda negocio, RFC y CLABE.</li>
                    <li>El dinero va directo a la CLABE ({clabeLabel}).</li>
                  </ul>
                </div>
                <div className="praxis-card">
                  <span className="praxis-stage-tag">Etapa 2 · Cobros (pey)</span>
                  <h3>Payment Link + CoDi</h3>
                  <ul className="praxis-list">
                    <li>Los crea el módulo de cobros (<code>POST /api/payments</code>).</li>
                    <li>pey notifica el pago por webhook.</li>
                  </ul>
                </div>
                <div className="praxis-card">
                  <span className="praxis-stage-tag">Etapa 3 · Dashboard</span>
                  <h3>Ver y actualizar cobros</h3>
                  <ul className="praxis-list">
                    <li>Estados: pendiente, vencido, pagado y cancelado.</li>
                    <li>Registrar pago manual, cancelar y editar con control de versión.</li>
                  </ul>
                </div>
              </div>
            )}

            {screen === 'profile' && (
              <div className="praxis-card praxis-stack">
                <h3>Perfil del negocio</h3>
                <div className="praxis-profile-grid">
                  <div><span className="praxis-subcell">Nombre</span><strong>{profile.name}</strong></div>
                  <div><span className="praxis-subcell">Negocio</span><strong>{profile.business.name}</strong></div>
                  <div><span className="praxis-subcell">Profesión</span><strong>{profile.profession}</strong></div>
                  <div><span className="praxis-subcell">Giro</span><strong>{profile.business.activity}</strong></div>
                  <div>
                    <span className="praxis-subcell">RFC / Régimen</span>
                    <strong>
                      {profile.business.rfc} · {profile.business.taxRegime ?? 'Por definir'} ({profile.business.taxpayerType === 'individual' ? 'persona física' : profile.business.taxpayerType === 'company' ? 'persona moral' : 'tipo desconocido'})
                    </strong>
                  </div>
                  <div><span className="praxis-subcell">Cuenta de depósito</span><strong>CLABE {clabeLabel}</strong></div>
                  <div><span className="praxis-subcell">Primer cliente</span><strong>{profile.firstCustomer.name} · {profile.firstCustomer.phone}</strong></div>
                  <div>
                    <span className="praxis-subcell">Registro</span>
                    <strong>
                      {profile.onboarding.status === 'complete' ? 'Completo' : `Falta: ${profile.onboarding.pendingFields.join(', ')}`}
                    </strong>
                  </div>
                </div>
              </div>
            )}
          </div>

          {viewport === 'mobile' && (
            <nav className="praxis-mobile-bottom-nav" aria-label="Navegación móvil">
              <button type="button" onClick={() => setScreen('dashboard')} className={screen === 'dashboard' ? 'active' : ''}>📊 Dashboard</button>
              <button type="button" onClick={() => setScreen('clients')} className={screen === 'clients' ? 'active' : ''}>👥 Clientes</button>
              <button type="button" onClick={() => setScreen('payment')} className={screen === 'payment' ? 'active' : ''}>➕ Cobrar</button>
              <button type="button" onClick={() => setScreen('profile')} className={screen === 'profile' ? 'active' : ''}>👤 Perfil</button>
            </nav>
          )}
        </div>
      </div>

      {modal && (
        <div className="praxis-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="dashboard-modal-title">
          <div className="praxis-modal praxis-stack">
            <h4 id="dashboard-modal-title">
              {{ reminder: 'Enviar recordatorio', payment: 'Registrar pago manual', cancel: 'Cancelar cobro', edit: 'Editar cobro' }[modal.kind]}
            </h4>
            <p className="praxis-muted">
              <strong>{modal.charge.customerName}</strong> · {modal.charge.concept} · <strong>{formatMxnCents(modal.charge.amountCents)}</strong> · v
              {modal.charge.version}
            </p>
            {modalErrors.form && <p role="alert" className="field-error">{modalErrors.form}</p>}

            {modal.kind === 'reminder' && (
              <div className="praxis-row-actions">
                <button type="button" disabled={busy} className="praxis-btn-accent" onClick={() => handleReminder(modal.charge, 'WhatsApp')}>
                  💬 WhatsApp
                </button>
                <button type="button" disabled={busy} className="praxis-btn-primary" onClick={() => handleReminder(modal.charge, 'Correo')}>
                  ✉️ Correo
                </button>
                <button type="button" className="praxis-btn-secondary" onClick={() => setModal(null)}>Cerrar</button>
              </div>
            )}

            {modal.kind === 'payment' && (
              <form className="praxis-stack" onSubmit={(event) => handleManualPayment(event, modal.charge)}>
                <div className="form-field">
                  <label htmlFor="manual-method">Método</label>
                  <select id="manual-method" name="method" defaultValue="cash">
                    {MANUAL_PAYMENT_METHODS.map((method) => (
                      <option key={method} value={method}>{PAYMENT_METHOD_LABELS[method]}</option>
                    ))}
                  </select>
                </div>
                <div className="form-field">
                  <label htmlFor="manual-note">Nota (opcional)</label>
                  <input id="manual-note" name="note" maxLength={NOTE_MAX_LENGTH} />
                </div>
                <div className="praxis-row-actions">
                  <button type="submit" disabled={busy} className="praxis-btn-accent">Marcar como pagado</button>
                  <button type="button" className="praxis-btn-secondary" onClick={() => setModal(null)}>Cerrar</button>
                </div>
              </form>
            )}

            {modal.kind === 'cancel' && (
              <form className="praxis-stack" onSubmit={(event) => handleCancel(event, modal.charge)}>
                <div className="form-field">
                  <label htmlFor="cancel-reason">Motivo (opcional)</label>
                  <input id="cancel-reason" name="reason" maxLength={NOTE_MAX_LENGTH} />
                </div>
                <div className="praxis-row-actions">
                  <button type="submit" disabled={busy} className="praxis-btn-primary">Cancelar cobro</button>
                  <button type="button" className="praxis-btn-secondary" onClick={() => setModal(null)}>Volver</button>
                </div>
              </form>
            )}

            {modal.kind === 'edit' && (
              <form className="praxis-stack" onSubmit={(event) => handleEdit(event, modal.charge)}>
                {!canEdit(modal.charge, 'concept') && (
                  <p className="praxis-muted">Este cobro está {modal.charge.status === 'paid' ? 'pagado' : 'cancelado'}: solo puedes cambiar la nota y las etiquetas.</p>
                )}
                <div className="form-field">
                  <label htmlFor="edit-concept">{CHARGE_FIELD_LABELS.concept}</label>
                  <input id="edit-concept" name="concept" maxLength={CONCEPT_MAX_LENGTH} defaultValue={modal.charge.concept} disabled={!canEdit(modal.charge, 'concept')} />
                  {modalErrors.concept && <span className="field-error">{modalErrors.concept}</span>}
                </div>
                <div className="form-field">
                  <label htmlFor="edit-amount">{CHARGE_FIELD_LABELS.amountCents} (MXN)</label>
                  <input id="edit-amount" name="amount" type="number" min="0.01" step="0.01" defaultValue={modal.charge.amountCents / 100} disabled={!canEdit(modal.charge, 'amountCents')} />
                  {modalErrors.amountCents && <span className="field-error">{modalErrors.amountCents}</span>}
                </div>
                <div className="form-field">
                  <label htmlFor="edit-due">{CHARGE_FIELD_LABELS.dueDate}</label>
                  <input id="edit-due" name="dueDate" type="date" defaultValue={modal.charge.dueDate} disabled={!canEdit(modal.charge, 'dueDate')} />
                  {modalErrors.dueDate && <span className="field-error">{modalErrors.dueDate}</span>}
                </div>
                <div className="form-field">
                  <label htmlFor="edit-note">{CHARGE_FIELD_LABELS.note}</label>
                  <input id="edit-note" name="note" maxLength={NOTE_MAX_LENGTH} defaultValue={modal.charge.note ?? ''} />
                  {modalErrors.note && <span className="field-error">{modalErrors.note}</span>}
                </div>
                <div className="form-field">
                  <label htmlFor="edit-tags">{CHARGE_FIELD_LABELS.tags} (separadas por coma)</label>
                  <input id="edit-tags" name="tags" defaultValue={modal.charge.tags.join(', ')} />
                  {modalErrors.tags && <span className="field-error">{modalErrors.tags}</span>}
                </div>
                <div className="praxis-row-actions">
                  <button type="submit" disabled={busy} className="praxis-btn-accent">Guardar cambios</button>
                  <button type="button" className="praxis-btn-secondary" onClick={() => setModal(null)}>Cerrar</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
