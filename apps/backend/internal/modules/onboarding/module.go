package onboarding

import (
	"contractors-platform/backend/internal/modules/onboarding/application"
	"contractors-platform/backend/internal/modules/onboarding/domain"
	"contractors-platform/backend/internal/modules/onboarding/presentation"
	"net/http"
)

// Record is the onboarding record exposed to other modules.
type Record = domain.Onboarding

// Reader is the read-only public API other modules use to query onboarding.
type Reader interface {
	Find(id string) (Record, bool)
}

// Register mounts the onboarding routes and returns its public Reader.
func Register(mux *http.ServeMux, repository domain.Repository) Reader {
	service := application.New(repository)
	handler := presentation.New(service)
	mux.HandleFunc("POST /api/onboarding", handler.Create)
	mux.HandleFunc("GET /api/onboarding/{id}", handler.Find)
	return service
}
