package application

import "contractors-platform/backend/internal/modules/onboarding/domain"

// RegisterUser guarda el usuario creado desde el formulario.
type RegisterUser struct{ repository domain.Repository }

// NewRegisterUser prepara el acto de alta con el repositorio indicado.
func NewRegisterUser(repository domain.Repository) *RegisterUser {
	return &RegisterUser{repository: repository}
}

// Create pide el usuario al contrato y lo guarda solo si el contrato lo permite.
func (act *RegisterUser) Create(input domain.Input) (domain.Onboarding, map[string]string, error) {
	user, fieldErrors := domain.Build(input)
	if len(fieldErrors) > 0 {
		return domain.Onboarding{}, fieldErrors, nil
	}
	saved, err := act.repository.Save(user)
	if err != nil {
		return domain.Onboarding{}, nil, err
	}
	return domain.View(saved), nil, nil
}
