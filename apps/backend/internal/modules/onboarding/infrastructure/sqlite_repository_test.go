package infrastructure

import (
	"contractors-platform/backend/internal/modules/onboarding/domain"
	"contractors-platform/backend/internal/platform/database"
	"errors"
	"path/filepath"
	"reflect"
	"testing"
)

func TestSQLiteRepositoryPersistsAcrossReopen(t *testing.T) {
	path := filepath.Join(t.TempDir(), "data", "app.db")
	taxRegime := "General"
	input := domain.Input{Name: "Ana", Profession: "Electrician", Client: domain.Client{Name: "Luis", Phone: "+52 555 123 4567", Email: "luis@example.com"},
		TaxRegime: &taxRegime, BusinessName: "Electrical Services", BusinessActivity: "Electrical installations", RFC: "AAA010101AAA", CLABE: "002010077777777771"}

	db, err := database.OpenSQLite(path)
	if err != nil {
		t.Fatal(err)
	}
	repository, err := NewSQLiteRepository(db)
	if err != nil {
		t.Fatal(err)
	}
	created, err := repository.Save(mustUser(t, input))
	if err != nil {
		t.Fatal(err)
	}
	withoutTax := input
	withoutTax.TaxRegime = nil
	withoutTax.CLABE = "012180001183597198"
	other, err := repository.Save(mustUser(t, withoutTax))
	if err != nil {
		t.Fatal(err)
	}
	_ = db.Close()

	db, err = database.OpenSQLite(path)
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	repository, err = NewSQLiteRepository(db)
	if err != nil {
		t.Fatal(err)
	}
	for _, want := range []domain.User{created, other} {
		got, found := repository.Find(want.ID)
		if !found || !reflect.DeepEqual(got, want) {
			t.Fatalf("find %s: found=%v got=%+v want=%+v", want.ID, found, got, want)
		}
	}
	if _, found := repository.Find("missing"); found {
		t.Fatal("expected missing record")
	}
}

func TestSQLiteRepositoryMigratesLegacyTable(t *testing.T) {
	db, err := database.OpenSQLite(filepath.Join(t.TempDir(), "app.db"))
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	if _, err := db.Exec(`CREATE TABLE onboardings (
		id TEXT PRIMARY KEY, name TEXT NOT NULL, profession TEXT NOT NULL,
		client_name TEXT NOT NULL, client_phone TEXT NOT NULL, client_email TEXT NOT NULL,
		tax_regime TEXT, business_name TEXT NOT NULL, business_activity TEXT NOT NULL, rfc TEXT NOT NULL,
		created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')))`); err != nil {
		t.Fatal(err)
	}
	if _, err := db.Exec(`INSERT INTO onboardings (id, name, profession, client_name, client_phone, client_email,
		business_name, business_activity, rfc) VALUES ('legacy', 'Ana', 'Electrician', 'Luis', '5551234567',
		'luis@example.com', 'Electrical Services', 'Electrical installations', 'AAA010101AAA')`); err != nil {
		t.Fatal(err)
	}
	for range 2 { // the migration must be idempotent
		if _, err := NewSQLiteRepository(db); err != nil {
			t.Fatal(err)
		}
	}
	repository, _ := NewSQLiteRepository(db)
	legacy, found := repository.Find("legacy")
	if !found || legacy.CLABE != "" {
		t.Fatalf("legacy record: found=%v %+v", found, legacy)
	}
	input := domain.Input{Name: "Ana", Profession: "Electrician", Client: domain.Client{Name: "Luis", Phone: "+52 555 123 4567", Email: "luis@example.com"},
		BusinessName: "Electrical Services", BusinessActivity: "Electrical installations", RFC: "AAA010101AAA", CLABE: "002010077777777771"}
	created, err := repository.Save(mustUser(t, input))
	if err != nil {
		t.Fatal(err)
	}
	if got, _ := repository.Find(created.ID); got.CLABE != "002010077777777771" {
		t.Fatalf("clabe not persisted: %+v", got)
	}
	if _, err := repository.Save(mustUser(t, input)); !errors.Is(err, domain.ErrCLABETaken) {
		t.Fatalf("duplicate clabe: %v", err)
	}
}

func mustUser(t *testing.T, input domain.Input) domain.User {
	t.Helper()
	user, fieldErrors := domain.Build(input)
	if len(fieldErrors) > 0 {
		t.Fatalf("build: %v", fieldErrors)
	}
	return user
}
