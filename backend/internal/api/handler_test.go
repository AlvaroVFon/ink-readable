package api

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"ink-readable/internal/documents"
	"ink-readable/internal/vaults"
)

type fakeVaultService struct {
	vaults []vaults.Vault
}

func (f *fakeVaultService) Create(_ context.Context, vault vaults.Vault) error {
	f.vaults = append(f.vaults, vault)
	return nil
}

func (f *fakeVaultService) FindActive(context.Context) ([]vaults.Vault, error) {
	return f.vaults, nil
}

func (f *fakeVaultService) FindDeleted(context.Context) ([]vaults.Vault, error) {
	return nil, nil
}

func (f *fakeVaultService) FindByID(context.Context, string) (*vaults.Vault, error) {
	return nil, nil
}

func (f *fakeVaultService) Rename(context.Context, string, string) error { return nil }
func (f *fakeVaultService) Delete(context.Context, string) error         { return nil }

type fakeDocumentService struct{}

func (f *fakeDocumentService) Create(context.Context, documents.Document) error { return nil }
func (f *fakeDocumentService) FindActive(context.Context, string) ([]documents.Document, error) {
	return nil, nil
}
func (f *fakeDocumentService) FindDeleted(context.Context, string) ([]documents.Document, error) {
	return nil, nil
}
func (f *fakeDocumentService) FindByID(context.Context, string) (*documents.Document, error) {
	return nil, nil
}
func (f *fakeDocumentService) Rename(context.Context, string, string, string) error { return nil }
func (f *fakeDocumentService) Move(context.Context, string, string) error           { return nil }
func (f *fakeDocumentService) UpdateContent(context.Context, string, string) error  { return nil }
func (f *fakeDocumentService) Delete(context.Context, string) error                 { return nil }
func (f *fakeDocumentService) DeletePermanently(context.Context, string) error      { return nil }
func (f *fakeDocumentService) Restore(context.Context, string) error                { return nil }

func TestHandler_CreateAndListVaults(t *testing.T) {
	vaultService := &fakeVaultService{}
	handler := NewHandler(vaultService, &fakeDocumentService{})

	createRequest := httptest.NewRequest(http.MethodPost, "/api/v1/vaults", strings.NewReader(`{"name":"Notes"}`))
	createResponse := httptest.NewRecorder()
	handler.ServeHTTP(createResponse, createRequest)

	if createResponse.Code != http.StatusCreated {
		t.Fatalf("expected status 201, got %d", createResponse.Code)
	}
	if createResponse.Header().Get("Access-Control-Allow-Origin") != "*" {
		t.Fatal("expected public CORS header")
	}

	var created vaultResponse
	if err := json.NewDecoder(createResponse.Body).Decode(&created); err != nil {
		t.Fatalf("decode created vault: %v", err)
	}
	if created.Name != "Notes" || created.ID == "" {
		t.Fatalf("unexpected created vault: %+v", created)
	}

	listRequest := httptest.NewRequest(http.MethodGet, "/api/v1/vaults", nil)
	listResponse := httptest.NewRecorder()
	handler.ServeHTTP(listResponse, listRequest)

	if listResponse.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", listResponse.Code)
	}
	var listed []vaultResponse
	if err := json.NewDecoder(listResponse.Body).Decode(&listed); err != nil {
		t.Fatalf("decode vault list: %v", err)
	}
	if len(listed) != 1 || listed[0].Name != "Notes" {
		t.Fatalf("unexpected vault list: %+v", listed)
	}
}

func TestHandler_InvalidJSON(t *testing.T) {
	handler := NewHandler(&fakeVaultService{}, &fakeDocumentService{})
	request := httptest.NewRequest(http.MethodPost, "/api/v1/vaults", strings.NewReader(`{"name":`))
	response := httptest.NewRecorder()
	handler.ServeHTTP(response, request)

	if response.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400, got %d", response.Code)
	}
}

func TestHandler_Options(t *testing.T) {
	handler := NewHandler(&fakeVaultService{}, &fakeDocumentService{})
	request := httptest.NewRequest(http.MethodOptions, "/api/v1/vaults", nil)
	response := httptest.NewRecorder()
	handler.ServeHTTP(response, request)

	if response.Code != http.StatusNoContent {
		t.Fatalf("expected status 204, got %d", response.Code)
	}
}
