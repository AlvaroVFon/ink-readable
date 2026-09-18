package database

import (
	"context"
	"database/sql"
	"fmt"

	sqlc "ink-readable/internal/sqlc/generated"
)

func WithTransaction(ctx context.Context, db *sql.DB, fn func(q *sqlc.Queries) error) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("begin transaction: %w", err)
	}

	defer func() {
		_ = tx.Rollback()
	}()

	if err := fn(sqlc.New(tx)); err != nil {
		return err
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("commit transaction: %w", err)
	}

	return nil
}
