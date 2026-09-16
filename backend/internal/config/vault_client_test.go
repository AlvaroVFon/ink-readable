// Package config
package config

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestNewVaultClient(t *testing.T) {
	tests := []struct {
		name    string
		baseURL string
		apikey  string
		wantErr error
	}{
		{
			name:    "valid",
			baseURL: "http://localhost:8080",
			apikey:  "test-apikey",
		},
		{
			name:    "empty baseURL",
			baseURL: "",
			apikey:  "test-apikey",
			wantErr: ErrEmptyArgument,
		},
		{
			name:    "empty apikey",
			baseURL: "http://localhost:8080",
			apikey:  "",
			wantErr: ErrEmptyArgument,
		},
		{
			name:    "invalid baseURL",
			baseURL: "http://[::1",
			apikey:  "test-apikey",
			wantErr: ErrorInvalidURL,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			client, err := NewVaultClient(tt.baseURL, tt.apikey)

			if tt.wantErr != nil {
				if !errors.Is(err, tt.wantErr) {
					t.Fatalf("expected error %v, got %v", tt.wantErr, err)
				}
				if client != nil {
					t.Fatal("expected nil client when construction fails")
				}
				return
			}

			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if client.BaseURL != tt.baseURL {
				t.Errorf("expected BaseURL %q, got %q", tt.baseURL, client.BaseURL)
			}
			if client.Apikey != tt.apikey {
				t.Errorf("expected Apikey %q, got %q", tt.apikey, client.Apikey)
			}
			if client.Client == nil {
				t.Fatal("expected non-nil http client")
			}
			if client.Client.Timeout != defaultTimeout {
				t.Errorf("expected timeout %v, got %v", defaultTimeout, client.Client.Timeout)
			}
		})
	}
}

func TestGetSecrets_Success(t *testing.T) {
	var (
		gotMethod string
		gotPath   string
		gotApikey string
		gotAccept string
	)

	handler := func(w http.ResponseWriter, r *http.Request) {
		gotMethod = r.Method
		gotPath = r.URL.Path
		gotApikey = r.Header.Get(apikeHeader)
		gotAccept = r.Header.Get("Accept")
		writeVaultResponse(t, w, http.StatusOK, []Secret{
			{Key: "app.baseURL", Value: "localhost"},
			{Key: "app.port", Value: "8082"},
		})
	}

	client, _ := newTestVaultClient(t, handler)

	secrets, err := client.GetSecrets(context.Background())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if gotMethod != http.MethodGet {
		t.Errorf("expected method %q, got %q", http.MethodGet, gotMethod)
	}
	if gotPath != secretsURL {
		t.Errorf("expected path %q, got %q", secretsURL, gotPath)
	}
	if gotApikey != "test-apikey" {
		t.Errorf("expected apikey header %q, got %q", "test-apikey", gotApikey)
	}
	if gotAccept != "application/json" {
		t.Errorf("expected Accept header %q, got %q", "application/json", gotAccept)
	}

	if len(secrets) != 2 {
		t.Fatalf("expected 2 secrets, got %d", len(secrets))
	}
	if secrets["app.baseURL"] != "localhost" {
		t.Errorf("expected app.baseURL %q, got %q", "localhost", secrets["app.baseURL"])
	}
	if secrets["app.port"] != "8082" {
		t.Errorf("expected app.port %q, got %q", "8082", secrets["app.port"])
	}
}

func TestGetSecrets_EmptyData(t *testing.T) {
	client, _ := newTestVaultClient(t, func(w http.ResponseWriter, r *http.Request) {
		writeVaultResponse(t, w, http.StatusOK, nil)
	})

	secrets, err := client.GetSecrets(context.Background())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(secrets) != 0 {
		t.Errorf("expected empty map, got %v", secrets)
	}
}

func TestGetSecrets_DuplicateKeysKeepLast(t *testing.T) {
	client, _ := newTestVaultClient(t, func(w http.ResponseWriter, r *http.Request) {
		writeVaultResponse(t, w, http.StatusOK, []Secret{
			{Key: "db.uri", Value: "first"},
			{Key: "db.uri", Value: "second"},
		})
	})

	secrets, err := client.GetSecrets(context.Background())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if secrets["db.uri"] != "second" {
		t.Errorf("expected last value %q, got %q", "second", secrets["db.uri"])
	}
}

func TestGetSecrets_InvalidJSON(t *testing.T) {
	client, _ := newTestVaultClient(t, func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		if _, err := w.Write([]byte("{not-json")); err != nil {
			t.Errorf("writing body: %v", err)
		}
	})

	if _, err := client.GetSecrets(context.Background()); err == nil {
		t.Fatal("expected decode error, got nil")
	}
}

func TestGetSecrets_IgnoresNonSuccessStatus(t *testing.T) {
	client, _ := newTestVaultClient(t, func(w http.ResponseWriter, r *http.Request) {
		writeVaultResponse(t, w, http.StatusUnauthorized, nil)
	})

	secrets, err := client.GetSecrets(context.Background())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(secrets) != 0 {
		t.Errorf("expected empty map, got %v", secrets)
	}
}

func TestGetSecrets_InvalidRequestURL(t *testing.T) {
	client := &VaultClient{
		BaseURL: "http://localhost/\n",
		Apikey:  "test-apikey",
		Client:  &http.Client{Timeout: defaultTimeout},
	}

	if _, err := client.GetSecrets(context.Background()); !errors.Is(err, ErrCreatingHTTPRequest) {
		t.Fatalf("expected ErrCreatingHTTPRequest, got %v", err)
	}
}

func TestGetSecrets_ServerUnreachable(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {}))
	client, err := NewVaultClient(server.URL, "test-apikey")
	if err != nil {
		t.Fatalf("unexpected error creating client: %v", err)
	}
	server.Close()

	if _, err := client.GetSecrets(context.Background()); err == nil {
		t.Fatal("expected request error, got nil")
	}
}

func TestGetSecrets_ContextCanceled(t *testing.T) {
	client, _ := newTestVaultClient(t, func(w http.ResponseWriter, r *http.Request) {
		writeVaultResponse(t, w, http.StatusOK, nil)
	})

	ctx, cancel := context.WithCancel(context.Background())
	cancel()

	if _, err := client.GetSecrets(ctx); err == nil {
		t.Fatal("expected context error, got nil")
	}
}

func newTestVaultClient(t *testing.T, handler http.HandlerFunc) (*VaultClient, *httptest.Server) {
	t.Helper()

	server := httptest.NewServer(handler)
	t.Cleanup(server.Close)

	client, err := NewVaultClient(server.URL, "test-apikey")
	if err != nil {
		t.Fatalf("unexpected error creating client: %v", err)
	}

	return client, server
}

func writeVaultResponse(t *testing.T, w http.ResponseWriter, status int, data []Secret) {
	t.Helper()

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)

	if err := json.NewEncoder(w).Encode(VaultResponse{Status: status, Message: "ok", Data: data}); err != nil {
		t.Errorf("encoding vault response: %v", err)
	}
}
