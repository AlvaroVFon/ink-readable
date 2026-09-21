package api

import (
	"context"
	"database/sql"
	"encoding/json"
	"ink-readable/internal/config"
	"ink-readable/internal/editor/documents"
	"ink-readable/internal/editor/vaults"
	"ink-readable/internal/planner/projects"
	"ink-readable/internal/planner/tasks"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
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

type fakeDocumentService struct {
	renamedPaths [][3]string
}

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
func (f *fakeDocumentService) RenamePath(_ context.Context, vaultID, oldPath, newPath string) error {
	f.renamedPaths = append(f.renamedPaths, [3]string{vaultID, oldPath, newPath})
	return nil
}
func (f *fakeDocumentService) Move(context.Context, string, string) error          { return nil }
func (f *fakeDocumentService) UpdateContent(context.Context, string, string) error { return nil }
func (f *fakeDocumentService) Delete(context.Context, string) error                { return nil }
func (f *fakeDocumentService) DeletePermanently(context.Context, string) error     { return nil }
func (f *fakeDocumentService) Restore(context.Context, string) error               { return nil }

type fakeConfigService struct{}

func (f fakeConfigService) ListFrontSecrets(context.Context) *config.FrontConfig { return nil }

type fakeProjectService struct {
	items []projects.Project
}

func (f *fakeProjectService) Create(_ context.Context, project projects.Project) error {
	f.items = append(f.items, project)
	return nil
}

func (f *fakeProjectService) List(context.Context) ([]projects.Project, error) {
	return f.items, nil
}

func (f *fakeProjectService) FindByID(_ context.Context, id string) (*projects.Project, error) {
	for i := range f.items {
		if f.items[i].ID == id {
			return &f.items[i], nil
		}
	}
	return nil, sql.ErrNoRows
}

func (f *fakeProjectService) Rename(context.Context, string, string) error { return nil }
func (f *fakeProjectService) Delete(context.Context, string) error         { return nil }

type fakeTaskService struct {
	items []tasks.Task
}

func (f *fakeTaskService) Create(_ context.Context, task tasks.Task) error {
	f.items = append(f.items, task)
	return nil
}

func (f *fakeTaskService) List(context.Context, string) ([]tasks.Task, error) {
	return f.items, nil
}

func (f *fakeTaskService) FindByID(_ context.Context, id string) (*tasks.Task, error) {
	for i := range f.items {
		if f.items[i].ID == id {
			return &f.items[i], nil
		}
	}
	return nil, sql.ErrNoRows
}

func (f *fakeTaskService) UpdateTitle(context.Context, string, string) error { return nil }
func (f *fakeTaskService) UpdateDescription(context.Context, string, string) error {
	return nil
}

func (f *fakeTaskService) UpdateStatus(_ context.Context, _ string, status tasks.Status) error {
	if !status.Valid() {
		return tasks.ErrInvalidStatusError
	}
	return nil
}

func (f *fakeTaskService) UpdatePosition(context.Context, string, int64) error { return nil }
func (f *fakeTaskService) Delete(context.Context, string) error                { return nil }

func TestHandler_CreateAndListVaults(t *testing.T) {
	vaultService := &fakeVaultService{}
	handler := NewHandler(vaultService, &fakeDocumentService{}, &fakeProjectService{}, &fakeTaskService{}, fakeConfigService{})

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
	handler := NewHandler(&fakeVaultService{}, &fakeDocumentService{}, &fakeProjectService{}, &fakeTaskService{}, fakeConfigService{})
	request := httptest.NewRequest(http.MethodPost, "/api/v1/vaults", strings.NewReader(`{"name":`))
	response := httptest.NewRecorder()
	handler.ServeHTTP(response, request)

	if response.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400, got %d", response.Code)
	}
}

func TestHandler_Options(t *testing.T) {
	handler := NewHandler(&fakeVaultService{}, &fakeDocumentService{}, &fakeProjectService{}, &fakeTaskService{}, fakeConfigService{})
	request := httptest.NewRequest(http.MethodOptions, "/api/v1/vaults", nil)
	response := httptest.NewRecorder()
	handler.ServeHTTP(response, request)

	if response.Code != http.StatusNoContent {
		t.Fatalf("expected status 204, got %d", response.Code)
	}
}

