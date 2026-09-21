package editorconfig

import (
	"context"
	"database/sql"
	"time"

	sqlc "ink-readable/internal/sqlc/generated"
)

type EditorConfigRepository struct {
	Store sqlc.Queries
}

func NewEditorConfigRepository(queries sqlc.Queries) *EditorConfigRepository {
	return &EditorConfigRepository{
		Store: queries,
	}
}

func (r *EditorConfigRepository) Get(ctx context.Context) (*EditorConfig, error) {
	row, err := r.Store.GetEditorConfig(ctx, DefaultID)
	if err != nil {
		return nil, err
	}

	return &EditorConfig{
		ID:        row.ID,
		DarkTheme: row.DarkTheme != 0,
		VimMotion: row.VimMotion != 0,
	}, nil
}

func (r *EditorConfigRepository) UpdateDarkTheme(ctx context.Context, darkTheme bool) error {
	return r.Store.UpdateEditorConfigDarkTheme(ctx, sqlc.UpdateEditorConfigDarkThemeParams{
		DarkTheme: boolToInt64(darkTheme),
		UpdatedAt: timestamp(),
		ID:        DefaultID,
	})
}

func (r *EditorConfigRepository) UpdateVimMotion(ctx context.Context, vimMotion bool) error {
	return r.Store.UpdateEditorConfigVimMotion(ctx, sqlc.UpdateEditorConfigVimMotionParams{
		VimMotion: boolToInt64(vimMotion),
		UpdatedAt: timestamp(),
		ID:        DefaultID,
	})
}

func boolToInt64(value bool) int64 {
	if value {
		return 1
	}
	return 0
}

func timestamp() sql.NullString {
	return sql.NullString{String: time.Now().UTC().Format(time.RFC3339Nano), Valid: true}
}
