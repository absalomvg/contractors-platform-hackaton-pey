package infrastructure

import (
	"contractors-platform/backend/internal/modules/onboarding/domain"
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"errors"
	"log"
)

func onboardingSchema() string {
	return `
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
	codi_status       TEXT NOT NULL DEFAULT '` + domain.NotRegisteredStatus() + `',
	bank_account_id   TEXT NOT NULL DEFAULT '',
	created_at        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
)`
}

type SQLiteRepository struct{ db *sql.DB }

// NewSQLiteRepository crea la tabla de usuarios si todavía no existe.
func NewSQLiteRepository(db *sql.DB) (*SQLiteRepository, error) {
	if _, err := db.Exec(onboardingSchema()); err != nil {
		return nil, err
	}
	if err := ensureUserColumns(db); err != nil {
		return nil, err
	}
	return &SQLiteRepository{db: db}, nil
}

func ensureUserColumns(db *sql.DB) error {
	rows, err := db.Query(`PRAGMA table_info(onboardings)`)
	if err != nil {
		return err
	}
	defer rows.Close()
	present := map[string]bool{}
	for rows.Next() {
		var cid, notNull, pk int
		var name, columnType string
		var defaultValue sql.NullString
		if err := rows.Scan(&cid, &name, &columnType, &notNull, &defaultValue, &pk); err != nil {
			return err
		}
		present[name] = true
	}
	if err := rows.Err(); err != nil {
		return err
	}
	if !present["codi_status"] {
		if _, err := db.Exec(`ALTER TABLE onboardings ADD COLUMN codi_status TEXT NOT NULL DEFAULT '` + domain.NotRegisteredStatus() + `'`); err != nil {
			return err
		}
	}
	if !present["bank_account_id"] {
		if _, err := db.Exec(`ALTER TABLE onboardings ADD COLUMN bank_account_id TEXT NOT NULL DEFAULT ''`); err != nil {
			return err
		}
	}
	return nil
}

// Save guarda el usuario si el contrato lo permite y le asigna un id.
func (repository *SQLiteRepository) Save(user domain.User) (domain.User, error) {
	if fieldErrors := domain.Allow(user); len(fieldErrors) > 0 {
		return domain.User{}, errRejected
	}
	var bytes [16]byte
	if _, err := rand.Read(bytes[:]); err != nil {
		return domain.User{}, err
	}
	user.ID = hex.EncodeToString(bytes[:])
	_, err := repository.db.Exec(`INSERT INTO onboardings
		(id, name, profession, client_name, client_phone, client_email, tax_regime, business_name, business_activity, rfc, codi_status, bank_account_id)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		user.ID, user.Name, user.Profession, user.Customer.Name, user.Customer.Phone, user.Customer.Email,
		user.TaxRegime, user.BusinessName, user.BusinessActivity, user.RFC, user.CodiStatus, user.BankAccountID)
	if err != nil {
		return domain.User{}, err
	}
	return cloneUser(user), nil
}

// Find busca un usuario por id.
func (repository *SQLiteRepository) Find(id string) (domain.User, bool) {
	var user domain.User
	var taxRegime sql.NullString
	err := repository.db.QueryRow(`SELECT id, name, profession, client_name, client_phone, client_email,
		tax_regime, business_name, business_activity, rfc, codi_status, bank_account_id
		FROM onboardings WHERE id = ?`, id).Scan(
		&user.ID, &user.Name, &user.Profession, &user.Customer.Name, &user.Customer.Phone, &user.Customer.Email,
		&taxRegime, &user.BusinessName, &user.BusinessActivity, &user.RFC, &user.CodiStatus, &user.BankAccountID)
	if err != nil {
		if !errors.Is(err, sql.ErrNoRows) {
			log.Printf("onboarding: find %s: %v", id, err)
		}
		return domain.User{}, false
	}
	if taxRegime.Valid {
		user.TaxRegime = domain.CopyText(&taxRegime.String)
	}
	return cloneUser(user), true
}
