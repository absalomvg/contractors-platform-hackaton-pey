package domain

import (
	"slices"
	"testing"
)

func TestNewProfileTaxpayerType(t *testing.T) {
	for _, test := range []struct {
		rfc  string
		want TaxpayerType
	}{
		{"AAAA010101AAA", TaxpayerTypeIndividual},
		{"AAA010101AAA", TaxpayerTypeCompany},
		{"INVALID", TaxpayerTypeUnknown},
	} {
		if got := NewProfile(Contractor{RFC: test.rfc}).Business.TaxpayerType; got != test.want {
			t.Errorf("rfc %s: want %s, got %s", test.rfc, test.want, got)
		}
	}
}

func TestNewProfileOnboardingStatus(t *testing.T) {
	regime := "General"
	complete := NewProfile(Contractor{TaxRegime: &regime}).Onboarding
	if complete.Status != OnboardingStatusComplete || len(complete.PendingFields) != 0 || complete.PendingFields == nil {
		t.Fatalf("complete: %+v", complete)
	}
	incomplete := NewProfile(Contractor{}).Onboarding
	if incomplete.Status != OnboardingStatusIncomplete || !slices.Equal(incomplete.PendingFields, []Field{FieldTaxRegime}) {
		t.Fatalf("incomplete: %+v", incomplete)
	}
}

func TestNewProfileCopiesTaxRegime(t *testing.T) {
	regime := "General"
	dashboard := NewProfile(Contractor{TaxRegime: &regime})
	regime = "changed"
	if *dashboard.Business.TaxRegime != "General" {
		t.Fatal("tax regime shares memory with the source client")
	}
}
