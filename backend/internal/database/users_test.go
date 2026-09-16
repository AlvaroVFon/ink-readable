package database

import (
	"context"
	"database/sql"
	"os"
	"path/filepath"
	"runtime"
	"sort"
	"strings"
	"testing"

	"ink-readable/internal/config"
	"ink-readable/internal/db/users"
)

func newMigratedTestDB(t *testing.T) *sql.DB {
	t.Helper()

	db, err := NewDatabase(config.DatabaseConfig{URI: filepath.Join(t.TempDir(), "test.db")})
	if err != nil {
		t.Fatalf("new database: %v", err)
	}

	sqlDB := (*sql.DB)(db)
	t.Cleanup(func() { _ = sqlDB.Close() })

	applyUpMigrations(t, sqlDB)

	return sqlDB
}

func applyUpMigrations(t *testing.T, db *sql.DB) {
	t.Helper()

	_, thisFile, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("cannot resolve current test file path")
	}

	pattern := filepath.Join(filepath.Dir(thisFile), "..", "..", "migrations", "*.up.sql")
	files, err := filepath.Glob(pattern)
	if err != nil {
		t.Fatalf("glob migrations: %v", err)
	}
	if len(files) == 0 {
		t.Fatalf("no up migrations found at %s", pattern)
	}
	sort.Strings(files)

	for _, file := range files {
		content, err := os.ReadFile(file)
		if err != nil {
			t.Fatalf("read migration %s: %v", file, err)
		}

		for _, stmt := range strings.Split(string(content), ";") {
			stmt = strings.TrimSpace(stmt)
			if stmt == "" {
				continue
			}
			if _, err := db.Exec(stmt); err != nil {
				t.Fatalf("apply %s: %v", file, err)
			}
		}
	}
}

func TestUsersQueries(t *testing.T) {
	ctx := context.Background()
	sqlDB := newMigratedTestDB(t)

	queries := users.New(sqlDB)

	created, err := queries.CreateUser(ctx, users.CreateUserParams{
		ID:    "user-1",
		Email: "ana@example.com",
		Name:  "Ana",
	})
	if err != nil {
		t.Fatalf("create user: %v", err)
	}
	if created.ID != "user-1" || created.Email != "ana@example.com" || created.Name != "Ana" {
		t.Errorf("unexpected created user: %+v", created)
	}
	if created.CreatedAt == "" || created.UpdatedAt == "" {
		t.Errorf("expected timestamps to be populated, got %+v", created)
	}

	got, err := queries.GetUser(ctx, "user-1")
	if err != nil {
		t.Fatalf("get user: %v", err)
	}
	if got.Email != "ana@example.com" {
		t.Errorf("expected email %q, got %q", "ana@example.com", got.Email)
	}

	byEmail, err := queries.GetUserByEmail(ctx, "ana@example.com")
	if err != nil {
		t.Fatalf("get user by email: %v", err)
	}
	if byEmail.ID != "user-1" {
		t.Errorf("expected id %q, got %q", "user-1", byEmail.ID)
	}

	all, err := queries.ListUsers(ctx)
	if err != nil {
		t.Fatalf("list users: %v", err)
	}
	if len(all) != 1 {
		t.Fatalf("expected 1 user, got %d", len(all))
	}
}

func TestUsersEmailIsUnique(t *testing.T) {
	ctx := context.Background()
	sqlDB := newMigratedTestDB(t)

	queries := users.New(sqlDB)
	params := users.CreateUserParams{ID: "user-1", Email: "ana@example.com", Name: "Ana"}
	if _, err := queries.CreateUser(ctx, params); err != nil {
		t.Fatalf("create user: %v", err)
	}

	params.ID = "user-2"
	if _, err := queries.CreateUser(ctx, params); err == nil {
		t.Fatal("expected unique constraint violation for duplicated email")
	}
}
