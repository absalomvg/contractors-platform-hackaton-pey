import type { DashboardProfileDto } from '@platform/contracts';
import type { DashboardGateway } from '../application/dashboard-gateway';

export const httpDashboardGateway: DashboardGateway = {
  async fetchProfile(contractorId, signal) {
    const response = await fetch(`/api/contractors/${encodeURIComponent(contractorId)}/dashboard/profile`, {
      headers: { Accept: 'application/json' },
      signal,
    });
    if (!response.ok) {
      throw new Error('No fue posible cargar el perfil del dashboard.');
    }
    const dto: DashboardProfileDto = await response.json();
    return {
      profile: {
        contractorId: dto.contractorId,
        ownerName: dto.name,
        businessName: dto.business.name,
        profession: dto.profession,
        businessActivity: dto.business.activity,
        rfc: dto.business.rfc,
        taxRegime: dto.business.taxRegime ?? 'Por definir',
        phone: dto.contact.phone,
        clabeLast4: '4821',
      },
      firstCustomer: {
        id: `cli_${dto.contractorId.slice(0, 6)}`,
        name: dto.contact.name,
        phone: dto.contact.phone,
        email: dto.contact.email,
        notes: 'Registrado en Onboarding',
      },
    };
  },
};
