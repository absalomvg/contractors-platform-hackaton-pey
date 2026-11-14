import { useRef, useState, type FormEvent } from 'react';
import { OnboardingError, type OnboardingGateway } from '../application/onboarding-gateway';
import { normalizeClabe, validateOnboarding, type FieldErrors, type OnboardingInput } from '../domain/onboarding';

interface FieldConfig {
  readonly name: string;
  readonly label: string;
  readonly hint?: string;
  readonly type?: string;
  readonly autoComplete?: string;
  readonly inputMode?: 'numeric' | 'tel' | 'email';
  readonly maxLength?: number;
  readonly placeholder?: string;
}

/* `client.*` is the business's first customer (docs/workflow.md, Stage 1),
 * not the person registering. */
const sections: readonly { readonly title: string; readonly description: string; readonly fields: readonly FieldConfig[] }[] = [
  {
    title: '1. Tus datos',
    description: 'Quién eres y a qué te dedicas.',
    fields: [
      { name: 'name', label: 'Tu nombre completo', autoComplete: 'name' },
      { name: 'profession', label: 'Tu profesión u oficio', placeholder: 'Ej. Electricista, maestra de inglés' },
    ],
  },
  {
    title: '2. Tu negocio',
    description: 'Así te verán tus clientes en cada cobro.',
    fields: [
      { name: 'businessName', label: 'Nombre del negocio', autoComplete: 'organization' },
      { name: 'businessActivity', label: 'Giro del negocio', placeholder: 'Ej. Instalaciones eléctricas' },
      { name: 'rfc', label: 'RFC', maxLength: 13, hint: '12 o 13 caracteres.' },
      { name: 'taxRegime', label: 'Régimen fiscal (opcional)', placeholder: 'Ej. RESICO' },
      {
        name: 'clabe',
        label: 'CLABE para recibir tus pagos',
        inputMode: 'numeric',
        maxLength: 22,
        hint: '18 dígitos. El dinero llega directo a esta cuenta; nosotros nunca lo tocamos.',
      },
    ],
  },
  {
    title: '3. Tu primer cliente',
    description: 'La persona a la que le harás tu primer cobro. Podrás agregar más clientes después.',
    fields: [
      { name: 'client.name', label: 'Nombre de tu cliente' },
      { name: 'client.phone', label: 'Teléfono de tu cliente', type: 'tel', inputMode: 'tel', hint: 'Le enviaremos el cobro por WhatsApp.' },
      { name: 'client.email', label: 'Email de tu cliente', type: 'email', inputMode: 'email' },
    ],
  },
];

type SubmissionState = { status: 'idle' | 'saving' } | { status: 'error'; message: string } | { status: 'success'; id: string };

export function OnboardingForm({ gateway, onCreated }: { gateway: OnboardingGateway; onCreated?: (id: string) => void }) {
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
      onCreated?.(onboarding.id);
    } catch (error) {
      setErrors(error instanceof OnboardingError ? error.fields : {});
      setSubmission({ status: 'error', message: error instanceof OnboardingError ? error.message : 'No fue posible conectar con el servidor. Inténtalo de nuevo.' });
    } finally {
      pending.current = false;
    }
  }

  return <section aria-labelledby="onboarding-title">
    <h2 id="onboarding-title">Registro inicial</h2>
    <p>Tres pasos y listo: tus datos, tu negocio y tu primer cliente. Todo es obligatorio salvo el régimen fiscal.</p>
    <form onSubmit={handleSubmit} noValidate aria-busy={submission.status === 'saving'}>
      {sections.map((section) => <fieldset key={section.title} disabled={submission.status === 'saving'} className="onboarding-fields">
        <legend>{section.title}<span className="onboarding-section-description">{section.description}</span></legend>
        {section.fields.map((field) => {
          const describedBy = [field.hint && `hint-${field.name}`, errors[field.name] && `error-${field.name}`].filter(Boolean).join(' ');
          return <div className="form-field" key={field.name}>
            <label htmlFor={`onboarding-${field.name}`}>{field.label}</label>
            <input
              id={`onboarding-${field.name}`}
              name={field.name}
              type={field.type ?? 'text'}
              inputMode={field.inputMode}
              autoComplete={field.autoComplete ?? 'off'}
              maxLength={field.maxLength ?? 255}
              placeholder={field.placeholder}
              required={field.name !== 'taxRegime'}
              aria-invalid={Boolean(errors[field.name])}
              aria-describedby={describedBy || undefined}
            />
            {field.hint && <span className="field-hint" id={`hint-${field.name}`}>{field.hint}</span>}
            {errors[field.name] && <span className="field-error" id={`error-${field.name}`}>{errors[field.name]}</span>}
          </div>;
        })}
      </fieldset>)}
      {submission.status === 'error' && <p role="alert" className="field-error">{submission.message}</p>}
      {submission.status === 'success' && <p role="status">Registro guardado correctamente. Folio: {submission.id}</p>}
      <button type="submit" disabled={submission.status === 'saving'}>{submission.status === 'saving' ? 'Guardando…' : 'Guardar registro'}</button>
    </form>
  </section>;
}
