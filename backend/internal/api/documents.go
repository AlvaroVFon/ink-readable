package api

import (
	"net/http"

	"ink-readable/internal/documents"
	"ink-readable/internal/httpx"
)

type documentResponse struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	VaultID   string `json:"vaultId"`
	Path      string `json:"path"`
	Content   string `json:"content"`
	Deleted   bool   `json:"deleted"`
	CreatedAt string `json:"createdAt"`
	UpdatedAt string `json:"updatedAt"`
}

type createDocumentRequest struct {
	Name    string `json:"name"`
	Path    string `json:"path"`
	Content string `json:"content"`
}

type renameDocumentRequest struct {
	Name string `json:"name"`
	Path string `json:"path"`
}

type pathRequest struct {
	Path string `json:"path"`
}

type contentRequest struct {
	Content string `json:"content"`
}

func (h *Handler) listDocuments(w http.ResponseWriter, r *http.Request) {
	items, err := h.documents.FindActive(r.Context(), r.PathValue("vaultID"))
	if err != nil {
		writeServiceError(w, err)
		return
	}
	httpx.JSON(w, http.StatusOK, mapDocuments(items))
}

func (h *Handler) listDeletedDocuments(w http.ResponseWriter, r *http.Request) {
	items, err := h.documents.FindDeleted(r.Context(), r.PathValue("vaultID"))
	if err != nil {
		writeServiceError(w, err)
		return
	}
	httpx.JSON(w, http.StatusOK, mapDocuments(items))
}

func (h *Handler) createDocument(w http.ResponseWriter, r *http.Request) {
	var request createDocumentRequest
	if err := httpx.DecodeJSON(r, &request); err != nil {
		httpx.Error(w, http.StatusBadRequest, err)
		return
	}
	document, err := documents.NewDocument(request.Name, r.PathValue("vaultID"), request.Path, request.Content)
	if err != nil {
		writeServiceError(w, err)
		return
	}
	if err := h.documents.Create(r.Context(), *document); err != nil {
		writeServiceError(w, err)
		return
	}
	httpx.JSON(w, http.StatusCreated, mapDocument(*document))
}

func (h *Handler) getDocument(w http.ResponseWriter, r *http.Request) {
	document, err := h.documents.FindByID(r.Context(), r.PathValue("id"))
	if err != nil {
		writeServiceError(w, err)
		return
	}
	httpx.JSON(w, http.StatusOK, mapDocument(*document))
}

func (h *Handler) renameDocument(w http.ResponseWriter, r *http.Request) {
	var request renameDocumentRequest
	if err := httpx.DecodeJSON(r, &request); err != nil {
		httpx.Error(w, http.StatusBadRequest, err)
		return
	}
	if err := h.documents.Rename(r.Context(), r.PathValue("id"), request.Name, request.Path); err != nil {
		writeServiceError(w, err)
		return
	}
	httpx.NoContent(w)
}

func (h *Handler) moveDocument(w http.ResponseWriter, r *http.Request) {
	var request pathRequest
	if err := httpx.DecodeJSON(r, &request); err != nil {
		httpx.Error(w, http.StatusBadRequest, err)
		return
	}
	if err := h.documents.Move(r.Context(), r.PathValue("id"), request.Path); err != nil {
		writeServiceError(w, err)
		return
	}
	httpx.NoContent(w)
}

func (h *Handler) updateDocumentContent(w http.ResponseWriter, r *http.Request) {
	var request contentRequest
	if err := httpx.DecodeJSON(r, &request); err != nil {
		httpx.Error(w, http.StatusBadRequest, err)
		return
	}
	if err := h.documents.UpdateContent(r.Context(), r.PathValue("id"), request.Content); err != nil {
		writeServiceError(w, err)
		return
	}
	httpx.NoContent(w)
}

func (h *Handler) deleteDocument(w http.ResponseWriter, r *http.Request) {
	if err := h.documents.Delete(r.Context(), r.PathValue("id")); err != nil {
		writeServiceError(w, err)
		return
	}
	httpx.NoContent(w)
}

func (h *Handler) restoreDocument(w http.ResponseWriter, r *http.Request) {
	if err := h.documents.Restore(r.Context(), r.PathValue("id")); err != nil {
		writeServiceError(w, err)
		return
	}
	httpx.NoContent(w)
}

func (h *Handler) deleteDocumentPermanently(w http.ResponseWriter, r *http.Request) {
	if err := h.documents.DeletePermanently(r.Context(), r.PathValue("id")); err != nil {
		writeServiceError(w, err)
		return
	}
	httpx.NoContent(w)
}

func mapDocuments(items []documents.Document) []documentResponse {
	result := make([]documentResponse, 0, len(items))
	for _, item := range items {
		result = append(result, mapDocument(item))
	}
	return result
}

func mapDocument(item documents.Document) documentResponse {
	return documentResponse{
		ID:        item.ID,
		Name:      item.Name,
		VaultID:   item.VauldID,
		Path:      item.Path,
		Content:   item.Content,
		Deleted:   item.Deleted,
		CreatedAt: item.CreatedAt.Format("2006-01-02T15:04:05.999999999Z07:00"),
		UpdatedAt: item.UpdatedAt.Format("2006-01-02T15:04:05.999999999Z07:00"),
	}
}
