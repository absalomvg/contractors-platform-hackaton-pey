package infrastructure

import (
	"contractors-platform/backend/internal/modules/onboarding/domain"
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"errors"
	"fmt"
	"log"
)

const onboardingSchema = `
CREATE TABLE IF NOT EXISTS onboardings (
	id                TEXT PRIMARY KEY,
	name              TEXT NOT NULL,
	profession        TEXT NOT NULL,
	client_name       TEXT NOT NULL,
	client_phone      TEXT NOT NULL,
	client_email      TEXT NOT NULL,
	tax_regime        TEXT,
	business_name     TEXT NOT NULL,
	business_activity TEXT NOT NULL,
	rfc               TEXT NOT NULL,
	clabe             TEXT NOT NULL DEFAULT '',
	created_at        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
)`

// onboardingMigrations add columns introduced after the table was first
// created. Each runs only when its column is missing.
var onboardingMigrations = []struct{ column, statement string }{
	{"clabe", `ALTER TABLE onboardings ADD COLUMN clabe TEXT NOT NULL DEFAULT ''`},
}

type SQLiteRepository struct{ db *sql.DB }

// NewSQLiteRepository creates the onboarding table if needed.
func NewSQLiteRepository(db *sql.DB) (*SQLiteRepository, error) {
	if _, err := db.Exec(onboardingSchema); err != nil {
		return nil, err
	}
	if err := migrate(db); err != nil {
		return nil, err
	}
	return &SQLiteRepository{db: db}, nil
}

func migrate(db *sql.DB) error {
	rows, err := db.Query(`SELECT name FROM pragma_table_info('onboardings')`)
	if err != nil {
		return err
	}
	columns := map[string]bool{}
	for rows.Next() {
		var name string
		if err := rows.Scan(&name); err != nil {
			_ = rows.Close()
			return err
		}
		columns[name] = true
	}
	if err := rows.Close(); err != nil {
		return err
	}
	if err := rows.Err(); err != nil {
		return err
	}
	for _, migration := range onboardingMigrations {
		if columns[migration.column] {
			continue
		}
		if _, err := db.Exec(migration.statement); err != nil {
			return fmt.Errorf("migrate onboardings.%s: %w", migration.column, err)
		}
	}
	return nil
}

func (repository *SQLiteRepository) Create(input domain.Input) (domain.Onboarding, error) {
	var bytes [16]byte
	if _, err := rand.Read(bytes[:]); err != nil {
		return domain.Onboarding{}, err
	}
	record := domain.Onboarding{ID: hex.EncodeToString(bytes[:]), Input: input}
	_, err := repository.db.Exec(`INSERT INTO onboardings
		(id, name, profession, client_name, client_phone, client_email, tax_regime, business_name, business_activity, rfc, clabe)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		record.ID, input.Name, input.Profession, input.Client.Name, input.Client.Phone, input.Client.Email,
		input.TaxRegime, input.BusinessName, input.BusinessActivity, input.RFC, input.CLABE)
	if err != nil {
		return domain.Onboarding{}, err
	}
	return clone(record), nil
}

func (repository *SQLiteRepository) Find(id string) (domain.Onboarding, bool) {
	var record domain.Onboarding
	var taxRegime sql.NullString
	err := repository.db.QueryRow(`SELECT id, name, profession, client_name, client_phone, client_email,
		tax_regime, business_name, business_activity, rfc, clabe FROM onboardings WHERE id = ?`, id).Scan(
		&record.ID, &record.Name, &record.Profession, &record.Client.Name, &record.Client.Phone, &record.Client.Email,
		&taxRegime, &record.BusinessName, &record.BusinessActivity, &record.RFC, &record.CLABE)
	if err != nil {
		if !errors.Is(err, sql.ErrNoRows) {
			// domain.Repository.Find has no error result; surface the failure in logs.
			log.Printf("onboarding: find %s: %v", id, err)
		}
		return domain.Onboarding{}, false
	}
	if taxRegime.Valid {
		record.TaxRegime = &taxRegime.String
	}
	return record, true
}
