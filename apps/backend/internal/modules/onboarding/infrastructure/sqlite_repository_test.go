package infrastructure

import (
	"contractors-platform/backend/internal/modules/onboarding/domain"
	"contractors-platform/backend/internal/platform/database"
	"path/filepath"
	"reflect"
	"testing"
)

func TestSQLiteRepositoryPersistsAcrossReopen(t *testing.T) {
	path := filepath.Join(t.TempDir(), "data", "app.db")
	taxRegime := "General"
	input := domain.Input{Name: "Ana", Profession: "Electrician", Client: domain.Client{Name: "Luis", Phone: "+52 555 123 4567", Email: "luis@example.com"},
		TaxRegime: &taxRegime, BusinessName: "Electrical Services", BusinessActivity: "Electrical installations", RFC: "AAA010101AAA"}

	db, err := database.OpenSQLite(path)
	if err != nil {
		t.Fatal(err)
	}
	repository, err := NewSQLiteRepository(db)
	if err != nil {
		t.Fatal(err)
	}
	created, err := repository.Create(input)
	if err != nil {
		t.Fatal(err)
	}
	withoutTax := input
	withoutTax.TaxRegime = nil
	other, err := repository.Create(withoutTax)
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
	for _, want := range []domain.Onboarding{created, other} {
		got, found := repository.Find(want.ID)
		if !found || !reflect.DeepEqual(got, want) {
			t.Fatalf("find %s: found=%v got=%+v want=%+v", want.ID, found, got, want)
		}
	}
	if _, found := repository.Find("missing"); found {
		t.Fatal("expected missing record")
	}
}
