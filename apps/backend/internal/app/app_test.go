package app

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func validInput() map[string]any {
	return map[string]any{"name": " Ana ", "profession": "Electrician", "client": map[string]any{"name": "Luis", "phone": "+52 555 123 4567", "email": "luis@example.com"}, "businessName": "Electrical Services", "businessActivity": "Electrical installations", "rfc": " aaa010101aaa "}
}

func submit(handler http.Handler, payload any) *httptest.ResponseRecorder {
	body, _ := json.Marshal(payload)
	request := httptest.NewRequest(http.MethodPost, "/api/onboarding", bytes.NewReader(body))
	request.Header.Set("Content-Type", "application/json")
	response := httptest.NewRecorder()
	handler.ServeHTTP(response, request)
	return response
}

func TestCreateAndRetrieve(t *testing.T) {
	for _, withTax := range []bool{false, true} {
		t.Run(map[bool]string{false: "without tax regime", true: "with tax regime"}[withTax], func(t *testing.T) {
			handler := New()
			input := validInput()
			if withTax {
				input["taxRegime"] = "General"
			}
			response := submit(handler, input)
			if response.Code != http.StatusCreated {
				t.Fatalf("create: %d %s", response.Code, response.Body)
			}
			var result map[string]any
			_ = json.Unmarshal(response.Body.Bytes(), &result)
			if result["id"] == "" || result["name"] != "Ana" || result["rfc"] != "AAA010101AAA" {
				t.Fatalf("unexpected record: %v", result)
			}
			if _, exists := result["taxRegime"]; exists != withTax {
				t.Fatalf("tax regime presence: %v", result)
			}
			location := response.Header().Get("Location")
			if location != "/api/onboarding/"+result["id"].(string) {
				t.Fatalf("invalid Location: %s", location)
			}
			fetched := httptest.NewRecorder()
			handler.ServeHTTP(fetched, httptest.NewRequest(http.MethodGet, location, nil))
			if fetched.Code != http.StatusOK || fetched.Body.String() != response.Body.String() {
				t.Fatalf("fetch: %d %s", fetched.Code, fetched.Body)
			}
		})
	}
}

func TestRequiredFields(t *testing.T) {
	for _, field := range []string{"name", "profession", "client.name", "client.phone", "client.email", "businessName", "businessActivity", "rfc"} {
		t.Run(field, func(t *testing.T) {
			input := validInput()
			if strings.HasPrefix(field, "client.") {
				input["client"].(map[string]any)[strings.TrimPrefix(field, "client.")] = "  "
			} else {
				input[field] = "  "
			}
			response := submit(New(), input)
			if response.Code != 422 {
				t.Fatalf("expected 422: %d %s", response.Code, response.Body)
			}
			var result struct {
				Errors map[string]string `json:"errors"`
			}
			_ = json.Unmarshal(response.Body.Bytes(), &result)
			if result.Errors[field] == "" {
				t.Fatalf("missing field error: %s", response.Body)
			}
		})
	}
}

func TestInvalidFormats(t *testing.T) {
	for _, field := range []string{"email", "phone", "rfc"} {
		t.Run(field, func(t *testing.T) {
			input := validInput()
			if field == "rfc" {
				input[field] = "invalid"
			} else {
				input["client"].(map[string]any)[field] = "invalid"
			}
			if response := submit(New(), input); response.Code != 422 {
				t.Fatalf("expected 422: %d", response.Code)
			}
		})
	}
}

func TestMalformedRequests(t *testing.T) {
	for _, body := range []string{`{`, `{"unknown":true}`, `{} {}`, `[]`, `{"client":{"unknown":true}}`, `{"name":42}`} {
		request := httptest.NewRequest(http.MethodPost, "/api/onboarding", strings.NewReader(body))
		request.Header.Set("Content-Type", "application/json")
		response := httptest.NewRecorder()
		New().ServeHTTP(response, request)
		if response.Code != 400 {
			t.Errorf("body %s: expected 400, got %d", body, response.Code)
		}
	}
}

func TestHTTPStatusCodes(t *testing.T) {
	for _, test := range []struct {
		method, path, contentType, body string
		status                          int
	}{
		{"GET", "/api/health", "", "", 200},
		{"GET", "/api/contractors", "", "", 200},
		{"GET", "/api/onboarding/missing", "", "", 404},
		{"PUT", "/api/onboarding", "", "", 405},
		{"POST", "/api/onboarding", "text/plain", "{}", 415},
		{"POST", "/api/onboarding", "application/json", strings.Repeat(" ", 1<<20) + "{}", 413},
	} {
		request := httptest.NewRequest(test.method, test.path, strings.NewReader(test.body))
		request.Header.Set("Content-Type", test.contentType)
		response := httptest.NewRecorder()
		New().ServeHTTP(response, request)
		if response.Code != test.status {
			t.Errorf("%s %s: expected %d, got %d", test.method, test.path, test.status, response.Code)
		}
	}
}
