package documents

import "context"

type repository interface {
	Create(ctx context.Context, document Document) error
	FindActive(ctx context.Context, vaultID string) ([]Document, error)
	FindDeleted(ctx context.Context, vaultID string) ([]Document, error)
	FindByID(ctx context.Context, id string) (*Document, error)
	Rename(ctx context.Context, id, name, path string) error
	Move(ctx context.Context, id, path string) error
	UpdateDocumentContent(ctx context.Context, id, content string) error
	Delete(ctx context.Context, id string) error
	DeletePermanently(ctx context.Context, id string) error
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

func (s *DocumentsService) FindByID(ctx context.Context, id string) (*Document, error) {
	return s.documentsRepository.FindByID(ctx, id)
}

func (s *DocumentsService) Rename(ctx context.Context, id, name, path string) error {
	return s.documentsRepository.Rename(ctx, id, name, path)
}

func (s *DocumentsService) Move(ctx context.Context, id, path string) error {
	return s.documentsRepository.Move(ctx, id, path)
}

func (s *DocumentsService) UpdateContent(ctx context.Context, id, content string) error {
	return s.documentsRepository.UpdateDocumentContent(ctx, id, content)
}

func (s *DocumentsService) Delete(ctx context.Context, id string) error {
	return s.documentsRepository.Delete(ctx, id)
}

func (s *DocumentsService) DeletePermanently(ctx context.Context, id string) error {
	return s.documentsRepository.DeletePermanently(ctx, id)
}

func (s *DocumentsService) Restore(ctx context.Context, id string) error {
	return s.documentsRepository.Restore(ctx, id)
}
