package api

import (
	editorconfig "ink-readable/internal/editor/config"
	"ink-readable/internal/httpx"
	"net/http"
)

type editorConfigResponse struct {
	ID        string `json:"id"`
	DarkTheme bool   `json:"darkTheme"`
	VimMotion bool   `json:"vimMotion"`
}

type darkThemeRequest struct {
	DarkTheme bool `json:"darkTheme"`
}

type vimMotionRequest struct {
	VimMotion bool `json:"vimMotion"`
}

func (h *Handler) getEditorConfig(w http.ResponseWriter, r *http.Request) {
	config, err := h.editorConfig.Get(r.Context())
	if err != nil {
		writeServiceError(w, err)
		return
	}
	httpx.JSON(w, http.StatusOK, mapEditorConfig(*config))
}

func (h *Handler) updateEditorConfigDarkTheme(w http.ResponseWriter, r *http.Request) {
	var request darkThemeRequest
	if err := httpx.DecodeJSON(r, &request); err != nil {
		httpx.Error(w, http.StatusBadRequest, err)
		return
	}
	if err := h.editorConfig.UpdateDarkTheme(r.Context(), request.DarkTheme); err != nil {
		writeServiceError(w, err)
		return
	}
	httpx.NoContent(w)
}

func (h *Handler) updateEditorConfigVimMotion(w http.ResponseWriter, r *http.Request) {
	var request vimMotionRequest
	if err := httpx.DecodeJSON(r, &request); err != nil {
		httpx.Error(w, http.StatusBadRequest, err)
		return
	}
	if err := h.editorConfig.UpdateVimMotion(r.Context(), request.VimMotion); err != nil {
		writeServiceError(w, err)
		return
	}
	httpx.NoContent(w)
}

func mapEditorConfig(item editorconfig.EditorConfig) editorConfigResponse {
	return editorConfigResponse{
		ID:        item.ID,
		DarkTheme: item.DarkTheme,
		VimMotion: item.VimMotion,
	}
}
