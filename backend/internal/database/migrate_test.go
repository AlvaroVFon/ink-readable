package database

import (
	"errors"
	"io/fs"
	"path/filepath"
	"testing"
	"testing/fstest"

	"ink-readable/internal/config"
	"ink-readable/migrations"
)

func newTestDB(t *testing.T) Database {
	t.Helper()

	db, err := NewDatabase(config.DatabaseConfig{URI: filepath.Join(t.TempDir(), "ink.db")})
	if err != nil {
		t.Fatalf("open database: %v", err)
	}
	t.Cleanup(func() { _ = db.Close() })

	return db
}

func schemaVersion(t *testing.T, db Database) (int64, bool) {
	t.Helper()

	var (
		version int64
		dirty   bool
	)
	if err := db.QueryRow("SELECT version, dirty FROM schema_migrations LIMIT 1").Scan(&version, &dirty); err != nil {
		t.Fatalf("read schema version: %v", err)
	}

	return version, dirty
}

func tableExists(t *testing.T, db Database, name string) bool {
	t.Helper()

	var count int
	query := "SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = ?"
	if err := db.QueryRow(query, name).Scan(&count); err != nil {
		t.Fatalf("lookup table %q: %v", name, err)
	}

	return count == 1
}

func maxVersion(t *testing.T) int64 {
	t.Helper()

	entries, err := fs.ReadDir(migrations.FS, ".")
	if err != nil {
		t.Fatalf("read embedded migrations: %v", err)
	}

	maximum := int64(0)
	for _, entry := range entries {
		version, err := parseVersion(entry.Name())
		if err != nil {
			continue
		}
		if version > maximum {
			maximum = version
		}
	}

	return maximum
}

func subsetFS(t *testing.T, maximum int64) fstest.MapFS {
	t.Helper()

	entries, err := fs.ReadDir(migrations.FS, ".")
	if err != nil {
		t.Fatalf("read embedded migrations: %v", err)
	}

	out := fstest.MapFS{}
	for _, entry := range entries {
		version, err := parseVersion(entry.Name())
		if err != nil {
			continue
		}
		if version > maximum {
			continue
		}

		content, err := fs.ReadFile(migrations.FS, entry.Name())
		if err != nil {
			t.Fatalf("read migration %s: %v", entry.Name(), err)
		}
		out[entry.Name()] = &fstest.MapFile{Data: content}
	}

	return out
}

func TestMigrate_FreshDatabase(t *testing.T) {
	db := newTestDB(t)

	if err := Migrate(db, migrations.FS); err != nil {
		t.Fatalf("migrate: %v", err)
	}

	version, dirty := schemaVersion(t, db)
	if want := maxVersion(t); version != want {
		t.Errorf("expected schema version %d, got %d", want, version)
	}
	if dirty {
		t.Error("expected dirty = false after a successful migration")
	}

	for _, table := range []string{"vaults", "documents", "document_links", "projects", "tasks", "editor_config"} {
		if !tableExists(t, db, table) {
			t.Errorf("expected table %q to exist", table)
		}
	}
	if tableExists(t, db, "trash_items") {
		t.Error("expected dropped table \"trash_items\" to not exist")
	}
}

func TestMigrate_Idempotent(t *testing.T) {
	db := newTestDB(t)

	if err := Migrate(db, migrations.FS); err != nil {
		t.Fatalf("first migrate: %v", err)
	}
	if err := Migrate(db, migrations.FS); err != nil {
		t.Fatalf("second migrate: %v", err)
	}

	version, dirty := schemaVersion(t, db)
	if want := maxVersion(t); version != want || dirty {
		t.Errorf("expected version %d and dirty = false, got version %d dirty %t", want, version, dirty)
	}
}

func TestMigrate_AppliesOnlyPending(t *testing.T) {
	db := newTestDB(t)

	if err := Migrate(db, subsetFS(t, 3)); err != nil {
		t.Fatalf("migrate subset: %v", err)
	}

	version, dirty := schemaVersion(t, db)
	if version != 3 || dirty {
		t.Fatalf("expected version 3 and dirty = false, got version %d dirty %t", version, dirty)
	}
	if tableExists(t, db, "projects") {
		t.Fatal("did not expect \"projects\" before its migration ran")
	}

	if err := Migrate(db, migrations.FS); err != nil {
		t.Fatalf("migrate full: %v", err)
	}

	version, dirty = schemaVersion(t, db)
	if want := maxVersion(t); version != want || dirty {
		t.Errorf("expected version %d and dirty = false, got version %d dirty %t", want, version, dirty)
	}
	if !tableExists(t, db, "projects") {
		t.Error("expected \"projects\" to exist after the remaining migrations ran")
	}
}

func TestMigrate_DirtyDatabase(t *testing.T) {
	db := newTestDB(t)

	if err := Migrate(db, migrations.FS); err != nil {
		t.Fatalf("migrate: %v", err)
	}
	if _, err := db.Exec("UPDATE schema_migrations SET dirty = 1"); err != nil {
		t.Fatalf("flag dirty: %v", err)
	}

	err := Migrate(db, migrations.FS)
	if !errors.Is(err, ErrDirtyDatabase) {
		t.Fatalf("expected ErrDirtyDatabase, got %v", err)
	}
}

func TestMigrate_NoMigrations(t *testing.T) {
	db := newTestDB(t)

	if err := Migrate(db, fstest.MapFS{}); err == nil {
		t.Fatal("expected an error when no migrations are provided")
	}
}

func TestMigrate_InvalidFilename(t *testing.T) {
	db := newTestDB(t)

	fsys := fstest.MapFS{"not_a_number.up.sql": &fstest.MapFile{Data: []byte("SELECT 1;")}}
	if err := Migrate(db, fsys); err == nil {
		t.Fatal("expected an error for an invalid migration filename")
	}
}

func TestMigrate_IgnoresDownMigrations(t *testing.T) {
	db := newTestDB(t)

	fsys := fstest.MapFS{
		"000001_create_a.up.sql":   &fstest.MapFile{Data: []byte("CREATE TABLE a (id INTEGER);")},
		"000001_create_a.down.sql": &fstest.MapFile{Data: []byte("DROP TABLE a;")},
	}
	if err := Migrate(db, fsys); err != nil {
		t.Fatalf("migrate: %v", err)
	}

	version, dirty := schemaVersion(t, db)
	if version != 1 || dirty {
		t.Errorf("expected version 1 and dirty = false, got version %d dirty %t", version, dirty)
	}
}

func TestMigrate_MultiStatementFile(t *testing.T) {
	db := newTestDB(t)

	fsys := fstest.MapFS{
		"000001_multi.up.sql": &fstest.MapFile{
			Data: []byte("CREATE TABLE a (id INTEGER);\nCREATE TABLE b (id INTEGER);\n"),
		},
	}
	if err := Migrate(db, fsys); err != nil {
		t.Fatalf("migrate multi-statement: %v", err)
	}

	if !tableExists(t, db, "a") || !tableExists(t, db, "b") {
		t.Error("expected both statements of a multi-statement migration to be applied")
	}
}
