package tasks

import "context"

type repository interface {
	Create(ctx context.Context, task Task) error
	List(ctx context.Context, projectID string) ([]Task, error)
	FindByID(ctx context.Context, id string) (*Task, error)
	UpdateTitle(ctx context.Context, id, title string) error
	UpdateDescription(ctx context.Context, id, description string) error
	UpdateStatus(ctx context.Context, id string, status Status) error
	UpdatePosition(ctx context.Context, id string, position int64) error
	Delete(ctx context.Context, id string) error
}

type TasksService struct {
	tasksRepository repository
}

func NewTasksService(repo repository) *TasksService {
	return &TasksService{tasksRepository: repo}
}

func (s *TasksService) Create(ctx context.Context, task Task) error {
	return s.tasksRepository.Create(ctx, task)
}

func (s *TasksService) List(ctx context.Context, projectID string) ([]Task, error) {
	return s.tasksRepository.List(ctx, projectID)
}

func (s *TasksService) FindByID(ctx context.Context, id string) (*Task, error) {
	return s.tasksRepository.FindByID(ctx, id)
}

func (s *TasksService) UpdateTitle(ctx context.Context, id, title string) error {
	return s.tasksRepository.UpdateTitle(ctx, id, title)
}

func (s *TasksService) UpdateDescription(ctx context.Context, id, description string) error {
	return s.tasksRepository.UpdateDescription(ctx, id, description)
}

func (s *TasksService) UpdateStatus(ctx context.Context, id string, status Status) error {
	return s.tasksRepository.UpdateStatus(ctx, id, status)
}

func (s *TasksService) UpdatePosition(ctx context.Context, id string, position int64) error {
	return s.tasksRepository.UpdatePosition(ctx, id, position)
}

func (s *TasksService) Delete(ctx context.Context, id string) error {
	return s.tasksRepository.Delete(ctx, id)
}
