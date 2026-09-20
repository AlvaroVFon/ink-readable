package config

import (
	"context"
	"errors"
	"fmt"
	"os"
)

const EnvDev = "development"

var (
	ErrConfigNotFoundForKey = errors.New("config not found for key")
	ErrMissingEnvVar        = errors.New("missing environment variable")
)

type Config struct {
	AppConfig      AppConfig
	DatabaseConfig DatabaseConfig
}

type AppConfig struct {
	BaseURL string
	Port    string
}

type DatabaseConfig struct {
	URI        string `json:"uri"`
	DBHost     string `json:"dbHost"`
	DBPort     string `json:"dbPort"`
	DBName     string `json:"dbName"`
	DBUser     string `json:"dbUser"`
	DBPassword string `json:"dbPassword"`
}

func LoadConfig(ctx context.Context, client *VaultClient) (*Config, error) {
	secrets, err := client.GetSecrets(ctx)
	if err != nil {
		return nil, err
	}

	appConfig, err := loadAppConfig(secrets)
	if err != nil {
		return nil, err
	}

	dbConfig, err := loadDatabaseConfig(secrets)
	if err != nil {
		return nil, err
	}

	return &Config{
		AppConfig:      *appConfig,
		DatabaseConfig: *dbConfig,
	}, nil
}

func loadAppConfig(secrets map[string]string) (*AppConfig, error) {
	dbKeys := []string{"app.baseURL", "app.port"}
	for _, key := range dbKeys {
		_, ok := secrets[key]
		if !ok {
			return nil, fmt.Errorf("%w: %q", ErrConfigNotFoundForKey, key)
		}
	}

	return &AppConfig{
		BaseURL: secrets["app.baseURL"],
		Port:    secrets["app.port"],
	}, nil
}

func loadDatabaseConfig(secrets map[string]string) (*DatabaseConfig, error) {
	dbKeys := []string{"db.uri", "db.host", "db.port", "db.name", "db.user", "db.password"}
	for _, key := range dbKeys {
		_, ok := secrets[key]
		if !ok {
			return nil, fmt.Errorf("%w: %q", ErrConfigNotFoundForKey, key)
		}
	}

	return &DatabaseConfig{
		URI:        secrets["db.uri"],
		DBHost:     secrets["db.host"],
		DBPort:     secrets["db.port"],
		DBName:     secrets["db.name"],
		DBUser:     secrets["db.user"],
		DBPassword: secrets["db.password"],
	}, nil
}

func LoadEnvConfig() (*Config, error) {
	appConfig, err := loadAppConfigFromEnv()
	if err != nil {
		return nil, err
	}

	dbConfig, err := loadDatabaseConfigFromEnv()
	if err != nil {
		return nil, err
	}

	return &Config{
		AppConfig:      *appConfig,
		DatabaseConfig: *dbConfig,
	}, nil
}

func loadAppConfigFromEnv() (*AppConfig, error) {
	keys := []string{"APP_BASE_URL", "APP_PORT"}
	for _, key := range keys {
		if _, ok := os.LookupEnv(key); !ok {
			return nil, fmt.Errorf("%w: %q", ErrMissingEnvVar, key)
		}
	}

	return &AppConfig{
		BaseURL: os.Getenv("APP_BASE_URL"),
		Port:    os.Getenv("APP_PORT"),
	}, nil
}

func loadDatabaseConfigFromEnv() (*DatabaseConfig, error) {
	keys := []string{
		"DATABASE_URI", "DATABASE_HOST", "DATABASE_PORT",
		"DATABASE_NAME", "DATABASE_USER", "DATABASE_PASSWORD",
	}
	for _, key := range keys {
		if _, ok := os.LookupEnv(key); !ok {
			return nil, fmt.Errorf("%w: %q", ErrMissingEnvVar, key)
		}
	}

	return &DatabaseConfig{
		URI:        os.Getenv("DATABASE_URI"),
		DBHost:     os.Getenv("DATABASE_HOST"),
		DBPort:     os.Getenv("DATABASE_PORT"),
		DBName:     os.Getenv("DATABASE_NAME"),
		DBUser:     os.Getenv("DATABASE_USER"),
		DBPassword: os.Getenv("DATABASE_PASSWORD"),
	}, nil
}
