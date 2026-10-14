package database

import (
	"database/sql"
	"errors"
	"fmt"
	"io/fs"
	"sort"
	"strconv"
	"strings"
)

// migrationsTable mirrors golang-migrate's control table (same name and
// columns) so the migrations applied by this package stay interoperable with
// the golang-migrate CLI and the Docker "migrate" sidecar.
const migrationsTable = "schema_migrations"

// nilVersion mirrors golang-migrate's database.NilVersion: the version returned
// when no migration has been applied yet.
const nilVersion = -1

const upSuffix = ".up.sql"

// ErrDirtyDatabase is returned when a previous migration failed halfway, the
// same condition golang-migrate reports as a "dirty" database.
var ErrDirtyDatabase = errors.New("database is dirty")

type migration struct {
	version int64
	name    string
	sql     string
}

// Migrate applies every pending up migration from migrationsFS over db.
//
// It is idempotent: running it again on an up-to-date database is a no-op. Each
// migration runs inside a transaction, and the schema_migrations row is marked
// dirty before running and clean afterwards, matching golang-migrate semantics.
// A dirty database returns an error wrapping ErrDirtyDatabase and is never
// touched.
func Migrate(db Database, migrationsFS fs.FS) error {
	if err := ensureVersionTable(db); err != nil {
		return err
	}

	current, dirty, err := currentVersion(db)
	if err != nil {
		return err
	}
	if dirty {
		return fmt.Errorf("%w: version %d; fix it with the migrate CLI or restore a backup", ErrDirtyDatabase, current)
	}

	migrations, err := loadMigrations(migrationsFS)
	if err != nil {
		return err
	}

	for _, m := range migrations {
		if current >= m.version {
			continue
		}

		if err := setVersion(db, m.version, true); err != nil {
			return err
		}
		if err := runMigration(db, m); err != nil {
			return fmt.Errorf("migration %d (%s): %w", m.version, m.name, err)
		}
		if err := setVersion(db, m.version, false); err != nil {
			return err
		}

		current = m.version
	}

	return nil
}

func ensureVersionTable(db Database) error {
	query := `CREATE TABLE IF NOT EXISTS ` + migrationsTable + ` (version uint64, dirty bool)`
	if _, err := db.Exec(query); err != nil {
		return fmt.Errorf("create %s table: %w", migrationsTable, err)
	}

	return nil
}

func currentVersion(db Database) (int64, bool, error) {
	var (
		version int64
		dirty   bool
	)

	query := "SELECT version, dirty FROM " + migrationsTable + " LIMIT 1"
	err := db.QueryRow(query).Scan(&version, &dirty)
	if errors.Is(err, sql.ErrNoRows) {
		return nilVersion, false, nil
	}
	if err != nil {
		return nilVersion, false, fmt.Errorf("read schema version: %w", err)
	}

	return version, dirty, nil
}

func setVersion(db Database, version int64, dirty bool) error {
	tx, err := db.Begin()
	if err != nil {
		return fmt.Errorf("begin set version: %w", err)
	}

	if _, err := tx.Exec("DELETE FROM " + migrationsTable); err != nil {
		_ = tx.Rollback()
		return fmt.Errorf("reset schema version: %w", err)
	}

	query := "INSERT INTO " + migrationsTable + " (version, dirty) VALUES (?, ?)"
	if _, err := tx.Exec(query, version, dirty); err != nil {
		_ = tx.Rollback()
		return fmt.Errorf("write schema version: %w", err)
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("commit schema version: %w", err)
	}

	return nil
}

func runMigration(db Database, m migration) error {
	tx, err := db.Begin()
	if err != nil {
		return fmt.Errorf("begin migration: %w", err)
	}

	if _, err := tx.Exec(m.sql); err != nil {
		_ = tx.Rollback()
		return fmt.Errorf("exec migration: %w", err)
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("commit migration: %w", err)
	}

	return nil
}

func loadMigrations(migrationsFS fs.FS) ([]migration, error) {
	entries, err := fs.ReadDir(migrationsFS, ".")
	if err != nil {
		return nil, fmt.Errorf("read migrations dir: %w", err)
	}

	migrations := make([]migration, 0, len(entries))
	for _, entry := range entries {
		if entry.IsDir() || !strings.HasSuffix(entry.Name(), upSuffix) {
			continue
		}

		version, err := parseVersion(entry.Name())
		if err != nil {
			return nil, err
		}

		content, err := fs.ReadFile(migrationsFS, entry.Name())
		if err != nil {
			return nil, fmt.Errorf("read migration %s: %w", entry.Name(), err)
		}

		migrations = append(migrations, migration{
			version: version,
			name:    strings.TrimSuffix(entry.Name(), upSuffix),
			sql:     string(content),
		})
	}

	if len(migrations) == 0 {
		return nil, fmt.Errorf("no %s migrations found", upSuffix)
	}

	sort.Slice(migrations, func(i, j int) bool {
		return migrations[i].version < migrations[j].version
	})

	for i := 1; i < len(migrations); i++ {
		if migrations[i].version == migrations[i-1].version {
			return nil, fmt.Errorf("duplicate migration version %d", migrations[i].version)
		}
	}

	return migrations, nil
}

func parseVersion(filename string) (int64, error) {
	base := strings.TrimSuffix(filename, upSuffix)

	prefix, _, ok := strings.Cut(base, "_")
	if !ok {
		return 0, fmt.Errorf("invalid migration filename %q: expected <version>_<name>%s", filename, upSuffix)
	}

	version, err := strconv.ParseInt(prefix, 10, 64)
	if err != nil {
		return 0, fmt.Errorf("invalid migration version in %q: %w", filename, err)
	}

	return version, nil
}
