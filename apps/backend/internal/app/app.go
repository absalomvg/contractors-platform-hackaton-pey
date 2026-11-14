package app

import (
	"contractors-platform/backend/internal/modules/onboarding"
	"contractors-platform/backend/internal/modules/onboarding/infrastructure"
	"net/http"
)

func New() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/health", func(writer http.ResponseWriter, request *http.Request) {
		writer.Header().Set("Content-Type", "application/json")
		_, _ = writer.Write([]byte(`{"status":"ok"}`))
	})
	mux.HandleFunc("GET /api/contractors", func(writer http.ResponseWriter, request *http.Request) {
		writer.Header().Set("Content-Type", "application/json")
		_, _ = writer.Write([]byte(`{"contractors":[]}`))
	})
	onboarding.Register(mux, infrastructure.NewMemoryRepository())
	return mux
}
