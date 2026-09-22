package editorconfig

import "context"

type repository interface {
	Get(ctx context.Context) (*EditorConfig, error)
	UpdateDarkTheme(ctx context.Context, darkTheme bool) error
	UpdateVimMotion(ctx context.Context, vimMotion bool) error
	UpdateFormatOnSave(ctx context.Context, formatOnSave bool) error
	UpdateRelativeLineNumbers(ctx context.Context, relativeLineNumbers bool) error
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

func (s *EditorConfigService) UpdateFormatOnSave(ctx context.Context, formatOnSave bool) error {
	return s.editorConfigRepository.UpdateFormatOnSave(ctx, formatOnSave)
}

func (s *EditorConfigService) UpdateRelativeLineNumbers(ctx context.Context, relativeLineNumbers bool) error {
	return s.editorConfigRepository.UpdateRelativeLineNumbers(ctx, relativeLineNumbers)
}
