package presentation

import (
	"contractors-platform/backend/internal/modules/onboarding/application"
	"contractors-platform/backend/internal/modules/onboarding/domain"
	"encoding/json"
	"errors"
	"io"
	"mime"
	"net/http"
)

type Handler struct {
	register *application.RegisterUser
	read     *application.ReadUser
}

func New(register *application.RegisterUser, read *application.ReadUser) *Handler {
	return &Handler{register: register, read: read}
}

func writeJSON(writer http.ResponseWriter, status int, payload any) {
	writer.Header().Set("Content-Type", "application/json; charset=utf-8")
	writer.WriteHeader(status)
	_ = json.NewEncoder(writer).Encode(payload)
}

func (handler *Handler) Create(writer http.ResponseWriter, request *http.Request) {
	mediaType, _, err := mime.ParseMediaType(request.Header.Get("Content-Type"))
	if err != nil || mediaType != "application/json" {
		writeJSON(writer, 415, map[string]string{"message": "Usa Content-Type application/json."})
		return
	}
	request.Body = http.MaxBytesReader(writer, request.Body, 1<<20)
	decoder := json.NewDecoder(request.Body)
	decoder.DisallowUnknownFields()
	var input domain.Input
	if err := decoder.Decode(&input); err != nil {
		var tooLarge *http.MaxBytesError
		if errors.As(err, &tooLarge) {
			writeJSON(writer, 413, map[string]string{"message": "El cuerpo de la solicitud es demasiado grande."})
		} else {
			writeJSON(writer, 400, map[string]string{"message": "El JSON es inválido o contiene campos desconocidos."})
		}
		return
	}
	if err := decoder.Decode(new(any)); err != io.EOF {
		writeJSON(writer, 400, map[string]string{"message": "Envía un único objeto JSON."})
		return
	}
	record, validation, err := handler.register.Create(input)
	if len(validation) > 0 {
		writeJSON(writer, 422, map[string]any{"message": "Revisa los campos del formulario.", "errors": validation})
		return
	}
	if err != nil {
		writeJSON(writer, 500, map[string]string{"message": "No fue posible guardar el registro."})
		return
	}
	writer.Header().Set("Location", "/api/onboarding/"+record.ID)
	writeJSON(writer, 201, record)
}

func (handler *Handler) Find(writer http.ResponseWriter, request *http.Request) {
	record, found := handler.read.Find(request.PathValue("id"))
	if !found {
		writeJSON(writer, 404, map[string]string{"message": "No se encontró el registro."})
		return
	}
	writeJSON(writer, 200, record)
}
