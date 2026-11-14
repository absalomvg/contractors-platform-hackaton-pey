package presentation

import "contractors-platform/backend/internal/modules/dashboard/domain"

type TrendResponse struct {
	ContractorID string                `json:"contractorId"`
	Period       PeriodResponse        `json:"period"`
	Currency     string                `json:"currency"`
	Granularity  domain.Granularity    `json:"granularity"`
	Buckets      []TrendBucketResponse `json:"buckets"`
}

type TrendBucketResponse struct {
	Start          string `json:"start"`
	End            string `json:"end"`
	CollectedCents int64  `json:"collectedCents"`
	PaidCount      int    `json:"paidCount"`
	IssuedCents    int64  `json:"issuedCents"`
	IssuedCount    int    `json:"issuedCount"`
}
