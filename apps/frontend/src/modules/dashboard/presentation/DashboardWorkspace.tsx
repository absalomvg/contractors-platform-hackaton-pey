import { useEffect, useState, type FormEvent } from 'react';
import type { DashboardGateway } from '../application/dashboard-gateway';
import {
  computeCustomerBalances,
  DASHBOARD_PRESETS,
  formatMxnCents,
  type ChargeRecord,
  type ChargeStatus,
  type ContractorProfile,
  type CustomerRecord,
  type DashboardScreen,
  type DeliveryChannel,
  type FilterTab,
  type ServiceOption,
  type ViewportMode,
} from '../domain/dashboard';

interface DashboardWorkspaceProps {
  readonly gateway: DashboardGateway;
  readonly contractorId?: string;
}

export function DashboardWorkspace({ gateway, contractorId }: DashboardWorkspaceProps) {
  const [viewport, setViewport] = useState<ViewportMode>('desktop');
  const [screen, setScreen] = useState<DashboardScreen>('dashboard');
  const [presetKey, setPresetKey] = useState<'basket' | 'yoga' | 'english'>('basket');

  const [profile, setProfile] = useState<ContractorProfile>(DASHBOARD_PRESETS.basket.profile);
  const [services, setServices] = useState<ServiceOption[]>(DASHBOARD_PRESETS.basket.services);
  const [customers, setCustomers] = useState<CustomerRecord[]>(DASHBOARD_PRESETS.basket.customers);
  const [charges, setCharges] = useState<ChargeRecord[]>(DASHBOARD_PRESETS.basket.charges);

  const [filter, setFilter] = useState<FilterTab>('ALL');
  const [search, setSearch] = useState('');
  const [showFirstChargeGuide, setShowFirstChargeGuide] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const [selectedCustomerId, setSelectedCustomerId] = useState(DASHBOARD_PRESETS.basket.customers[0]?.id ?? 'cli_1');
  const [concept, setConcept] = useState('Mensualidad Noviembre');
  const [amountPesos, setAmountPesos] = useState('850');
  const [selectedChannel, setSelectedChannel] = useState<DeliveryChannel>('PAYMENT_LINK');

  const [reminderTargetId, setReminderTargetId] = useState<string | null>(null);
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => {
      setToast((current) => (current === message ? null : current));
    }, 3200);
  }

  useEffect(() => {
    if (!contractorId) return;
    const controller = new AbortController();
    gateway
      .fetchProfile(contractorId, controller.signal)
      .then((remote) => {
        if (controller.signal.aborted) return;
        setProfile(remote.profile);
        setCustomers((prev) => {
          const exists = prev.some((c) => c.name.toLowerCase() === remote.firstCustomer.name.toLowerCase());
          return exists ? prev : [remote.firstCustomer, ...prev];
        });
        setSelectedCustomerId(remote.firstCustomer.id);
        setShowFirstChargeGuide(true);
        notify(`Perfil sincronizado: ${remote.profile.businessName}`);
      })
      .catch(() => {
        /* Mantiene estado local de demostración si el backend no tiene el id */
      });
    return () => controller.abort();
  }, [contractorId, gateway]);

  function handlePresetChange(nextKey: 'basket' | 'yoga' | 'english') {
    const next = DASHBOARD_PRESETS[nextKey];
    setPresetKey(nextKey);
    setProfile(next.profile);
    setServices(next.services);
    setCustomers(next.customers);
    setCharges(next.charges);
    setSelectedCustomerId(next.customers[0]?.id ?? 'cli_1');
    if (next.services[0]) {
      setConcept(next.services[0].name);
      setAmountPesos(String(next.services[0].feeCents / 100));
    }
    notify(`Escenario cargado: ${next.profile.businessName}`);
  }

  function findCustomer(customerId: string): CustomerRecord {
    return (
      customers.find((item) => item.id === customerId) ?? {
        id: customerId,
        name: 'Cliente General',
        phone: '5500000000',
        email: 'cliente@ejemplo.mx',
        notes: '',
      }
    );
  }

  function openPaymentBuilder(customerId?: string, channel?: DeliveryChannel) {
    if (customerId) setSelectedCustomerId(customerId);
    if (channel) setSelectedChannel(channel);
    setScreen('payment');
  }

  function handleCreateCharge(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const numericPesos = Number(amountPesos);
    if (!Number.isFinite(numericPesos) || numericPesos <= 0) return;
    const amountCents = Math.round(numericPesos * 100);
    const customer = findCustomer(selectedCustomerId);
    const newCharge: ChargeRecord = {
      id: `pi_${Date.now()}`,
      customerId: selectedCustomerId,
      concept: concept.trim() || 'Servicio profesional',
      amountCents,
      channel: selectedChannel,
      status: 'PENDING_PAYMENT',
      reminderCount: 0,
      lastReminderLabel: 'Enviado hoy',
      dateLabel: '14 Nov',
    };
    setCharges((prev) => [newCharge, ...prev]);
    setFilter('ALL');
    setScreen('dashboard');
    notify(`Cobro creado (${selectedChannel === 'PAYMENT_LINK' ? 'Payment Link' : 'CoDi QR'}): ${formatMxnCents(amountCents)} para ${customer.name}`);
  }

  function handleMarkSettled(chargeId: string) {
    const target = charges.find((item) => item.id === chargeId);
    if (!target) return;
    const customer = findCustomer(target.customerId);
    setCharges((prev) =>
      prev.map((item) =>
        item.id === chargeId
          ? { ...item, status: 'SETTLED', lastReminderLabel: 'Liquidado webhook pey' }
          : item,
      ),
    );
    notify(`Pago acreditado: ${formatMxnCents(target.amountCents)} de ${customer.name} en •••• ${profile.clabeLast4}`);
  }

  function handleSimulateNextWebhook() {
    const nextPending = charges.find((item) => item.status !== 'SETTLED');
    if (!nextPending) {
      notify('Todos los cobros están liquidados.');
      return;
    }
    handleMarkSettled(nextPending.id);
  }

  function handleSendReminder(chargeId: string, via: 'WhatsApp' | 'Correo') {
    const target = charges.find((item) => item.id === chargeId);
    if (!target) return;
    const customer = findCustomer(target.customerId);
    setCharges((prev) =>
      prev.map((item) =>
        item.id === chargeId
          ? { ...item, reminderCount: item.reminderCount + 1, lastReminderLabel: `Hoy vía ${via}` }
          : item,
      ),
    );
    setReminderTargetId(null);
    notify(`Recordatorio enviado por ${via} a ${customer.name}`);
  }

  function handleSendBulkReminders() {
    const pendingCount = charges.filter((item) => item.status !== 'SETTLED').length;
    if (pendingCount === 0) {
      notify('No hay cobros pendientes por recordar.');
      return;
    }
    setCharges((prev) =>
      prev.map((item) =>
        item.status !== 'SETTLED'
          ? { ...item, reminderCount: item.reminderCount + 1, lastReminderLabel: 'Recordatorio masivo hoy' }
          : item,
      ),
    );
    notify(`Recordatorios enviados a ${pendingCount} cobros pendientes.`);
  }

  function handleCreateCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get('name') ?? '').trim();
    const phone = String(data.get('phone') ?? '').trim();
    const email = String(data.get('email') ?? '').trim() || 'cliente@ejemplo.mx';
    const notes = String(data.get('notes') ?? '').trim();
    if (!name || !phone) return;
    const created: CustomerRecord = {
      id: `cli_${Date.now()}`,
      name,
      phone,
      email,
      notes,
    };
    setCustomers((prev) => [created, ...prev]);
    setSelectedCustomerId(created.id);
    setShowNewCustomerModal(false);
    notify(`Cliente agregado: ${name}`);
  }

  const settledCharges = charges.filter((item) => item.status === 'SETTLED');
  const pendingCharges = charges.filter((item) => item.status !== 'SETTLED');
  const settledTotalCents = settledCharges.reduce((sum, item) => sum + item.amountCents, 0);
  const pendingTotalCents = pendingCharges.reduce((sum, item) => sum + item.amountCents, 0);
  const pendingCustomerCount = new Set(pendingCharges.map((item) => item.customerId)).size;

  const filteredCharges = charges.filter((item) => {
    const matchesTab = filter === 'ALL' || item.status === filter;
    const customer = findCustomer(item.customerId);
    const normalizedSearch = search.toLowerCase().trim();
    const matchesSearch =
      !normalizedSearch ||
      customer.name.toLowerCase().includes(normalizedSearch) ||
      item.concept.toLowerCase().includes(normalizedSearch);
    return matchesTab && matchesSearch;
  });

  const customerBalances = computeCustomerBalances(customers, charges);
  const activeCustomer = findCustomer(selectedCustomerId);
  const previewAmountCents = Math.max(0, Math.round((Number(amountPesos) || 0) * 100));
  const previewPaymentLink = `https://pey.mx/l/${profile.contractorId}-${selectedCustomerId}-${previewAmountCents}`;
  const reminderTarget = reminderTargetId ? charges.find((item) => item.id === reminderTargetId) ?? null : null;

  function renderStatusBadge(status: ChargeStatus) {
    if (status === 'SETTLED') {
      return <span className="praxis-badge praxis-badge-paid">✓ Pagado</span>;
    }
    if (status === 'EXPIRED') {
      return <span className="praxis-badge praxis-badge-expired">⚠ Vencido</span>;
    }
    return <span className="praxis-badge praxis-badge-pending">⏳ Pendiente</span>;
  }

  return (
    <section aria-labelledby="dashboard-workspace-title" className="praxis-workspace">
      {/* Barra de control superior (Desktop / Móvil + Vistas + Presets) */}
      <div className="praxis-toolbar">
        <div className="praxis-toolbar-group">
          <span id="dashboard-workspace-title" className="praxis-toolbar-label">Vista:</span>
          <div className="praxis-pill-toggle" role="group" aria-label="Selector de vista de dispositivo">
            <button
              type="button"
              className={viewport === 'desktop' ? 'active' : ''}
              onClick={() => setViewport('desktop')}
            >
              🖥️ Desktop
            </button>
            <button
              type="button"
              className={viewport === 'mobile' ? 'active' : ''}
              onClick={() => setViewport('mobile')}
            >
              📱 Móvil (390×844)
            </button>
          </div>
        </div>

        <div className="praxis-toolbar-group">
          <button
            type="button"
            className={`praxis-nav-pill ${screen === 'dashboard' ? 'active' : ''}`}
            onClick={() => setScreen('dashboard')}
          >
            1. Dashboard
          </button>
          <button
            type="button"
            className={`praxis-nav-pill ${screen === 'clients' ? 'active' : ''}`}
            onClick={() => setScreen('clients')}
          >
            2. Clientes ({customers.length})
          </button>
          <button
            type="button"
            className={`praxis-nav-pill ${screen === 'payment' ? 'active' : ''}`}
            onClick={() => setScreen('payment')}
          >
            3. Solicitar Pago
          </button>
          <button
            type="button"
            className={`praxis-nav-pill ${screen === 'workflow' ? 'active' : ''}`}
            onClick={() => setScreen('workflow')}
          >
            4. Flujo Workflow
          </button>
          <button
            type="button"
            className={`praxis-nav-pill ${screen === 'profile' ? 'active' : ''}`}
            onClick={() => setScreen('profile')}
          >
            5. Perfil
          </button>
        </div>

        <div className="praxis-toolbar-group">
          <select
            aria-label="Seleccionar giro de demostración"
            value={presetKey}
            onChange={(e) => handlePresetChange(e.target.value as 'basket' | 'yoga' | 'english')}
            className="praxis-select-compact"
          >
            <option value="basket">🏀 Prof. Basquetbol</option>
            <option value="yoga">🧘‍♀️ Instructora Yoga</option>
            <option value="english">🇬🇧 Maestro Inglés</option>
          </select>
          <button type="button" className="praxis-btn-webhook" onClick={handleSimulateNextWebhook}>
            ⚡ Simular Pago
          </button>
        </div>
      </div>

      {toast && (
        <div role="status" className="praxis-toast">
          <span>✓</span>
          <span>{toast}</span>
        </div>
      )}

      {/* Escenario adaptable (Desktop completo o Marco Móvil 390x844) */}
      <div className={viewport === 'mobile' ? 'praxis-stage-mobile-wrapper' : ''}>
        <div className={viewport === 'mobile' ? 'praxis-phone-frame' : 'praxis-desktop-frame'}>
          {viewport === 'mobile' && (
            <div className="praxis-phone-statusbar">
              <span className="tabular">9:41</span>
              <span className="praxis-phone-notch" />
              <span>5G · 100%</span>
            </div>
          )}

          {/* Encabezado del negocio */}
          <header className="praxis-app-header">
            <div className="praxis-brand">
              <div className="praxis-avatar">P</div>
              <div>
                <div className="praxis-brand-title">
                  <strong>{profile.businessName}</strong>
                  <span className="praxis-clabe-pill">•••• {profile.clabeLast4}</span>
                </div>
                <div className="praxis-brand-sub">
                  {profile.ownerName} · {profile.profession}
                </div>
              </div>
            </div>
            <div className="praxis-header-actions">
              <button
                type="button"
                className="praxis-btn-secondary"
                onClick={() => setShowFirstChargeGuide(true)}
              >
                Guía 1.er Cobro
              </button>
              <button
                type="button"
                className="praxis-btn-primary"
                onClick={() => openPaymentBuilder(undefined, 'PAYMENT_LINK')}
              >
                + Cobrar
              </button>
            </div>
          </header>

          <div className="praxis-stage-body">
            {showFirstChargeGuide && (
              <div className="praxis-first-charge-banner">
                <div>
                  <span className="praxis-banner-tag">🎉 Stage 1 completado · Haz tu 1.er cobro</span>
                  <h3>Envía tu primer link de pago a {customers[0]?.name ?? 'tu cliente'}</h3>
                  <p>
                    El pago se acredita sin comisión en tu CLABE <strong>•••• {profile.clabeLast4}</strong>.
                  </p>
                </div>
                <div className="praxis-banner-actions">
                  <button
                    type="button"
                    className="praxis-btn-accent"
                    onClick={() => {
                      openPaymentBuilder(customers[0]?.id, 'PAYMENT_LINK');
                      setShowFirstChargeGuide(false);
                    }}
                  >
                    💬 1. Envío WhatsApp (Payment Link)
                  </button>
                  <button
                    type="button"
                    className="praxis-btn-outline-light"
                    onClick={() => {
                      openPaymentBuilder(customers[0]?.id, 'CODI_QR');
                      setShowFirstChargeGuide(false);
                    }}
                  >
                    🏁 2. Mostrar QR CoDi
                  </button>
                  <button
                    type="button"
                    className="praxis-btn-close-light"
                    onClick={() => setShowFirstChargeGuide(false)}
                    aria-label="Cerrar guía"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* PANTALLA 1: DASHBOARD                                     */}
            {/* ========================================================= */}
            {screen === 'dashboard' && (
              <div className="praxis-stack">
                <div className="praxis-kpi-grid">
                  <div className="praxis-kpi-card">
                    <div className="praxis-kpi-top">
                      <span>COBRADO</span>
                      <span className="praxis-badge praxis-badge-paid">0% comisión</span>
                    </div>
                    <div className="praxis-kpi-value tabular">{formatMxnCents(settledTotalCents)}</div>
                    <div className="praxis-kpi-meta">
                      {settledCharges.length} pagos liquidados · CLABE •••• {profile.clabeLast4}
                    </div>
                  </div>

                  <div className="praxis-kpi-card">
                    <div className="praxis-kpi-top">
                      <span>POR COBRAR</span>
                      <span className="praxis-badge praxis-badge-pending">{pendingCharges.length} pend.</span>
                    </div>
                    <div className="praxis-kpi-value praxis-text-amber tabular">{formatMxnCents(pendingTotalCents)}</div>
                    <div className="praxis-kpi-meta">
                      En {pendingCustomerCount} clientes ·{' '}
                      <button type="button" className="praxis-link-btn" onClick={handleSendBulkReminders}>
                        🔔 Recordar a todos →
                      </button>
                    </div>
                  </div>

                  <div className="praxis-kpi-card">
                    <div className="praxis-kpi-top">
                      <span>CANALES ACTIVOS (PEY)</span>
                    </div>
                    <div className="praxis-quick-grid">
                      <button
                        type="button"
                        className="praxis-quick-btn"
                        onClick={() => openPaymentBuilder(undefined, 'PAYMENT_LINK')}
                      >
                        🔗 Payment Link
                      </button>
                      <button
                        type="button"
                        className="praxis-quick-btn"
                        onClick={() => openPaymentBuilder(undefined, 'CODI_QR')}
                      >
                        🏁 Código QR CoDi
                      </button>
                      <button
                        type="button"
                        className="praxis-quick-btn"
                        onClick={() => setShowNewCustomerModal(true)}
                      >
                        👤 + Cliente
                      </button>
                      <button
                        type="button"
                        className="praxis-quick-btn"
                        onClick={() => setScreen('workflow')}
                      >
                        🗺️ Ver Workflow
                      </button>
                    </div>
                  </div>
                </div>

                {/* Tabla / Lista de cobros con filtros */}
                <div className="praxis-card">
                  <div className="praxis-table-header">
                    <div>
                      <h3>Registro de Cobros y Recordatorios</h3>
                      <p className="praxis-muted">
                        Métodos soportados: <code>PAYMENT_LINK</code> y <code>CODI_QR</code>.
                      </p>
                    </div>
                    <input
                      type="search"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Buscar cliente o concepto…"
                      className="praxis-search-input"
                    />
                  </div>

                  <div className="praxis-filter-bar" role="tablist" aria-label="Filtrar cobros por estado">
                    <button
                      type="button"
                      className={`praxis-filter-pill ${filter === 'ALL' ? 'active' : ''}`}
                      onClick={() => setFilter('ALL')}
                    >
                      Todos ({charges.length})
                    </button>
                    <button
                      type="button"
                      className={`praxis-filter-pill ${filter === 'PENDING_PAYMENT' ? 'active' : ''}`}
                      onClick={() => setFilter('PENDING_PAYMENT')}
                    >
                      ⏳ Pendientes ({charges.filter((c) => c.status === 'PENDING_PAYMENT').length})
                    </button>
                    <button
                      type="button"
                      className={`praxis-filter-pill ${filter === 'SETTLED' ? 'active' : ''}`}
                      onClick={() => setFilter('SETTLED')}
                    >
                      ✓ Completados ({settledCharges.length})
                    </button>
                    <button
                      type="button"
                      className={`praxis-filter-pill ${filter === 'EXPIRED' ? 'active' : ''}`}
                      onClick={() => setFilter('EXPIRED')}
                    >
                      ⚠ Vencidos ({charges.filter((c) => c.status === 'EXPIRED').length})
                    </button>
                  </div>

                  {viewport === 'desktop' ? (
                    <div className="praxis-table-scroll">
                      <table className="praxis-table">
                        <thead>
                          <tr>
                            <th>Cliente / Contacto</th>
                            <th>Concepto y Canal</th>
                            <th className="text-right">Monto</th>
                            <th>Estatus</th>
                            <th>Recordatorios</th>
                            <th className="text-right">Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredCharges.map((charge) => {
                            const customer = findCustomer(charge.customerId);
                            return (
                              <tr key={charge.id}>
                                <td>
                                  <strong>{customer.name}</strong>
                                  <div className="praxis-subcell tabular">
                                    📱 {customer.phone} · {customer.email}
                                  </div>
                                </td>
                                <td>
                                  <strong>{charge.concept}</strong>
                                  <div className="praxis-subcell">
                                    {charge.channel === 'PAYMENT_LINK' ? '🔗 Payment Link' : '🏁 QR CoDi'} · {charge.dateLabel}
                                  </div>
                                </td>
                                <td className="text-right tabular">
                                  <strong>{formatMxnCents(charge.amountCents)}</strong>
                                </td>
                                <td>{renderStatusBadge(charge.status)}</td>
                                <td>
                                  <span className="tabular">{charge.reminderCount} env.</span>
                                  <div className="praxis-subcell">{charge.lastReminderLabel}</div>
                                </td>
                                <td className="text-right">
                                  {charge.status === 'SETTLED' ? (
                                    <span className="praxis-settled-text">Liquidado ✓</span>
                                  ) : (
                                    <div className="praxis-row-actions">
                                      <button
                                        type="button"
                                        className="praxis-action-btn warn"
                                        onClick={() => setReminderTargetId(charge.id)}
                                      >
                                        🔔 Recordar
                                      </button>
                                      <button
                                        type="button"
                                        className="praxis-action-btn"
                                        onClick={() => openPaymentBuilder(charge.customerId, 'CODI_QR')}
                                      >
                                        🏁 QR
                                      </button>
                                      <button
                                        type="button"
                                        className="praxis-action-btn ok"
                                        onClick={() => handleMarkSettled(charge.id)}
                                      >
                                        ⚡ Pagar
                                      </button>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="praxis-mobile-cards">
                      {filteredCharges.map((charge) => {
                        const customer = findCustomer(charge.customerId);
                        return (
                          <div key={charge.id} className="praxis-mobile-card">
                            <div className="praxis-mobile-card-top">
                              <div>
                                <strong>{customer.name}</strong>
                                <div className="praxis-subcell">{charge.concept}</div>
                                <div className="praxis-subcell tabular">
                                  {charge.channel === 'PAYMENT_LINK' ? '🔗 Link' : '🏁 QR CoDi'} · 📱 {customer.phone}
                                </div>
                              </div>
                              <div className="text-right">
                                <strong className="tabular">{formatMxnCents(charge.amountCents)}</strong>
                                <div>{renderStatusBadge(charge.status)}</div>
                              </div>
                            </div>
                            {charge.status !== 'SETTLED' && (
                              <div className="praxis-mobile-card-actions">
                                <button
                                  type="button"
                                  className="praxis-action-btn warn"
                                  onClick={() => setReminderTargetId(charge.id)}
                                >
                                  🔔 Recordar
                                </button>
                                <button
                                  type="button"
                                  className="praxis-action-btn"
                                  onClick={() => openPaymentBuilder(charge.customerId, 'CODI_QR')}
                                >
                                  🏁 QR
                                </button>
                                <button
                                  type="button"
                                  className="praxis-action-btn ok"
                                  onClick={() => handleMarkSettled(charge.id)}
                                >
                                  ⚡ Pagar
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* PANTALLA 2: CLIENTES Y SALDOS (Per Client Balance)        */}
            {/* ========================================================= */}
            {screen === 'clients' && (
              <div className="praxis-stack">
                <div className="praxis-section-head">
                  <div>
                    <h3>Clientes y Saldos (Per Client Balance)</h3>
                    <p className="praxis-muted">
                      Control de saldo pendiente e historial pagado por cada alumno o cliente.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="praxis-btn-primary"
                    onClick={() => setShowNewCustomerModal(true)}
                  >
                    + Nuevo Cliente
                  </button>
                </div>

                <div className="praxis-clients-grid">
                  {customerBalances.map(({ customer, pendingAmountCents, settledAmountCents }) => (
                    <div key={customer.id} className="praxis-card praxis-client-card">
                      <div className="praxis-client-top">
                        <div>
                          <strong>{customer.name}</strong>
                          <div className="praxis-subcell">{customer.notes || 'Cliente activo'}</div>
                        </div>
                        {pendingAmountCents > 0 ? (
                          <span className="praxis-badge praxis-badge-pending tabular">
                            Debe {formatMxnCents(pendingAmountCents)}
                          </span>
                        ) : (
                          <span className="praxis-badge praxis-badge-paid">✓ Al día</span>
                        )}
                      </div>

                      <div className="praxis-client-balances">
                        <div>
                          <span>Por cobrar</span>
                          <strong className="tabular">{formatMxnCents(pendingAmountCents)}</strong>
                        </div>
                        <div>
                          <span>Pagado</span>
                          <strong className="tabular">{formatMxnCents(settledAmountCents)}</strong>
                        </div>
                      </div>

                      <div className="praxis-subcell tabular">
                        📱 {customer.phone} · ✉️ {customer.email}
                      </div>

                      <div className="praxis-row-actions">
                        <button
                          type="button"
                          className="praxis-btn-primary"
                          onClick={() => openPaymentBuilder(customer.id, 'PAYMENT_LINK')}
                        >
                          🔗 Cobrar con Link
                        </button>
                        <button
                          type="button"
                          className="praxis-btn-secondary"
                          onClick={() => openPaymentBuilder(customer.id, 'CODI_QR')}
                        >
                          🏁 QR CoDi
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* PANTALLA 3: SOLICITAR PAGO (PAYMENT_LINK y CODI_QR)       */}
            {/* ========================================================= */}
            {screen === 'payment' && (
              <div className="praxis-payment-grid">
                <form onSubmit={handleCreateCharge} className="praxis-card praxis-stack">
                  <div>
                    <span className="praxis-stage-tag">Stage 2 · Request Payment</span>
                    <h3>Crear y enviar cobro</h3>
                  </div>

                  <div className="form-field">
                    <label htmlFor="praxis-pay-customer">1. Cliente / Alumno</label>
                    <select
                      id="praxis-pay-customer"
                      value={selectedCustomerId}
                      onChange={(e) => setSelectedCustomerId(e.target.value)}
                    >
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.phone})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-field">
                    <label htmlFor="praxis-pay-concept">2. Servicio o Concepto</label>
                    <div className="praxis-chips">
                      {services.map((service) => (
                        <button
                          key={service.name}
                          type="button"
                          className="praxis-chip"
                          onClick={() => {
                            setConcept(service.name);
                            setAmountPesos(String(service.feeCents / 100));
                          }}
                        >
                          {service.name} · {formatMxnCents(service.feeCents)}
                        </button>
                      ))}
                    </div>
                    <input
                      id="praxis-pay-concept"
                      type="text"
                      maxLength={40}
                      value={concept}
                      onChange={(e) => setConcept(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-field">
                    <label htmlFor="praxis-pay-amount">3. Monto en MXN (se procesa en centavos enteros)</label>
                    <input
                      id="praxis-pay-amount"
                      type="number"
                      min="1"
                      max="8000"
                      step="1"
                      value={amountPesos}
                      onChange={(e) => setAmountPesos(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-field">
                    <label>4. Método de cobro en api.pey.mx</label>
                    <div className="praxis-method-grid">
                      <button
                        type="button"
                        className={`praxis-method-card ${selectedChannel === 'PAYMENT_LINK' ? 'active' : ''}`}
                        onClick={() => setSelectedChannel('PAYMENT_LINK')}
                      >
                        <strong>🔗 Payment Link</strong>
                        <span>POST /payment-link/create (WhatsApp / Correo)</span>
                      </button>
                      <button
                        type="button"
                        className={`praxis-method-card ${selectedChannel === 'CODI_QR' ? 'active' : ''}`}
                        onClick={() => setSelectedChannel('CODI_QR')}
                      >
                        <strong>🏁 Código QR CoDi</strong>
                        <span>POST /codi/qr (Escaneo presencial)</span>
                      </button>
                    </div>
                  </div>

                  <button type="submit" className="praxis-btn-accent">
                    Generar Cobro y Guardar →
                  </button>
                </form>

                <div className="praxis-card praxis-stack">
                  {selectedChannel === 'PAYMENT_LINK' ? (
                    <>
                      <span className="praxis-stage-tag">Vista previa · Payment Link</span>
                      <div className="praxis-preview-dark">
                        <div className="praxis-preview-top">
                          <span>{profile.businessName}</span>
                          <span>CLABE •••• {profile.clabeLast4}</span>
                        </div>
                        <strong>
                          {concept} · {activeCustomer.name}
                        </strong>
                        <div className="praxis-preview-amount tabular">
                          {formatMxnCents(previewAmountCents)}
                        </div>
                        <code className="praxis-preview-url">{previewPaymentLink}</code>
                      </div>
                      <a
                        className="praxis-btn-accent text-center"
                        href={`https://wa.me/52${activeCustomer.phone}?text=${encodeURIComponent(
                          `Hola ${activeCustomer.name}, te comparto tu link de pago por ${formatMxnCents(previewAmountCents)} (${concept}): ${previewPaymentLink}`,
                        )}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        💬 Enviar Link por WhatsApp
                      </a>
                    </>
                  ) : (
                    <>
                      <span className="praxis-stage-tag">Vista previa · QR CoDi (POST /codi/qr)</span>
                      <div className="praxis-qr-box">
                        <div className="praxis-preview-amount tabular">
                          {formatMxnCents(previewAmountCents)}
                        </div>
                        <div className="praxis-subcell">
                          {concept} · {activeCustomer.name}
                        </div>
                        <svg viewBox="0 0 120 120" className="praxis-qr-svg" aria-label="Código QR CoDi">
                          <rect x="8" y="8" width="32" height="32" rx="4" fill="none" stroke="#151D2D" strokeWidth="6" />
                          <rect x="18" y="18" width="12" height="12" rx="2" fill="#151D2D" />
                          <rect x="80" y="8" width="32" height="32" rx="4" fill="none" stroke="#151D2D" strokeWidth="6" />
                          <rect x="90" y="18" width="12" height="12" rx="2" fill="#151D2D" />
                          <rect x="8" y="80" width="32" height="32" rx="4" fill="none" stroke="#151D2D" strokeWidth="6" />
                          <rect x="18" y="90" width="12" height="12" rx="2" fill="#151D2D" />
                          <rect x="48" y="48" width="24" height="24" rx="4" fill="#151D2D" />
                          <rect x="52" y="84" width="16" height="8" fill="#151D2D" />
                          <rect x="78" y="78" width="12" height="12" fill="#151D2D" />
                        </svg>
                        <div className="praxis-subcell">
                          Escanea desde cualquier app bancaria · 0% comisión
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* PANTALLA 4: FLUJO DE WORKFLOW (3 STAGES)                  */}
            {/* ========================================================= */}
            {screen === 'workflow' && (
              <div className="praxis-stack">
                <div className="praxis-kpi-grid">
                  <div className="praxis-card">
                    <span className="praxis-stage-tag">Stage 1 · Onboarding</span>
                    <h3>Registro + CLABE + 1.er Cliente</h3>
                    <ul className="praxis-list">
                      <li>Captura propietario, profesión, negocio, giro, RFC y régimen fiscal (<code>POST /api/onboarding</code>).</li>
                      <li>Enruta pagos directo a la CLABE del profesional (<code>•••• {profile.clabeLast4}</code>).</li>
                      <li>Activa guía inmediata: <strong>Haz tu 1.er cobro</strong>.</li>
                    </ul>
                  </div>

                  <div className="praxis-card">
                    <span className="praxis-stage-tag">Stage 2 · Payments (pey)</span>
                    <h3>Payment Link + CoDi QR</h3>
                    <ul className="praxis-list">
                      <li><strong>PAYMENT_LINK (<code>POST /payment-link/create</code>):</strong> genera URL para enviar por WhatsApp, correo o mensaje.</li>
                      <li><strong>CODI_QR (<code>POST /codi/qr</code>):</strong> presenta código QR dinámico en pantalla para cobro presencial.</li>
                      <li>Montos representados internamente en centavos enteros (<code>amountCents</code>).</li>
                    </ul>
                  </div>

                  <div className="praxis-card">
                    <span className="praxis-stage-tag">Stage 3 · Dashboard & Clientes</span>
                    <h3>Conciliación, Filtros y Recordatorios</h3>
                    <ul className="praxis-list">
                      <li>Tabla con filtros (<code>Todos · Pendientes · Completados · Vencidos</code>) y badges semánticos.</li>
                      <li>Envío de recordatorios en un clic (<code>MSJ Reminder</code>).</li>
                      <li>Cálculo automático de saldo por cliente (<code>Per Client Balance</code>) al recibir el webhook firmado de <code>pey</code>.</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* PANTALLA 5: PERFIL DEL CONTRATISTA                        */}
            {/* ========================================================= */}
            {screen === 'profile' && (
              <div className="praxis-card praxis-stack">
                <h3>Perfil del Contratista (`/api/contractors/{'{id}'}/dashboard/profile`)</h3>
                <div className="praxis-profile-grid">
                  <div>
                    <span className="praxis-subcell">Nombre</span>
                    <strong>{profile.ownerName}</strong>
                  </div>
                  <div>
                    <span className="praxis-subcell">Negocio</span>
                    <strong>{profile.businessName}</strong>
                  </div>
                  <div>
                    <span className="praxis-subcell">Profesión</span>
                    <strong>{profile.profession}</strong>
                  </div>
                  <div>
                    <span className="praxis-subcell">Giro / Actividad</span>
                    <strong>{profile.businessActivity}</strong>
                  </div>
                  <div>
                    <span className="praxis-subcell">RFC / Régimen</span>
                    <strong>
                      {profile.rfc} · {profile.taxRegime}
                    </strong>
                  </div>
                  <div>
                    <span className="praxis-subcell">Cuenta destino en pey</span>
                    <strong>CLABE •••• {profile.clabeLast4} (Activa)</strong>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Barra inferior cuando está activa la Vista Móvil */}
          {viewport === 'mobile' && (
            <nav className="praxis-mobile-bottom-nav" aria-label="Navegación móvil">
              <button type="button" onClick={() => setScreen('dashboard')} className={screen === 'dashboard' ? 'active' : ''}>
                📊 Dashboard
              </button>
              <button type="button" onClick={() => setScreen('clients')} className={screen === 'clients' ? 'active' : ''}>
                👥 Clientes
              </button>
              <button type="button" onClick={() => setScreen('payment')} className={screen === 'payment' ? 'active' : ''}>
                ➕ Cobrar
              </button>
              <button type="button" onClick={() => setScreen('workflow')} className={screen === 'workflow' ? 'active' : ''}>
                🗺️ Flujo
              </button>
            </nav>
          )}
        </div>
      </div>

      {/* Modal: Recordatorio MSJ Reminder */}
      {reminderTarget && (
        <div className="praxis-modal-backdrop" role="dialog" aria-modal="true" aria-label="Enviar recordatorio">
          <div className="praxis-modal">
            <h4>Recordatorio de pago (MSJ Reminder)</h4>
            <p className="praxis-muted">
              Cliente: <strong>{findCustomer(reminderTarget.customerId).name}</strong> ·{' '}
              <strong>{formatMxnCents(reminderTarget.amountCents)}</strong> ({reminderTarget.concept})
            </p>
            <div className="praxis-row-actions">
              <button
                type="button"
                className="praxis-btn-accent"
                onClick={() => handleSendReminder(reminderTarget.id, 'WhatsApp')}
              >
                💬 Enviar por WhatsApp
              </button>
              <button
                type="button"
                className="praxis-btn-primary"
                onClick={() => handleSendReminder(reminderTarget.id, 'Correo')}
              >
                ✉️ Enviar por Correo
              </button>
              <button
                type="button"
                className="praxis-btn-secondary"
                onClick={() => setReminderTargetId(null)}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Nuevo Cliente */}
      {showNewCustomerModal && (
        <div className="praxis-modal-backdrop" role="dialog" aria-modal="true" aria-label="Nuevo cliente">
          <form onSubmit={handleCreateCustomer} className="praxis-modal praxis-stack">
            <h4>Agregar Nuevo Cliente</h4>
            <div className="form-field">
              <label htmlFor="new-cust-name">Nombre completo *</label>
              <input id="new-cust-name" name="name" required />
            </div>
            <div className="form-field">
              <label htmlFor="new-cust-phone">Teléfono (10 dígitos) *</label>
              <input id="new-cust-phone" name="phone" maxLength={15} required />
            </div>
            <div className="form-field">
              <label htmlFor="new-cust-email">Email</label>
              <input id="new-cust-email" name="email" type="email" />
            </div>
            <div className="form-field">
              <label htmlFor="new-cust-notes">Grupo / Horario</label>
              <input id="new-cust-notes" name="notes" />
            </div>
            <div className="praxis-row-actions">
              <button type="submit" className="praxis-btn-primary">
                Guardar Cliente
              </button>
              <button
                type="button"
                className="praxis-btn-secondary"
                onClick={() => setShowNewCustomerModal(false)}
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
