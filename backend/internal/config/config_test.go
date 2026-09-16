// Package config
package config

import (
	"context"
	"errors"
	"net/http"
	"testing"
)

func fullSecrets() map[string]string {
	return map[string]string{
		"app.baseURL": "localhost",
		"app.port":    "8082",
		"db.uri":      "/app/data/ink-readable.db",
		"db.host":     "localhost",
		"db.port":     "5432",
		"db.name":     "ink-readable",
		"db.user":     "admin",
		"db.password": "s3cret",
	}
}

func TestLoadAppConfig(t *testing.T) {
	tests := []struct {
		name       string
		secrets    map[string]string
		wantErr    bool
		wantConfig *AppConfig
	}{
		{
			name:       "complete",
			secrets:    map[string]string{"app.baseURL": "localhost", "app.port": "8082"},
			wantConfig: &AppConfig{BaseURL: "localhost", Port: "8082"},
		},
		{
			name:    "missing baseURL",
			secrets: map[string]string{"app.port": "8082"},
			wantErr: true,
		},
		{
			name:    "missing port",
			secrets: map[string]string{"app.baseURL": "localhost"},
			wantErr: true,
		},
		{
			name:       "empty values are allowed",
			secrets:    map[string]string{"app.baseURL": "", "app.port": ""},
			wantConfig: &AppConfig{BaseURL: "", Port: ""},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := loadAppConfig(tt.secrets)

			if tt.wantErr {
				if !errors.Is(err, ErrConfigNotFoundForKey) {
					t.Fatalf("expected ErrConfigNotFoundForKey, got %v", err)
				}
				return
			}

			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if *got != *tt.wantConfig {
				t.Errorf("expected %+v, got %+v", *tt.wantConfig, *got)
			}
		})
	}
}

func TestLoadDatabaseConfig(t *testing.T) {
	tests := []struct {
		name       string
		secrets    map[string]string
		wantErr    bool
		wantConfig *DatabaseConfig
	}{
		{
			name:    "complete",
			secrets: fullSecrets(),
			wantConfig: &DatabaseConfig{
				URI:        "/app/data/ink-readable.db",
				DBHost:     "localhost",
				DBPort:     "5432",
				DBName:     "ink-readable",
				DBUser:     "admin",
				DBPassword: "s3cret",
			},
		},
		{
			name: "missing uri",
			secrets: map[string]string{
				"db.host": "localhost", "db.port": "5432", "db.name": "ink-readable",
				"db.user": "admin", "db.password": "s3cret",
			},
			wantErr: true,
		},
		{
			name: "missing password",
			secrets: map[string]string{
				"db.uri": "/app/data/ink-readable.db", "db.host": "localhost", "db.port": "5432",
				"db.name": "ink-readable", "db.user": "admin",
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := loadDatabaseConfig(tt.secrets)

			if tt.wantErr {
				if !errors.Is(err, ErrConfigNotFoundForKey) {
					t.Fatalf("expected ErrConfigNotFoundForKey, got %v", err)
				}
				return
			}

			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if *got != *tt.wantConfig {
				t.Errorf("expected %+v, got %+v", *tt.wantConfig, *got)
			}
		})
	}
}

func TestLoadDatabaseConfig_EveryKeyRequired(t *testing.T) {
	required := []string{"db.uri", "db.host", "db.port", "db.name", "db.user", "db.password"}

	for _, missing := range required {
		t.Run("missing "+missing, func(t *testing.T) {
			secrets := fullSecrets()
			delete(secrets, missing)

			if _, err := loadDatabaseConfig(secrets); err == nil {
				t.Fatalf("expected error when %q is missing", missing)
			}
		})
	}
}

func TestLoadConfig(t *testing.T) {
	client, _ := newTestVaultClient(t, func(w http.ResponseWriter, r *http.Request) {
		writeVaultResponse(t, w, http.StatusOK, secretsToData(fullSecrets()))
	})

	cfg, err := LoadConfig(context.Background(), client)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	wantApp := AppConfig{BaseURL: "localhost", Port: "8082"}
	if cfg.AppConfig != wantApp {
		t.Errorf("expected AppConfig %+v, got %+v", wantApp, cfg.AppConfig)
	}

	wantDB := DatabaseConfig{
		URI:        "/app/data/ink-readable.db",
		DBHost:     "localhost",
		DBPort:     "5432",
		DBName:     "ink-readable",
		DBUser:     "admin",
		DBPassword: "s3cret",
	}
	if cfg.DatabaseConfig != wantDB {
		t.Errorf("expected DatabaseConfig %+v, got %+v", wantDB, cfg.DatabaseConfig)
	}
}

func TestLoadConfig_MissingKey(t *testing.T) {
	secrets := fullSecrets()
	delete(secrets, "db.user")

	client, _ := newTestVaultClient(t, func(w http.ResponseWriter, r *http.Request) {
		writeVaultResponse(t, w, http.StatusOK, secretsToData(secrets))
	})

	if _, err := LoadConfig(context.Background(), client); !errors.Is(err, ErrConfigNotFoundForKey) {
		t.Fatalf("expected ErrConfigNotFoundForKey, got %v", err)
	}
}

func TestLoadConfig_MissingAppKey(t *testing.T) {
	secrets := fullSecrets()
	delete(secrets, "app.port")

	client, _ := newTestVaultClient(t, func(w http.ResponseWriter, r *http.Request) {
		writeVaultResponse(t, w, http.StatusOK, secretsToData(secrets))
	})

	if _, err := LoadConfig(context.Background(), client); !errors.Is(err, ErrConfigNotFoundForKey) {
		t.Fatalf("expected ErrConfigNotFoundForKey, got %v", err)
	}
}

func TestLoadConfig_VaultUnreachable(t *testing.T) {
	client, err := NewVaultClient("http://127.0.0.1:1", "test-apikey")
	if err != nil {
		t.Fatalf("unexpected error creating client: %v", err)
	}

	if _, err := LoadConfig(context.Background(), client); err == nil {
		t.Fatal("expected error when the vault is unreachable")
	}
}

func secretsToData(secrets map[string]string) []Secret {
	data := make([]Secret, 0, len(secrets))
	for key, value := range secrets {
		data = append(data, Secret{Key: key, Value: value})
	}
	return data
}
