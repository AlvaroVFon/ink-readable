package projects

import "context"

type repository interface {
	Create(ctx context.Context, project Project) error
	List(ctx context.Context) ([]Project, error)
	FindByID(ctx context.Context, id string) (*Project, error)
	Rename(ctx context.Context, id, name string) error
	Delete(ctx context.Context, id string) error
}

type ProjectsService struct {
	projectsRepository repository
}

func NewProjectsService(repo repository) *ProjectsService {
	return &ProjectsService{projectsRepository: repo}
}

func (s *ProjectsService) Create(ctx context.Context, project Project) error {
	return s.projectsRepository.Create(ctx, project)
}

func (s *ProjectsService) List(ctx context.Context) ([]Project, error) {
	return s.projectsRepository.List(ctx)
}

func (s *ProjectsService) FindByID(ctx context.Context, id string) (*Project, error) {
	return s.projectsRepository.FindByID(ctx, id)
}

func (s *ProjectsService) Rename(ctx context.Context, id, name string) error {
	return s.projectsRepository.Rename(ctx, id, name)
}

func (s *ProjectsService) Delete(ctx context.Context, id string) error {
	return s.projectsRepository.Delete(ctx, id)
}
