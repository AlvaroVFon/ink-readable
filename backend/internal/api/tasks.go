package api

import (
	"ink-readable/internal/httpx"
	"ink-readable/internal/planner/tasks"
	"net/http"
)

type taskResponse struct {
	ID          string `json:"id"`
	ProjectID   string `json:"projectId"`
	Title       string `json:"title"`
	Description string `json:"description"`
	Status      string `json:"status"`
	Position    int64  `json:"position"`
	CreatedAt   string `json:"createdAt"`
	UpdatedAt   string `json:"updatedAt"`
}

type createTaskRequest struct {
	Title       string `json:"title"`
	Description string `json:"description"`
}

type titleRequest struct {
	Title string `json:"title"`
}

type descriptionRequest struct {
	Description string `json:"description"`
}

type statusRequest struct {
	Status string `json:"status"`
}

type positionRequest struct {
	Position int64 `json:"position"`
}

func (h *Handler) listTasks(w http.ResponseWriter, r *http.Request) {
	items, err := h.tasks.List(r.Context(), r.PathValue("projectID"))
	if err != nil {
		writeServiceError(w, err)
		return
	}
	httpx.JSON(w, http.StatusOK, mapTasks(items))
}

func (h *Handler) createTask(w http.ResponseWriter, r *http.Request) {
	var request createTaskRequest
	if err := httpx.DecodeJSON(r, &request); err != nil {
		httpx.Error(w, http.StatusBadRequest, err)
		return
	}
	task, err := tasks.NewTask(r.PathValue("projectID"), request.Title, request.Description)
	if err != nil {
		writeServiceError(w, err)
		return
	}
	if err := h.tasks.Create(r.Context(), *task); err != nil {
		writeServiceError(w, err)
		return
	}
	httpx.JSON(w, http.StatusCreated, mapTask(*task))
}

func (h *Handler) getTask(w http.ResponseWriter, r *http.Request) {
	task, err := h.tasks.FindByID(r.Context(), r.PathValue("id"))
	if err != nil {
		writeServiceError(w, err)
		return
	}
	httpx.JSON(w, http.StatusOK, mapTask(*task))
}

func (h *Handler) updateTaskTitle(w http.ResponseWriter, r *http.Request) {
	var request titleRequest
	if err := httpx.DecodeJSON(r, &request); err != nil {
		httpx.Error(w, http.StatusBadRequest, err)
		return
	}
	if err := h.tasks.UpdateTitle(r.Context(), r.PathValue("id"), request.Title); err != nil {
		writeServiceError(w, err)
		return
	}
	httpx.NoContent(w)
}

func (h *Handler) updateTaskDescription(w http.ResponseWriter, r *http.Request) {
	var request descriptionRequest
	if err := httpx.DecodeJSON(r, &request); err != nil {
		httpx.Error(w, http.StatusBadRequest, err)
		return
	}
	if err := h.tasks.UpdateDescription(r.Context(), r.PathValue("id"), request.Description); err != nil {
		writeServiceError(w, err)
		return
	}
	httpx.NoContent(w)
}

func (h *Handler) updateTaskStatus(w http.ResponseWriter, r *http.Request) {
	var request statusRequest
	if err := httpx.DecodeJSON(r, &request); err != nil {
		httpx.Error(w, http.StatusBadRequest, err)
		return
	}
	if err := h.tasks.UpdateStatus(r.Context(), r.PathValue("id"), tasks.Status(request.Status)); err != nil {
		writeServiceError(w, err)
		return
	}
	httpx.NoContent(w)
}

func (h *Handler) updateTaskPosition(w http.ResponseWriter, r *http.Request) {
	var request positionRequest
	if err := httpx.DecodeJSON(r, &request); err != nil {
		httpx.Error(w, http.StatusBadRequest, err)
		return
	}
	if err := h.tasks.UpdatePosition(r.Context(), r.PathValue("id"), request.Position); err != nil {
		writeServiceError(w, err)
		return
	}
	httpx.NoContent(w)
}

func (h *Handler) deleteTask(w http.ResponseWriter, r *http.Request) {
	if err := h.tasks.Delete(r.Context(), r.PathValue("id")); err != nil {
		writeServiceError(w, err)
		return
	}
	httpx.NoContent(w)
}

func mapTasks(items []tasks.Task) []taskResponse {
	result := make([]taskResponse, 0, len(items))
	for _, item := range items {
		result = append(result, mapTask(item))
	}
	return result
}

func mapTask(item tasks.Task) taskResponse {
	return taskResponse{
		ID:          item.ID,
		ProjectID:   item.ProjectID,
		Title:       item.Title,
		Description: item.Description,
		Status:      string(item.Status),
		Position:    item.Position,
		CreatedAt:   item.CreatedAt.Format("2006-01-02T15:04:05.999999999Z07:00"),
		UpdatedAt:   item.UpdatedAt.Format("2006-01-02T15:04:05.999999999Z07:00"),
	}
}
