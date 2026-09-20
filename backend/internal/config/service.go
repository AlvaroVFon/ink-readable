package config

import "context"

type ConfigService struct {
	config *Config
}

func NewConfigService(cfg *Config) *ConfigService {
	return &ConfigService{
		config: cfg,
	}
}

func (s *ConfigService) ListFrontSecrets(ctx context.Context) *FrontConfig {
	return &s.config.FrontConfig
}