func TestHandler_CreateAndListProjects(t *testing.T) {
	projectService := &fakeProjectService{}
	handler := NewHandler(&fakeVaultService{}, &fakeDocumentService{}, projectService, &fakeTaskService{}, fakeConfigService{})

	createRequest := httptest.NewRequest(http.MethodPost, "/api/v1/projects", strings.NewReader(`{"name":"Roadmap"}`))
	createResponse := httptest.NewRecorder()
	handler.ServeHTTP(createResponse, createRequest)

	if createResponse.Code != http.StatusCreated {
		t.Fatalf("expected status 201, got %d", createResponse.Code)
	}

	var created projectResponse
	if err := json.NewDecoder(createResponse.Body).Decode(&created); err != nil {
		t.Fatalf("decode created project: %v", err)
	}
	if created.Name != "Roadmap" || created.ID == "" || created.Deleted {
		t.Fatalf("unexpected created project: %+v", created)
	}

	listRequest := httptest.NewRequest(http.MethodGet, "/api/v1/projects", nil)
	listResponse := httptest.NewRecorder()
	handler.ServeHTTP(listResponse, listRequest)

	if listResponse.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", listResponse.Code)
	}
	var listed []projectResponse
	if err := json.NewDecoder(listResponse.Body).Decode(&listed); err != nil {
		t.Fatalf("decode project list: %v", err)
	}
	if len(listed) != 1 || listed[0].Name != "Roadmap" {
		t.Fatalf("unexpected project list: %+v", listed)
	}
}

func TestHandler_CreateProject_InvalidName(t *testing.T) {
	handler := NewHandler(&fakeVaultService{}, &fakeDocumentService{}, &fakeProjectService{}, &fakeTaskService{}, fakeConfigService{})
	request := httptest.NewRequest(http.MethodPost, "/api/v1/projects", strings.NewReader(`{"name":""}`))
	response := httptest.NewRecorder()
	handler.ServeHTTP(response, request)

	if response.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400, got %d", response.Code)
	}
}

func TestHandler_CreateAndListTasks(t *testing.T) {
	taskService := &fakeTaskService{}
	handler := NewHandler(&fakeVaultService{}, &fakeDocumentService{}, &fakeProjectService{}, taskService, fakeConfigService{})

	createRequest := httptest.NewRequest(http.MethodPost, "/api/v1/projects/project-1/tasks", strings.NewReader(`{"title":"Write tests"}`))
	createResponse := httptest.NewRecorder()
	handler.ServeHTTP(createResponse, createRequest)

	if createResponse.Code != http.StatusCreated {
		t.Fatalf("expected status 201, got %d", createResponse.Code)
	}

	var created taskResponse
	if err := json.NewDecoder(createResponse.Body).Decode(&created); err != nil {
		t.Fatalf("decode created task: %v", err)
	}
	if created.Title != "Write tests" || created.ProjectID != "project-1" || created.Status != string(tasks.StatusBacklog) {
		t.Fatalf("unexpected created task: %+v", created)
	}

	listRequest := httptest.NewRequest(http.MethodGet, "/api/v1/projects/project-1/tasks", nil)
	listResponse := httptest.NewRecorder()
	handler.ServeHTTP(listResponse, listRequest)

	if listResponse.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", listResponse.Code)
	}
	var listed []taskResponse
	if err := json.NewDecoder(listResponse.Body).Decode(&listed); err != nil {
		t.Fatalf("decode task list: %v", err)
	}
	if len(listed) != 1 || listed[0].Title != "Write tests" {
		t.Fatalf("unexpected task list: %+v", listed)
	}
}

func TestHandler_UpdateTaskStatus_Invalid(t *testing.T) {
	handler := NewHandler(&fakeVaultService{}, &fakeDocumentService{}, &fakeProjectService{}, &fakeTaskService{}, fakeConfigService{})
	request := httptest.NewRequest(http.MethodPatch, "/api/v1/tasks/task-1/status", strings.NewReader(`{"status":"unknown"}`))
	response := httptest.NewRecorder()
	handler.ServeHTTP(response, request)

	if response.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400, got %d", response.Code)
	}
}

