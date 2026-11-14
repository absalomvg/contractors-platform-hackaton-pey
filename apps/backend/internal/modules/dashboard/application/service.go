package application

import (
	"context"
	"contractors-platform/backend/internal/modules/dashboard/domain"
)

type Service struct{ profiles domain.ProfileSource }

func New(profiles domain.ProfileSource) *Service { return &Service{profiles: profiles} }

// Profile returns the dashboard header or domain.ErrContractorNotFound.
func (service *Service) Profile(ctx context.Context, contractorID string) (domain.Profile, error) {
	contractor, err := service.profiles.FindContractor(ctx, contractorID)
	if err != nil {
		return domain.Profile{}, err
	}
	return domain.NewProfile(contractor), nil
}
