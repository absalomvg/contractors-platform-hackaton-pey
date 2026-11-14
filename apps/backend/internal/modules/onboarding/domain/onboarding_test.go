package domain

import "testing"

func TestValidClabe(t *testing.T) {
	for clabe, want := range map[string]bool{
		"002010077777777771":  true,
		"012180001183597198":  true,
		"002010077777777772":  false, // wrong check digit
		"00201007777777777":   false, // 17 digits
		"0020100777777777710": false, // 19 digits
		"00201007777777777A":  false,
		"":                    false,
	} {
		if got := ValidClabe(clabe); got != want {
			t.Errorf("ValidClabe(%q) = %v, want %v", clabe, got, want)
		}
	}
}

func TestNormalizeStripsClabeSeparators(t *testing.T) {
	input := normalize(Input{CLABE: " 002 010-0777 7777 7771 "})
	if input.CLABE != "002010077777777771" {
		t.Fatalf("got %q", input.CLABE)
	}
}
