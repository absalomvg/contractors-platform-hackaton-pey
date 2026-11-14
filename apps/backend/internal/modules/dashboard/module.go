// Package dashboard serves the read models of the contractor dashboard.
package dashboard

import (
	"contractors-platform/backend/internal/modules/dashboard/application"
	"contractors-platform/backend/internal/modules/dashboard/domain"
	"contractors-platform/backend/internal/modules/dashboard/infrastructure"
	"contractors-platform/backend/internal/modules/dashboard/presentation"
	"contractors-platform/backend/internal/modules/onboarding"
	"net/http"
)

// Register mounts the implemented dashboard routes. Summary, trend, customers,
// activity and events are contract-only until their sources exist.
func Register(mux *http.ServeMux, profiles domain.ProfileSource) {
	handler := presentation.New(application.New(profiles))
	mux.HandleFunc(presentation.ProfileRoutePattern, handler.Profile)
}

// NewOnboardingSource adapts the public onboarding API to domain.ProfileSource.
func NewOnboardingSource(records onboarding.Reader) domain.ProfileSource {
	return infrastructure.NewOnboardingSource(records)
}
