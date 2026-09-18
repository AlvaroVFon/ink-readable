// Package database
package database

import (
	"database/sql"

	"ink-readable/internal/config"

	_ "github.com/glebarez/go-sqlite"
)

type Database = *sql.DB

func NewDatabase(cfg config.DatabaseConfig) (Database, error) {
	db, err := sql.Open("sqlite", cfg.URI)
	if err != nil {
		return nil, err
	}

	return db, nil
}
