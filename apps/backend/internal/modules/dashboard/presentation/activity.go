package presentation

import "contractors-platform/backend/internal/modules/dashboard/domain"

type ActivityResponse struct {
	Items      []ActivityItemResponse `json:"items"`
	NextCursor *string                `json:"nextCursor"`
}

type ActivityItemResponse struct {
	ID            string                `json:"id"`
	Type          domain.ActivityType   `json:"type"`
	OccurredAt    string                `json:"occurredAt"`
	CustomerID    string                `json:"customerId"`
	CustomerName  string                `json:"customerName"`
	ChargeID      string                `json:"chargeId"`
	Concept       string                `json:"concept"`
	AmountCents   int64                 `json:"amountCents"`
	PaymentMethod *domain.PaymentMethod `json:"paymentMethod"`
}
