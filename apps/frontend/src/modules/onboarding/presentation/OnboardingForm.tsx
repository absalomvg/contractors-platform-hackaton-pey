import { useRef, useState, type FormEvent } from 'react';
import { OnboardingError, type OnboardingGateway } from '../application/onboarding-gateway';
import { normalizeClabe, validateOnboarding, type FieldErrors, type OnboardingInput } from '../domain/onboarding';

const fields = [
  { name: 'name', label: 'Nombre', autoComplete: 'name' },
  { name: 'profession', label: 'Profesión' },
  { name: 'client.name', label: 'Nombre del usuario / cliente' },
  { name: 'client.phone', label: 'Teléfono del usuario / cliente', type: 'tel', autoComplete: 'tel' },
  { name: 'client.email', label: 'Email del usuario / cliente', type: 'email', autoComplete: 'email' },
  { name: 'businessName', label: 'Nombre del negocio', autoComplete: 'organization' },
  { name: 'businessActivity', label: 'Giro del negocio' },
  { name: 'rfc', label: 'RFC', maxLength: 13 },
  { name: 'clabe', label: 'CLABE donde recibirás tus cobros', inputMode: 'numeric' as const, maxLength: 22 },
  { name: 'taxRegime', label: 'Régimen fiscal (opcional)' },
];

type SubmissionState = { status: 'idle' | 'saving' } | { status: 'error'; message: string } | { status: 'success'; id: string };

export function OnboardingForm({ gateway }: { gateway: OnboardingGateway }) {
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submission, setSubmission] = useState<SubmissionState>({ status: 'idle' });
  const pending = useRef(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const value = (name: string) => String(data.get(name) ?? '').trim();
    const input: OnboardingInput = {
      name: value('name'),
      profession: value('profession'),
      client: { name: value('client.name'), phone: value('client.phone'), email: value('client.email') },
      businessName: value('businessName'),
      businessActivity: value('businessActivity'),
      rfc: value('rfc').toUpperCase(),
      clabe: normalizeClabe(value('clabe')),
      ...(value('taxRegime') ? { taxRegime: value('taxRegime') } : {}),
    };
    const nextErrors = validateOnboarding(input);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      setSubmission({ status: 'error', message: 'Revisa los campos indicados.' });
      const firstField = Object.keys(nextErrors)[0];
      if (firstField) (form.elements.namedItem(firstField) as HTMLInputElement | null)?.focus();
      return;
    }
    pending.current = true;
    setSubmission({ status: 'saving' });
    try {
      const onboarding = await gateway.create(input);
      setSubmission({ status: 'success', id: onboarding.id });
      form.reset();
    } catch (error) {
      setErrors(error instanceof OnboardingError ? error.fields : {});
      setSubmission({ status: 'error', message: error instanceof OnboardingError ? error.message : 'No fue posible conectar con el servidor. Inténtalo de nuevo.' });
    } finally {
      pending.current = false;
    }
  }

  return <section aria-labelledby="onboarding-title">
    <h2 id="onboarding-title">Registro inicial</h2>
    <p>Completa tus datos y los de tu negocio. Todos los campos son obligatorios salvo el régimen fiscal.</p>
    <form onSubmit={handleSubmit} noValidate aria-busy={submission.status === 'saving'}>
      <fieldset disabled={submission.status === 'saving'} className="onboarding-fields">
        <legend>Datos de registro</legend>
        {fields.map((field) => <div className="form-field" key={field.name}>
          <label htmlFor={`onboarding-${field.name}`}>{field.label}</label>
          <input
            id={`onboarding-${field.name}`}
            name={field.name}
            type={field.type ?? 'text'}
            inputMode={field.inputMode}
            autoComplete={field.autoComplete ?? 'off'}
            maxLength={field.maxLength ?? 255}
            required={field.name !== 'taxRegime'}
            aria-invalid={Boolean(errors[field.name])}
            aria-describedby={errors[field.name] ? `error-${field.name}` : undefined}
          />
          {errors[field.name] && <span className="field-error" id={`error-${field.name}`}>{errors[field.name]}</span>}
        </div>)}
      </fieldset>
      {submission.status === 'error' && <p role="alert" className="field-error">{submission.message}</p>}
      {submission.status === 'success' && <p role="status">Registro guardado correctamente. Folio: {submission.id}</p>}
      <button type="submit" disabled={submission.status === 'saving'}>{submission.status === 'saving' ? 'Guardando…' : 'Guardar registro'}</button>
    </form>
  </section>;
}
