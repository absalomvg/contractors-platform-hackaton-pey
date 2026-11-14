package infrastructure

import (
	"context"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestPeyClientPostsBankAccount(t *testing.T) {
	var auth, path, body string
	server := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		auth = request.Header.Get("Authorization")
		path = request.URL.Path
		raw, _ := io.ReadAll(request.Body)
		body = string(raw)
		writer.Header().Set("Content-Type", "application/json")
		_, _ = writer.Write([]byte(`{"id":"01BANK","codiStatus":"PENDING"}`))
	}))
	defer server.Close()
	payload, err := NewPeyClient(server.URL, "secret").Register(context.Background(), []byte(`{"clabe":"002010077777777771"}`))
	if err != nil {
		t.Fatal(err)
	}
	if auth != "Bearer secret" || path != "/bank-account" || !strings.Contains(body, "002010077777777771") || !strings.Contains(string(payload), "01BANK") {
		t.Fatalf("auth=%s path=%s body=%s payload=%s", auth, path, body, payload)
	}
}

func TestPeyClientRejectsNonSuccess(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		writer.WriteHeader(http.StatusBadRequest)
	}))
	defer server.Close()
	if _, err := NewPeyClient(server.URL, "secret").Register(context.Background(), []byte(`{}`)); err == nil {
		t.Fatal("expected pey error")
	}
}

func TestUnavailablePeyDoesNotCallNetwork(t *testing.T) {
	if _, err := NewUnavailablePey().Register(context.Background(), []byte(`{}`)); err == nil {
		t.Fatal("expected unavailable pey")
	}
}
