package presentation

import "contractors-platform/backend/internal/modules/dashboard/domain"

// ChargeResponse is a charge as the business sees it in the dashboard.
type ChargeResponse struct {
	ChargeID       string                `json:"chargeId"`
	Version        int64                 `json:"version"`
	CustomerID     string                `json:"customerId"`
	CustomerName   string                `json:"customerName"`
	Concept        string                `json:"concept"`
	AmountCents    int64                 `json:"amountCents"`
	DueDate        string                `json:"dueDate"`
	Status         domain.ChargeStatus   `json:"status"`
	Overdue        bool                  `json:"overdue"`
	CreatedAt      string                `json:"createdAt"`
	UpdatedAt      string                `json:"updatedAt"`
	PaidAt         *string               `json:"paidAt"`
	PaymentMethod  *domain.PaymentMethod `json:"paymentMethod"`
	CancelledAt    *string               `json:"cancelledAt"`
	ReminderCount  int                   `json:"reminderCount"`
	Note           *string               `json:"note"`
	Tags           []string              `json:"tags"`
	EditableFields []domain.ChargeField  `json:"editableFields"`
}

type ChargesResponse struct {
	Charges    []ChargeResponse `json:"charges"`
	Totals     ChargesTotals    `json:"totals"`
	NextCursor *string          `json:"nextCursor"`
}

// ChargesTotals aggregates every charge matching the filters, not only the page.
type ChargesTotals struct {
	Count       int   `json:"count"`
	AmountCents int64 `json:"amountCents"`
}

type ChargeDetailResponse struct {
	Charge   ChargeResponse         `json:"charge"`
	Timeline []ActivityItemResponse `json:"timeline"`
}

// UpdateChargeRequest is a partial update: absent fields are unchanged; note
// null clears it; tags replaces the whole list.
type UpdateChargeRequest struct {
	Version     int64     `json:"version"`
	Concept     *string   `json:"concept,omitempty"`
	DueDate     *string   `json:"dueDate,omitempty"`
	AmountCents *int64    `json:"amountCents,omitempty"`
	Note        *string   `json:"note"`
	Tags        *[]string `json:"tags,omitempty"`
}

type ManualPaymentRequest struct {
	Version int64                `json:"version"`
	Method  domain.PaymentMethod `json:"method"`
	PaidAt  *string              `json:"paidAt,omitempty"`
	Note    *string              `json:"note,omitempty"`
}

type CancelChargeRequest struct {
	Version int64   `json:"version"`
	Reason  *string `json:"reason,omitempty"`
}
