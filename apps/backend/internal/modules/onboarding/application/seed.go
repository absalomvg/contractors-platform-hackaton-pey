package application

import (
	"contractors-platform/backend/internal/modules/onboarding/domain"
	"errors"
	"fmt"
)

// SeedUser creates a contractor record idempotently for system seeding (such as the demo account)
// without calling Pey or binding through Owners.
type SeedUser struct {
	repository domain.Repository
}

// NewSeedUser prepares a SeedUser use case.
func NewSeedUser(repository domain.Repository) *SeedUser {
	return &SeedUser{repository: repository}
}

// Ensure stores input if its CLABE is not already present and returns the contractor ID.
func (s *SeedUser) Ensure(input domain.Input) (string, error) {
	user, fieldErrors := domain.Build(input)
	if len(fieldErrors) > 0 {
		return "", fmt.Errorf("invalid seed onboarding input: %v", fieldErrors)
	}
	if existing, found := s.repository.FindByCLABE(user.CLABE); found {
		return existing.ID, nil
	}
	saved, err := s.repository.Save(user)
	if errors.Is(err, domain.ErrCLABETaken) {
		if existing, found := s.repository.FindByCLABE(user.CLABE); found {
			return existing.ID, nil
		}
	}
	if err != nil {
		return "", err
	}
	return saved.ID, nil
}
