package presentation

import "contractors-platform/backend/internal/modules/dashboard/domain"

type ProfileResponse struct {
	ContractorID string                    `json:"contractorId"`
	Name         string                    `json:"name"`
	Profession   string                    `json:"profession"`
	Business     BusinessResponse          `json:"business"`
	Contact      ContactResponse           `json:"contact"`
	Onboarding   OnboardingSummaryResponse `json:"onboarding"`
}

type BusinessResponse struct {
	Name         string              `json:"name"`
	Activity     string              `json:"activity"`
	RFC          string              `json:"rfc"`
	TaxRegime    *string             `json:"taxRegime,omitempty"`
	TaxpayerType domain.TaxpayerType `json:"taxpayerType"`
	ClabeLast4   *string             `json:"clabeLast4"`
}

type ContactResponse struct {
	Name  string `json:"name"`
	Phone string `json:"phone"`
	Email string `json:"email"`
}

type OnboardingSummaryResponse struct {
	Status        domain.OnboardingStatus `json:"status"`
	PendingFields []domain.Field          `json:"pendingFields"`
}

func toProfileResponse(profile domain.Profile) ProfileResponse {
	return ProfileResponse{
		ContractorID: profile.ContractorID,
		Name:         profile.Name,
		Profession:   profile.Profession,
		Business: BusinessResponse{
			Name:         profile.Business.Name,
			Activity:     profile.Business.Activity,
			RFC:          profile.Business.RFC,
			TaxRegime:    profile.Business.TaxRegime,
			TaxpayerType: profile.Business.TaxpayerType,
			ClabeLast4:   profile.Business.ClabeLast4,
		},
		Contact: ContactResponse{Name: profile.Contact.Name, Phone: profile.Contact.Phone, Email: profile.Contact.Email},
		Onboarding: OnboardingSummaryResponse{
			Status:        profile.Onboarding.Status,
			PendingFields: profile.Onboarding.PendingFields,
		},
	}
}
