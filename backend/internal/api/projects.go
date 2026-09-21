package api

import (
	"ink-readable/internal/httpx"
	"ink-readable/internal/planner/projects"
	"net/http"
)

type projectResponse struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	Deleted   bool   `json:"deleted"`
	CreatedAt string `json:"createdAt"`
	UpdatedAt string `json:"updatedAt"`
}

type createProjectRequest struct {
	Name string `json:"name"`
}

type renameProjectRequest struct {
	Name string `json:"name"`
}

func (h *Handler) listProjects(w http.ResponseWriter, r *http.Request) {
	items, err := h.projects.List(r.Context())
	if err != nil {
		writeServiceError(w, err)
		return
	}
	httpx.JSON(w, http.StatusOK, mapProjects(items))
}

func (h *Handler) createProject(w http.ResponseWriter, r *http.Request) {
	var request createProjectRequest
	if err := httpx.DecodeJSON(r, &request); err != nil {
		httpx.Error(w, http.StatusBadRequest, err)
		return
	}
	project, err := projects.NewProject(request.Name)
	if err != nil {
		writeServiceError(w, err)
		return
	}
	if err := h.projects.Create(r.Context(), *project); err != nil {
		writeServiceError(w, err)
		return
	}
	httpx.JSON(w, http.StatusCreated, mapProject(*project))
}

func (h *Handler) getProject(w http.ResponseWriter, r *http.Request) {
	project, err := h.projects.FindByID(r.Context(), r.PathValue("id"))
	if err != nil {
		writeServiceError(w, err)
		return
	}
	httpx.JSON(w, http.StatusOK, mapProject(*project))
}

func (h *Handler) renameProject(w http.ResponseWriter, r *http.Request) {
	var request renameProjectRequest
	if err := httpx.DecodeJSON(r, &request); err != nil {
		httpx.Error(w, http.StatusBadRequest, err)
		return
	}
	if err := h.projects.Rename(r.Context(), r.PathValue("id"), request.Name); err != nil {
		writeServiceError(w, err)
		return
	}
	httpx.NoContent(w)
}

func (h *Handler) deleteProject(w http.ResponseWriter, r *http.Request) {
	if err := h.projects.Delete(r.Context(), r.PathValue("id")); err != nil {
		writeServiceError(w, err)
		return
	}
	httpx.NoContent(w)
}

func mapProjects(items []projects.Project) []projectResponse {
	result := make([]projectResponse, 0, len(items))
	for _, item := range items {
		result = append(result, mapProject(item))
	}
	return result
}

func mapProject(item projects.Project) projectResponse {
	return projectResponse{
		ID:        item.ID,
		Name:      item.Name,
		Deleted:   !item.DeletedAt.IsZero(),
		CreatedAt: item.CreatedAt.Format("2006-01-02T15:04:05.999999999Z07:00"),
		UpdatedAt: item.UpdatedAt.Format("2006-01-02T15:04:05.999999999Z07:00"),
	}
}
