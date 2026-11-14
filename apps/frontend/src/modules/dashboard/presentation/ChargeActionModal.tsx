import { useEffect, type FormEvent } from 'react';
import type { DashboardChargeDto, ManualPaymentMethod } from '@platform/contracts';
import {
  CHARGE_FIELD_LABELS,
  CONCEPT_MAX_LENGTH,
  MANUAL_PAYMENT_METHODS,
  NOTE_MAX_LENGTH,
  PAYMENT_METHOD_LABELS,
  canEdit,
  formatMxnCents,
} from '../domain/dashboard';
import type { ChargeActionKind } from './PaymentsListView';

export type ActiveChargeModal = { kind: ChargeActionKind; charge: DashboardChargeDto };

interface ChargeActionModalProps {
  readonly modal: ActiveChargeModal | null;
  readonly modalErrors: Record<string, string>;
  readonly busy: boolean;
  readonly onClose: () => void;
  readonly onSendReminder: (charge: DashboardChargeDto, channel: 'WhatsApp' | 'Correo') => void;
  readonly onManualPayment: (event: FormEvent<HTMLFormElement>, charge: DashboardChargeDto) => void;
  readonly onCancelCharge: (event: FormEvent<HTMLFormElement>, charge: DashboardChargeDto) => void;
  readonly onEditCharge: (event: FormEvent<HTMLFormElement>, charge: DashboardChargeDto) => void;
}

const MODAL_TITLES: Record<ChargeActionKind, string> = {
  reminder: 'Enviar recordatorio',
  payment: 'Registrar pago manual',
  cancel: 'Cancelar cobro',
  edit: 'Editar cobro',
};

export function ChargeActionModal({
  modal,
  modalErrors,
  busy,
  onClose,
  onSendReminder,
  onManualPayment,
  onCancelCharge,
  onEditCharge,
}: ChargeActionModalProps) {
  useEffect(() => {
    if (!modal) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [modal, onClose]);

  if (!modal) return null;

  return (
    <div
      className="db-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dashboard-modal-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="db-modal db-stack">
        <div>
          <h4 id="dashboard-modal-title">{MODAL_TITLES[modal.kind]}</h4>
          <p className="db-muted">
            <strong>{modal.charge.customerName}</strong> · {modal.charge.concept} ·{' '}
            <strong className="tabular">{formatMxnCents(modal.charge.amountCents)}</strong> · v{modal.charge.version}
          </p>
        </div>

        {modalErrors.form && (
          <p role="alert" className="db-error-banner">
            {modalErrors.form}
          </p>
        )}

        {modal.kind === 'reminder' && (
          <div className="db-row-actions">
            <button
              type="button"
              disabled={busy}
              className="db-btn-accent"
              onClick={() => onSendReminder(modal.charge, 'WhatsApp')}
            >
              WhatsApp
            </button>
            <button
              type="button"
              disabled={busy}
              className="db-btn-primary"
              onClick={() => onSendReminder(modal.charge, 'Correo')}
            >
              Correo electrónico
            </button>
            <button type="button" className="db-btn-secondary" onClick={onClose}>
              Cerrar
            </button>
          </div>
        )}

        {modal.kind === 'payment' && (
          <form className="db-stack" onSubmit={(event) => onManualPayment(event, modal.charge)}>
            <div className="form-field">
              <label htmlFor="manual-method">Método de pago recibido</label>
              <select id="manual-method" name="method" defaultValue={'cash' satisfies ManualPaymentMethod}>
                {MANUAL_PAYMENT_METHODS.map((method) => (
                  <option key={method} value={method}>
                    {PAYMENT_METHOD_LABELS[method]}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label htmlFor="manual-note">Nota privada (opcional)</label>
              <input id="manual-note" name="note" maxLength={NOTE_MAX_LENGTH} placeholder="Ej. Pagó al entregar el trabajo" />
            </div>
            <div className="db-row-actions">
              <button type="submit" disabled={busy} className="db-btn-accent">
                {busy ? 'Guardando...' : 'Marcar como pagado'}
              </button>
              <button type="button" className="db-btn-secondary" onClick={onClose}>
                Cerrar
              </button>
            </div>
          </form>
        )}

        {modal.kind === 'cancel' && (
          <form className="db-stack" onSubmit={(event) => onCancelCharge(event, modal.charge)}>
            <div className="form-field">
              <label htmlFor="cancel-reason">Motivo de cancelación (opcional)</label>
              <input id="cancel-reason" name="reason" maxLength={NOTE_MAX_LENGTH} placeholder="Ej. Cambio de fecha con el cliente" />
            </div>
            <div className="db-row-actions">
              <button type="submit" disabled={busy} className="db-btn-primary">
                {busy ? 'Cancelando...' : 'Confirmar cancelación'}
              </button>
              <button type="button" className="db-btn-secondary" onClick={onClose}>
                Volver
              </button>
            </div>
          </form>
        )}

        {modal.kind === 'edit' && (
          <form className="db-stack" onSubmit={(event) => onEditCharge(event, modal.charge)}>
            {!canEdit(modal.charge, 'concept') && (
              <p className="db-muted">
                Este cobro está {modal.charge.status === 'paid' ? 'pagado' : 'cancelado'}: solo puedes actualizar la nota privada y las etiquetas.
              </p>
            )}
            <div className="form-field">
              <label htmlFor="edit-concept">{CHARGE_FIELD_LABELS.concept}</label>
              <input
                id="edit-concept"
                name="concept"
                maxLength={CONCEPT_MAX_LENGTH}
                defaultValue={modal.charge.concept}
                disabled={!canEdit(modal.charge, 'concept')}
              />
              {modalErrors.concept && <span className="field-error">{modalErrors.concept}</span>}
            </div>
            <div className="db-form-grid">
              <div className="form-field">
                <label htmlFor="edit-amount">{CHARGE_FIELD_LABELS.amountCents} (MXN)</label>
                <input
                  id="edit-amount"
                  name="amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  defaultValue={modal.charge.amountCents / 100}
                  disabled={!canEdit(modal.charge, 'amountCents')}
                />
                {modalErrors.amountCents && <span className="field-error">{modalErrors.amountCents}</span>}
              </div>
              <div className="form-field">
                <label htmlFor="edit-due">{CHARGE_FIELD_LABELS.dueDate}</label>
                <input
                  id="edit-due"
                  name="dueDate"
                  type="date"
                  defaultValue={modal.charge.dueDate}
                  disabled={!canEdit(modal.charge, 'dueDate')}
                />
                {modalErrors.dueDate && <span className="field-error">{modalErrors.dueDate}</span>}
              </div>
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
            <div className="db-row-actions">
              <button type="submit" disabled={busy} className="db-btn-accent">
                {busy ? 'Guardando...' : 'Guardar cambios'}
              </button>
              <button type="button" className="db-btn-secondary" onClick={onClose}>
                Cerrar
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
