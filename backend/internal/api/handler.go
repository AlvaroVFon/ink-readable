package api

import (
	"context"
	"database/sql"
	"errors"
	"ink-readable/internal/config"
	"ink-readable/internal/editor/documents"
	"ink-readable/internal/editor/vaults"
	"ink-readable/internal/httpx"
	"ink-readable/internal/planner/projects"
	"ink-readable/internal/planner/tasks"
	"net/http"

	editorconfig "ink-readable/internal/editor/config"
)

type (
	configService interface {
		ListFrontSecrets(ctx context.Context) *config.FrontConfig
	}

	vaultService interface {
		Create(context.Context, vaults.Vault) error
		FindActive(context.Context) ([]vaults.Vault, error)
		FindDeleted(context.Context) ([]vaults.Vault, error)
		FindByID(context.Context, string) (*vaults.Vault, error)
		Rename(context.Context, string, string) error
		Delete(context.Context, string) error
	}
	documentService interface {
		Create(context.Context, documents.Document) error
		FindActive(context.Context, string) ([]documents.Document, error)
		FindDeleted(context.Context, string) ([]documents.Document, error)
		FindByID(context.Context, string) (*documents.Document, error)
		Rename(context.Context, string, string, string) error
		RenamePath(context.Context, string, string, string) error
		Move(context.Context, string, string) error
		UpdateContent(context.Context, string, string) error
		Delete(context.Context, string) error
		DeletePermanently(context.Context, string) error
		Restore(context.Context, string) error
	}
	projectService interface {
		Create(context.Context, projects.Project) error
		List(context.Context) ([]projects.Project, error)
		FindByID(context.Context, string) (*projects.Project, error)
		Rename(context.Context, string, string) error
		Delete(context.Context, string) error
	}
	taskService interface {
		Create(context.Context, tasks.Task) error
		List(context.Context, string) ([]tasks.Task, error)
		FindByID(context.Context, string) (*tasks.Task, error)
		UpdateTitle(context.Context, string, string) error
		UpdateDescription(context.Context, string, string) error
		UpdateStatus(context.Context, string, tasks.Status) error
		UpdatePosition(context.Context, string, int64) error
		Delete(context.Context, string) error
	}
	editorConfigService interface {
		Get(context.Context) (*editorconfig.EditorConfig, error)
		UpdateDarkTheme(context.Context, bool) error
		UpdateVimMotion(context.Context, bool) error
		UpdateFormatOnSave(context.Context, bool) error
		UpdateRelativeLineNumbers(context.Context, bool) error
	}
)

type Handler struct {
	config       configService
	vaults       vaultService
	documents    documentService
	projects     projectService
	tasks        taskService
	editorConfig editorConfigService
}

func NewHandler(vaultsService vaultService, documentsService documentService, projectsService projectService, tasksService taskService, editorConfigService editorConfigService, configService configService) http.Handler {
	handler := &Handler{
		vaults:       vaultsService,
		documents:    documentsService,
		projects:     projectsService,
		tasks:        tasksService,
		editorConfig: editorConfigService,
		config:       configService,
	}
	mux := http.NewServeMux()

	mux.HandleFunc("GET /api/v1/vaults", handler.listVaults)
	mux.HandleFunc("GET /api/v1/vaults/deleted", handler.listDeletedVaults)
	mux.HandleFunc("POST /api/v1/vaults", handler.createVault)
	mux.HandleFunc("GET /api/v1/vaults/{id}", handler.getVault)
	mux.HandleFunc("PATCH /api/v1/vaults/{id}", handler.renameVault)
	mux.HandleFunc("DELETE /api/v1/vaults/{id}", handler.deleteVault)

	mux.HandleFunc("GET /api/v1/vaults/{vaultID}/documents", handler.listDocuments)
	mux.HandleFunc("GET /api/v1/vaults/{vaultID}/documents/deleted", handler.listDeletedDocuments)
	mux.HandleFunc("POST /api/v1/vaults/{vaultID}/documents", handler.createDocument)
	mux.HandleFunc("PATCH /api/v1/vaults/{vaultID}/documents/paths", handler.renameDocumentPath)

	mux.HandleFunc("GET /api/v1/documents/{id}", handler.getDocument)
	mux.HandleFunc("PATCH /api/v1/documents/{id}/rename", handler.renameDocument)
	mux.HandleFunc("PATCH /api/v1/documents/{id}/move", handler.moveDocument)
	mux.HandleFunc("PATCH /api/v1/documents/{id}/content", handler.updateDocumentContent)
	mux.HandleFunc("DELETE /api/v1/documents/{id}", handler.deleteDocument)
	mux.HandleFunc("POST /api/v1/documents/{id}/restore", handler.restoreDocument)
	mux.HandleFunc("DELETE /api/v1/documents/{id}/permanent", handler.deleteDocumentPermanently)

	mux.HandleFunc("GET /api/v1/projects", handler.listProjects)
	mux.HandleFunc("POST /api/v1/projects", handler.createProject)
	mux.HandleFunc("GET /api/v1/projects/{id}", handler.getProject)
	mux.HandleFunc("PATCH /api/v1/projects/{id}", handler.renameProject)
	mux.HandleFunc("DELETE /api/v1/projects/{id}", handler.deleteProject)

	mux.HandleFunc("GET /api/v1/projects/{projectID}/tasks", handler.listTasks)
	mux.HandleFunc("POST /api/v1/projects/{projectID}/tasks", handler.createTask)

	mux.HandleFunc("GET /api/v1/tasks/{id}", handler.getTask)
	mux.HandleFunc("PATCH /api/v1/tasks/{id}/title", handler.updateTaskTitle)
	mux.HandleFunc("PATCH /api/v1/tasks/{id}/description", handler.updateTaskDescription)
	mux.HandleFunc("PATCH /api/v1/tasks/{id}/status", handler.updateTaskStatus)
	mux.HandleFunc("PATCH /api/v1/tasks/{id}/position", handler.updateTaskPosition)
	mux.HandleFunc("DELETE /api/v1/tasks/{id}", handler.deleteTask)

	mux.HandleFunc("GET /api/v1/config", handler.ListFrontSecrets)

	mux.HandleFunc("GET /api/v1/editor/config", handler.getEditorConfig)
	mux.HandleFunc("PATCH /api/v1/editor/config/dark-theme", handler.updateEditorConfigDarkTheme)
	mux.HandleFunc("PATCH /api/v1/editor/config/vim-motion", handler.updateEditorConfigVimMotion)
	mux.HandleFunc("PATCH /api/v1/editor/config/format-on-save", handler.updateEditorConfigFormatOnSave)
	mux.HandleFunc("PATCH /api/v1/editor/config/relative-line-numbers", handler.updateEditorConfigRelativeLineNumbers)

	return httpx.CORS(mux)
}

func writeServiceError(w http.ResponseWriter, err error) {
	status := http.StatusInternalServerError
	if errors.Is(err, sql.ErrNoRows) {
		status = http.StatusNotFound
	}
	if errors.Is(err, vaults.ErrInvalidEmptyArgument) || errors.Is(err, documents.ErrInvalidEmptyArgument) {
		status = http.StatusBadRequest
	}
	if errors.Is(err, projects.ErrInvalidEmptyArgumentError) ||
		errors.Is(err, tasks.ErrInvalidEmptyArgumentError) ||
		errors.Is(err, tasks.ErrInvalidStatusError) ||
		errors.Is(err, tasks.ErrInvalidPositionError) {
		status = http.StatusBadRequest
	}
	httpx.Error(w, status, err)
}
