import type { ApiErrorResponse } from '@platform/contracts';
import { DashboardApiError, type DashboardGateway } from '../application/dashboard-gateway';

const dashboardPath = (contractorId: string) => `/api/contractors/${encodeURIComponent(contractorId)}/dashboard`;
const chargePath = (contractorId: string, chargeId: string) =>
  `${dashboardPath(contractorId)}/charges/${encodeURIComponent(chargeId)}`;

const FALLBACK_MESSAGE = 'No fue posible obtener la información del tablero.';

type QueryValue = string | number | boolean | undefined;

function withQuery(path: string, query: object = {}): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query as Record<string, QueryValue>)) {
    if (value !== undefined && value !== '') params.set(key, String(value));
  }
  const encoded = params.toString();
  return encoded ? `${path}?${encoded}` : path;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { Accept: 'application/json', ...(init.body ? { 'Content-Type': 'application/json' } : {}) },
  });
  if (!response.ok) {
    let error: ApiErrorResponse | undefined;
    try {
      error = await response.json();
    } catch {
      /* Non-JSON error body. */
    }
    throw new DashboardApiError(error?.message ?? FALLBACK_MESSAGE, response.status, error?.code, error?.errors);
  }
  return response.json() as Promise<T>;
}

const post = (body: unknown): RequestInit => ({ method: 'POST', body: JSON.stringify(body) });

/** Talks to the Go backend. Only `profile` is implemented server-side today. */
export const httpDashboardGateway: DashboardGateway = {
  profile: (id, signal) => request(`${dashboardPath(id)}/profile`, { signal }),
  summary: (id, query, signal) => request(withQuery(`${dashboardPath(id)}/summary`, query), { signal }),
  charges: (id, query, signal) => request(withQuery(`${dashboardPath(id)}/charges`, query), { signal }),
  customers: (id, query, signal) => request(withQuery(`${dashboardPath(id)}/customers`, query), { signal }),
  updateCharge: (id, chargeId, body) => request(chargePath(id, chargeId), { method: 'PATCH', body: JSON.stringify(body) }),
  recordManualPayment: (id, chargeId, body) => request(`${chargePath(id, chargeId)}/manual-payment`, post(body)),
  cancelCharge: (id, chargeId, body) => request(`${chargePath(id, chargeId)}/cancel`, post(body)),
};
