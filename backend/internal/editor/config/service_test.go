// Package editorconfig
package editorconfig

import (
	"context"
	"errors"
	"testing"
)

type fakeRepository struct {
	get             func(context.Context) (*EditorConfig, error)
	updateDarkTheme func(context.Context, bool) error
	updateVimMotion func(context.Context, bool) error
}

func (f *fakeRepository) Get(ctx context.Context) (*EditorConfig, error) {
	return f.get(ctx)
}

func (f *fakeRepository) UpdateDarkTheme(ctx context.Context, darkTheme bool) error {
	return f.updateDarkTheme(ctx, darkTheme)
}

func (f *fakeRepository) UpdateVimMotion(ctx context.Context, vimMotion bool) error {
	return f.updateVimMotion(ctx, vimMotion)
}

func TestEditorConfigService_Get_ReturnsRepositoryResult(t *testing.T) {
	want := &EditorConfig{ID: DefaultID, DarkTheme: true, VimMotion: true}

	service := NewEditorConfigService(&fakeRepository{
		get: func(context.Context) (*EditorConfig, error) {
			return want, nil
		},
	})

	got, err := service.Get(context.Background())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got != want {
		t.Errorf("expected config %+v, got %+v", want, got)
	}
}

func TestEditorConfigService_UpdateDarkTheme_Delegates(t *testing.T) {
	var got bool

	service := NewEditorConfigService(&fakeRepository{
		updateDarkTheme: func(_ context.Context, darkTheme bool) error {
			got = darkTheme
			return nil
		},
	})

	if err := service.UpdateDarkTheme(context.Background(), true); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !got {
		t.Errorf("expected dark theme true, got false")
	}
}

func TestEditorConfigService_UpdateVimMotion_Delegates(t *testing.T) {
	var got bool

	service := NewEditorConfigService(&fakeRepository{
		updateVimMotion: func(_ context.Context, vimMotion bool) error {
			got = vimMotion
			return nil
		},
	})

	if err := service.UpdateVimMotion(context.Background(), false); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got {
		t.Errorf("expected vim motion false, got true")
	}
}

func TestEditorConfigService_PropagatesRepositoryErrors(t *testing.T) {
	wantErr := errors.New("boom")
	service := NewEditorConfigService(&fakeRepository{
		get:             func(context.Context) (*EditorConfig, error) { return nil, wantErr },
		updateDarkTheme: func(context.Context, bool) error { return wantErr },
		updateVimMotion: func(context.Context, bool) error { return wantErr },
	})
	ctx := context.Background()

	if _, err := service.Get(ctx); !errors.Is(err, wantErr) {
		t.Errorf("Get: expected %v, got %v", wantErr, err)
	}
	if err := service.UpdateDarkTheme(ctx, true); !errors.Is(err, wantErr) {
		t.Errorf("UpdateDarkTheme: expected %v, got %v", wantErr, err)
	}
	if err := service.UpdateVimMotion(ctx, true); !errors.Is(err, wantErr) {
		t.Errorf("UpdateVimMotion: expected %v, got %v", wantErr, err)
	}
}
