import type { DashboardProfileDto } from '@platform/contracts';
import { formatMxPhone } from '../domain/dashboard';

export interface DemoControls {
  simulateProviderPayment(contractorId?: string): string | null;
  simulateConcurrentEdit(chargeId: string, contractorId?: string): void;
  reset(contractorId?: string): void;
}

interface ProfileViewProps {
  readonly profile: DashboardProfileDto;
  readonly clabeLabel: string;
  readonly demo?: DemoControls;
  readonly onSimulatePayment: () => void;
  readonly onSimulateConflict: () => void;
  readonly onResetDemo: () => void;
  readonly onSignOut?: () => void;
}

const TAXPAYER_LABELS: Record<DashboardProfileDto['business']['taxpayerType'], string> = {
  individual: 'Persona física',
  company: 'Persona moral',
  unknown: 'Por confirmar',
};

export function ProfileView({
  profile,
  clabeLabel,
  demo,
  onSimulatePayment,
  onSimulateConflict,
  onResetDemo,
  onSignOut,
}: ProfileViewProps) {
  return (
    <div className="db-stack">
      <div className="db-section-header">
        <div>
          <h2>Perfil y cuenta de depósito</h2>
          <p className="db-muted">Datos fiscales y bancarios conectados a tu registro.</p>
        </div>
        {onSignOut && (
          <button type="button" className="db-btn-secondary" onClick={onSignOut}>
            Cambiar de cuenta
          </button>
        )}
      </div>

      <section className="db-card db-stack" aria-label="Datos del negocio">
        <div className="db-profile-grid">
          <div className="db-profile-item">
            <span>Titular</span>
            <strong>{profile.name}</strong>
          </div>
          <div className="db-profile-item">
            <span>Negocio</span>
            <strong>{profile.business.name}</strong>
          </div>
          <div className="db-profile-item">
            <span>Profesión</span>
            <strong>{profile.profession}</strong>
          </div>
          <div className="db-profile-item">
            <span>Giro</span>
            <strong>{profile.business.activity}</strong>
          </div>
          <div className="db-profile-item">
            <span>RFC y régimen</span>
            <strong>
              {profile.business.rfc} · {profile.business.taxRegime ?? 'Por definir'} ({TAXPAYER_LABELS[profile.business.taxpayerType]})
            </strong>
          </div>
          <div className="db-profile-item">
            <span>Cuenta CLABE destino</span>
            <strong className="tabular">{clabeLabel}</strong>
          </div>
          <div className="db-profile-item">
            <span>Primer cliente registrado</span>
            <strong>
              {profile.firstCustomer.name} · +52 {formatMxPhone(profile.firstCustomer.phone)}
            </strong>
          </div>
          <div className="db-profile-item">
            <span>Estado del onboarding</span>
            <strong>
              {profile.onboarding.status === 'complete'
                ? 'Completo'
                : `Pendiente: ${profile.onboarding.pendingFields.join(', ')}`}
            </strong>
          </div>
        </div>
      </section>

      {demo && (
        <section className="db-card db-stack" aria-label="Herramientas de prueba local">
          <div>
            <h3>Herramientas de prueba local</h3>
            <p className="db-muted">
              Simula notificaciones CoDi o conflictos de concurrencia mientras el módulo de pagos backend está en desarrollo.
            </p>
          </div>
          <div className="db-row-actions">
            <button type="button" className="db-btn-primary" onClick={onSimulatePayment}>
              Simular pago CoDi recibido
            </button>
            <button type="button" className="db-btn-secondary" onClick={onSimulateConflict}>
              Simular conflicto v409
            </button>
            <button type="button" className="db-btn-ghost" onClick={onResetDemo}>
              Restaurar datos demo
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
