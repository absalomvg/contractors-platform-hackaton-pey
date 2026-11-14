package app

import (
	"contractors-platform/backend/internal/modules/dashboard"
	"contractors-platform/backend/internal/modules/onboarding"
	"contractors-platform/backend/internal/modules/onboarding/domain"
	"contractors-platform/backend/internal/modules/onboarding/infrastructure"
	"net/http"
)

// New builds the API with in-memory storage.
func New() http.Handler { return NewWith(infrastructure.NewMemoryRepository()) }

// NewWith builds the API on the given onboarding repository (e.g. SQLite).
func NewWith(onboardings domain.Repository) http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/health", func(writer http.ResponseWriter, request *http.Request) {
		writer.Header().Set("Content-Type", "application/json")
		_, _ = writer.Write([]byte(`{"status":"ok"}`))
	})
	mux.HandleFunc("GET /api/contractors", func(writer http.ResponseWriter, request *http.Request) {
		writer.Header().Set("Content-Type", "application/json")
		_, _ = writer.Write([]byte(`{"contractors":[]}`))
	})
	onboardingReader := onboarding.Register(mux, onboardings)
	dashboard.Register(mux, dashboard.NewOnboardingSource(onboardingReader))
	return mux
}