func TestHandler_GetProject(t *testing.T) {
	projectService := &fakeProjectService{
		items: []projects.Project{{ID: "project-1", Name: "Roadmap"}},
	}
	handler := NewHandler(&fakeVaultService{}, &fakeDocumentService{}, projectService, &fakeTaskService{}, fakeConfigService{})

	request := httptest.NewRequest(http.MethodGet, "/api/v1/projects/project-1", nil)
	response := httptest.NewRecorder()
	handler.ServeHTTP(response, request)

	if response.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", response.Code)
	}
	var got projectResponse
	if err := json.NewDecoder(response.Body).Decode(&got); err != nil {
		t.Fatalf("decode project: %v", err)
	}
	if got.ID != "project-1" || got.Name != "Roadmap" {
		t.Fatalf("unexpected project: %+v", got)
	}
}

func TestHandler_GetProject_NotFound(t *testing.T) {
	handler := NewHandler(&fakeVaultService{}, &fakeDocumentService{}, &fakeProjectService{}, &fakeTaskService{}, fakeConfigService{})

	request := httptest.NewRequest(http.MethodGet, "/api/v1/projects/missing", nil)
	response := httptest.NewRecorder()
	handler.ServeHTTP(response, request)

	if response.Code != http.StatusNotFound {
		t.Fatalf("expected status 404, got %d", response.Code)
	}
}

func TestHandler_GetTask(t *testing.T) {
	taskService := &fakeTaskService{
		items: []tasks.Task{{ID: "task-1", ProjectID: "project-1", Title: "Write tests", Status: tasks.StatusTodo}},
	}
	handler := NewHandler(&fakeVaultService{}, &fakeDocumentService{}, &fakeProjectService{}, taskService, fakeConfigService{})

	request := httptest.NewRequest(http.MethodGet, "/api/v1/tasks/task-1", nil)
	response := httptest.NewRecorder()
	handler.ServeHTTP(response, request)

	if response.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", response.Code)
	}
	var got taskResponse
	if err := json.NewDecoder(response.Body).Decode(&got); err != nil {
		t.Fatalf("decode task: %v", err)
	}
	if got.ID != "task-1" || got.ProjectID != "project-1" || got.Status != string(tasks.StatusTodo) {
		t.Fatalf("unexpected task: %+v", got)
	}
}

func TestHandler_RenameDocumentPath(t *testing.T) {
	documentService := &fakeDocumentService{}
	handler := NewHandler(&fakeVaultService{}, documentService, &fakeProjectService{}, &fakeTaskService{}, fakeConfigService{})

	request := httptest.NewRequest(
		http.MethodPatch,
		"/api/v1/vaults/vault-1/documents/paths",
		strings.NewReader(`{"oldPath":"/vault/folder","newPath":"/vault/renamed"}`),
	)
	response := httptest.NewRecorder()
	handler.ServeHTTP(response, request)

	if response.Code != http.StatusNoContent {
		t.Fatalf("expected status 204, got %d", response.Code)
	}
	if len(documentService.renamedPaths) != 1 {
		t.Fatalf("expected one rename path call, got %d", len(documentService.renamedPaths))
	}
	if got := documentService.renamedPaths[0]; got != [3]string{"vault-1", "/vault/folder", "/vault/renamed"} {
		t.Fatalf("unexpected rename path call: %+v", got)
	}
}

func TestHandler_GetTask_NotFound(t *testing.T) {
	handler := NewHandler(&fakeVaultService{}, &fakeDocumentService{}, &fakeProjectService{}, &fakeTaskService{}, fakeConfigService{})

	request := httptest.NewRequest(http.MethodGet, "/api/v1/tasks/missing", nil)
	response := httptest.NewRecorder()
	handler.ServeHTTP(response, request)

	if response.Code != http.StatusNotFound {
		t.Fatalf("expected status 404, got %d", response.Code)
	}
}
