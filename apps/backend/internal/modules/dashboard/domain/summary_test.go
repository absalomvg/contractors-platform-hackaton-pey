package domain

import "testing"

func TestAutoGranularity(t *testing.T) {
	for _, test := range []struct {
		days int
		want Granularity
	}{{1, GranularityDay}, {MaxDailyBuckets, GranularityDay}, {MaxDailyBuckets + 1, GranularityWeek}, {MaxWeeklyBucketsDays, GranularityWeek}, {MaxWeeklyBucketsDays + 1, GranularityMonth}} {
		if got := AutoGranularity(test.days); got != test.want {
			t.Errorf("%d days: want %s, got %s", test.days, test.want, got)
		}
	}
}

func TestCanEdit(t *testing.T) {
	for _, test := range []struct {
		status ChargeStatus
		field  ChargeField
		want   bool
	}{
		{ChargeStatusPending, ChargeFieldAmountCents, true},
		{ChargeStatusPending, ChargeFieldTags, true},
		{ChargeStatusPaid, ChargeFieldAmountCents, false},
		{ChargeStatusPaid, ChargeFieldDueDate, false},
		{ChargeStatusPaid, ChargeFieldNote, true},
		{ChargeStatusCancelled, ChargeFieldConcept, false},
		{ChargeStatusCancelled, ChargeFieldTags, true},
	} {
		if got := CanEdit(test.status, test.field); got != test.want {
			t.Errorf("%s/%s: want %v, got %v", test.status, test.field, test.want, got)
		}
	}
}

func TestIsManual(t *testing.T) {
	for _, method := range ManualPaymentMethods {
		if !method.IsManual() {
			t.Errorf("%s should be manual", method)
		}
	}
	if PaymentMethodCoDi.IsManual() || PaymentMethodCard.IsManual() {
		t.Error("pey methods must not be manual")
	}
}
