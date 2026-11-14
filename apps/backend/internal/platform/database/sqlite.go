// Package database opens the SQLite database shared by the backend modules.
package database

import (
	"database/sql"
	"fmt"
	"net/url"
	"os"
	"path/filepath"

	_ "modernc.org/sqlite" // Pure Go driver: builds with CGO_ENABLED=0.
)

// OpenSQLite opens (or creates) the database file at path. Use ":memory:" for
// a throwaway database in tests.
func OpenSQLite(path string) (*sql.DB, error) {
	if path != ":memory:" {
		if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
			return nil, fmt.Errorf("create database directory: %w", err)
		}
	}
	query := url.Values{}
	for _, pragma := range []string{"busy_timeout(5000)", "foreign_keys(1)", "journal_mode(WAL)"} {
		query.Add("_pragma", pragma)
	}
	db, err := sql.Open("sqlite", "file:"+path+"?"+query.Encode())
	if err != nil {
		return nil, err
	}
	// A single connection serialises writes and keeps ":memory:" databases alive.
	db.SetMaxOpenConns(1)
	if err := db.Ping(); err != nil {
		_ = db.Close()
		return nil, fmt.Errorf("open sqlite %q: %w", path, err)
	}
	return db, nil
}
