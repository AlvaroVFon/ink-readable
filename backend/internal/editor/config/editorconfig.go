// Package editorconfig
package editorconfig

const DefaultID = "default"

type EditorConfig struct {
	ID        string `json:"id"`
	DarkTheme bool   `json:"dark_theme"`
	VimMotion bool   `json:"vim_motion"`
}

func NewEditorConfig(darkTheme, vimMotion bool) *EditorConfig {
	return &EditorConfig{
		ID:        DefaultID,
		DarkTheme: darkTheme,
		VimMotion: vimMotion,
	}
}
