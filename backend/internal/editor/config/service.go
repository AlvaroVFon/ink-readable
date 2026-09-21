package editorconfig

import "context"

type repository interface {
	Get(ctx context.Context) (*EditorConfig, error)
	UpdateDarkTheme(ctx context.Context, darkTheme bool) error
	UpdateVimMotion(ctx context.Context, vimMotion bool) error
}

type EditorConfigService struct {
	editorConfigRepository repository
}

func NewEditorConfigService(repo repository) *EditorConfigService {
	return &EditorConfigService{
		editorConfigRepository: repo,
	}
}

func (s *EditorConfigService) Get(ctx context.Context) (*EditorConfig, error) {
	return s.editorConfigRepository.Get(ctx)
}

func (s *EditorConfigService) UpdateDarkTheme(ctx context.Context, darkTheme bool) error {
	return s.editorConfigRepository.UpdateDarkTheme(ctx, darkTheme)
}

func (s *EditorConfigService) UpdateVimMotion(ctx context.Context, vimMotion bool) error {
	return s.editorConfigRepository.UpdateVimMotion(ctx, vimMotion)
}
