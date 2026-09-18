package documents

import "context"

type repository interface {
	Create(ctx context.Context, document Document) error
	FindActive(ctx context.Context, vaultID string) ([]Document, error)
	FindDeleted(ctx context.Context, vaultID string) ([]Document, error)
	UpdateDocumentContent(ctx context.Context, id, content string) error
	Delete(ctx context.Context, id string) error
	Restore(ctx context.Context, id string) error
}

type DocumentsService struct {
	documentsRepository repository
}

func NewDocumentsService(repo repository) *DocumentsService {
	return &DocumentsService{documentsRepository: repo}
}

func (s *DocumentsService) Create(ctx context.Context, document Document) error {
	return s.documentsRepository.Create(ctx, document)
}

func (s *DocumentsService) FindActive(ctx context.Context, vaultID string) ([]Document, error) {
	return s.documentsRepository.FindActive(ctx, vaultID)
}

func (s *DocumentsService) FindDeleted(ctx context.Context, vaultID string) ([]Document, error) {
	return s.documentsRepository.FindDeleted(ctx, vaultID)
}

func (s *DocumentsService) UpdateContent(ctx context.Context, id, content string) error {
	return s.documentsRepository.UpdateDocumentContent(ctx, id, content)
}

func (s *DocumentsService) Delete(ctx context.Context, id string) error {
	return s.documentsRepository.Delete(ctx, id)
}

func (s *DocumentsService) Restore(ctx context.Context, id string) error {
	return s.documentsRepository.Restore(ctx, id)
}
