/** Transport DTOs only. No domain entities or business logic. */
export interface ContractorDto {
  id: string;
  name: string;
  specialty: string;
}

export interface ListContractorsResponse {
  contractors: ContractorDto[];
}

export interface ClientDto {
  name: string;
  phone: string;
  email: string;
}

export interface CreateOnboardingRequest {
  name: string;
  profession: string;
  client: ClientDto;
  taxRegime?: string;
  businessName: string;
  businessActivity: string;
  rfc: string;
}

export interface OnboardingDto extends CreateOnboardingRequest {
  id: string;
}

export interface ApiErrorResponse {
  message: string;
  errors?: Record<string, string>;
}
