import { useEffect, useState } from 'react';
import type { ContractorGateway } from '../application/contractor-gateway';
import type { Contractor } from '../domain/contractor';

type State = { status: 'loading' } | { status: 'error' } | { status: 'ready'; contractors: Contractor[] };

export function ContractorsPage({ gateway }: { gateway: ContractorGateway }) {
  const [state, setState] = useState<State>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setState({ status: 'loading' });
    gateway.list(controller.signal).then(
      (contractors) => { if (!controller.signal.aborted) setState({ status: 'ready', contractors }); },
      () => { if (!controller.signal.aborted) setState({ status: 'error' }); },
    );
    return () => controller.abort();
  }, [gateway, attempt]);

  return <section aria-labelledby="contractors-title">
    <h2 id="contractors-title">Contratistas</h2>
    {state.status === 'loading' && <p role="status">Cargando contratistas…</p>}
    {state.status === 'error' && <div role="alert"><p>No fue posible cargar los contratistas.</p><button onClick={() => setAttempt((value) => value + 1)}>Reintentar</button></div>}
    {state.status === 'ready' && (state.contractors.length === 0
      ? <p>Aún no hay contratistas registrados.</p>
      : <ul>{state.contractors.map((contractor) => <li key={contractor.id}><strong>{contractor.name}</strong> · {contractor.specialty}</li>)}</ul>)}
  </section>;
}
