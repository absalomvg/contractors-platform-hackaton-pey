package application

import "contractors-platform/backend/internal/modules/onboarding/domain"

// ReadUser recupera un usuario ya guardado.
type ReadUser struct{ repository domain.Repository }

// NewReadUser prepara el acto de lectura con el repositorio indicado.
func NewReadUser(repository domain.Repository) *ReadUser {
	return &ReadUser{repository: repository}
}

// Find devuelve el usuario en la forma que el formulario ya entiende.
func (act *ReadUser) Find(id string) (domain.Onboarding, bool) {
	user, found := act.repository.Find(id)
	if !found {
		return domain.Onboarding{}, false
	}
	return domain.View(user), true
}
