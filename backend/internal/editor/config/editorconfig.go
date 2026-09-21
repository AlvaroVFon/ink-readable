// Package editorconfig
package editorconfig

const DefaultID = "default"

type EditorConfig struct {
	ID           string `json:"id"`
	DarkTheme    bool   `json:"dark_theme"`
	VimMotion    bool   `json:"vim_motion"`
	FormatOnSave bool   `json:"format_on_save"`
}

func NewEditorConfig(darkTheme, vimMotion, formatOnSave bool) *EditorConfig {
	return &EditorConfig{
		ID:           DefaultID,
		DarkTheme:    darkTheme,
		VimMotion:    vimMotion,
		FormatOnSave: formatOnSave,
	}
}
