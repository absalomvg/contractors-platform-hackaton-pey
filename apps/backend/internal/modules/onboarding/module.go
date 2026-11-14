package onboarding

import (
	"contractors-platform/backend/internal/modules/onboarding/application"
	"contractors-platform/backend/internal/modules/onboarding/domain"
	"contractors-platform/backend/internal/modules/onboarding/presentation"
	"net/http"
)

func Register(mux *http.ServeMux, repository domain.Repository) {
	handler := presentation.New(application.NewRegisterUser(repository), application.NewReadUser(repository))
	mux.HandleFunc("POST /api/onboarding", handler.Create)
	mux.HandleFunc("GET /api/onboarding/{id}", handler.Find)
}
