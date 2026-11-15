package app

import (
	"context"
	"contractors-platform/backend/internal/modules/accounts"
	accdomain "contractors-platform/backend/internal/modules/accounts/domain"
	accinfra "contractors-platform/backend/internal/modules/accounts/infrastructure"
	"contractors-platform/backend/internal/modules/dashboard"
	"contractors-platform/backend/internal/modules/onboarding"
	onbdomain "contractors-platform/backend/internal/modules/onboarding/domain"
	onbinfra "contractors-platform/backend/internal/modules/onboarding/infrastructure"
	"net/http"
	"time"
)

// Dependencies wires storage, external clients, and authentication policy into the API.
type Dependencies struct {
	Onboardings onbdomain.Repository
	Accounts    accdomain.Repository
	Banks       onbdomain.BankRegistrar
	Hasher      accdomain.PINHasher
	Mailer      accdomain.Mailer
	Policy      accdomain.Policy
	Clock       accdomain.Clock
}

// New builds the API with in-memory storage, strict auth policy, fast test PBKDF2, and no Pey key.
func New() http.Handler {
	handler, err := NewWith(Dependencies{
		Onboardings: onbinfra.NewMemoryRepository(),
		Accounts:    accinfra.NewMemoryRepository(),
		Banks:       onbinfra.NewUnavailablePey(),
		Hasher:      accounts.NewPBKDF2Hasher(1_000),
		Mailer:      accounts.NewLogMailer(),
		Policy:      accdomain.StrictPolicy(),
		Clock:       time.Now,
	})
	if err != nil {
		panic(err)
	}
	return handler
}

// NewWith builds the API with explicit dependencies and seeds the demo account when enabled.
func NewWith(deps Dependencies) (http.Handler, error) {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/health", func(writer http.ResponseWriter, _ *http.Request) {
		writer.Header().Set("Content-Type", "application/json")
		_, _ = writer.Write([]byte(`{"status":"ok"}`))
	})
	mux.HandleFunc("GET /api/contractors", func(writer http.ResponseWriter, _ *http.Request) {
		writer.Header().Set("Content-Type", "application/json")
		_, _ = writer.Write([]byte(`{"contractors":[]}`))
	})

	acc := accounts.Register(mux, accounts.Deps{
		Repository: deps.Accounts,
		Hasher:     deps.Hasher,
		Mailer:     deps.Mailer,
		Policy:     deps.Policy,
		Clock:      deps.Clock,
	})
	onb := onboarding.Register(mux, deps.Onboardings, deps.Banks, acc.Owners, acc.Guard)
	dashboard.Register(mux, dashboard.NewOnboardingSource(onb.Reader), acc.Guard)

	if err := seedDemo(context.Background(), acc.Demo, onb.Seed); err != nil {
		return nil, err
	}
	return mux, nil
}
