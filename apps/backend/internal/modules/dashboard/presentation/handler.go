package presentation

import (
	"contractors-platform/backend/internal/modules/dashboard/application"
	"contractors-platform/backend/internal/modules/dashboard/domain"
	"encoding/json"
	"errors"
	"net/http"
)

type Handler struct{ service *application.Service }

func New(service *application.Service) *Handler { return &Handler{service: service} }

func (handler *Handler) Profile(writer http.ResponseWriter, request *http.Request) {
	profile, err := handler.service.Profile(request.Context(), request.PathValue(PathParamContractorID))
	switch {
	case errors.Is(err, domain.ErrContractorNotFound):
		writeJSON(writer, http.StatusNotFound, ErrorResponse{Message: messageContractorNotFound})
	case err != nil:
		writeJSON(writer, http.StatusInternalServerError, ErrorResponse{Message: messageDashboardFailure})
	default:
		writeJSON(writer, http.StatusOK, toProfileResponse(profile))
	}
}

func writeJSON(writer http.ResponseWriter, status int, payload any) {
	writer.Header().Set(headerContentType, contentTypeJSON)
	writer.WriteHeader(status)
	_ = json.NewEncoder(writer).Encode(payload)
}
