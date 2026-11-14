package application

import "contractors-platform/backend/internal/modules/onboarding/domain"

type Service struct{ repository domain.Repository }

func New(repository domain.Repository) *Service { return &Service{repository: repository} }

func (service *Service) Create(input domain.Input) (domain.Onboarding, map[string]string, error) {
	input.Normalize()
	if errors := input.Validate(); len(errors) > 0 {
		return domain.Onboarding{}, errors, nil
	}
	record, err := service.repository.Create(input)
	return record, nil, err
}

func (service *Service) Find(id string) (domain.Onboarding, bool) { return service.repository.Find(id) }
