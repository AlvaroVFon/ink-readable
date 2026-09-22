package api

import (
	"ink-readable/internal/httpx"
	"net/http"

	editorconfig "ink-readable/internal/editor/config"
)

type editorConfigResponse struct {
	ID                  string `json:"id"`
	DarkTheme           bool   `json:"darkTheme"`
	VimMotion           bool   `json:"vimMotion"`
	FormatOnSave        bool   `json:"formatOnSave"`
	RelativeLineNumbers bool   `json:"relativeLineNumbers"`
}

type darkThemeRequest struct {
	DarkTheme bool `json:"darkTheme"`
}

type vimMotionRequest struct {
	VimMotion bool `json:"vimMotion"`
}

type formatOnSaveRequest struct {
	FormatOnSave bool `json:"formatOnSave"`
}

type relativeLineNumbersRequest struct {
	RelativeLineNumbers bool `json:"relativeLineNumbers"`
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

func (h *Handler) updateEditorConfigFormatOnSave(w http.ResponseWriter, r *http.Request) {
	var request formatOnSaveRequest
	if err := httpx.DecodeJSON(r, &request); err != nil {
		httpx.Error(w, http.StatusBadRequest, err)
		return
	}
	if err := h.editorConfig.UpdateFormatOnSave(r.Context(), request.FormatOnSave); err != nil {
		writeServiceError(w, err)
		return
	}
	httpx.NoContent(w)
}

func (h *Handler) updateEditorConfigRelativeLineNumbers(w http.ResponseWriter, r *http.Request) {
	var request relativeLineNumbersRequest
	if err := httpx.DecodeJSON(r, &request); err != nil {
		httpx.Error(w, http.StatusBadRequest, err)
		return
	}
	if err := h.editorConfig.UpdateRelativeLineNumbers(r.Context(), request.RelativeLineNumbers); err != nil {
		writeServiceError(w, err)
		return
	}
	httpx.NoContent(w)
}

func mapEditorConfig(item editorconfig.EditorConfig) editorConfigResponse {
	return editorConfigResponse{
		ID:                  item.ID,
		DarkTheme:           item.DarkTheme,
		VimMotion:           item.VimMotion,
		FormatOnSave:        item.FormatOnSave,
		RelativeLineNumbers: item.RelativeLineNumbers,
	}
}
