package presentation

import "contractors-platform/backend/internal/modules/dashboard/domain"

type CustomersResponse struct {
	Customers  []CustomerRowResponse `json:"customers"`
	Counts     StandingCounts        `json:"counts"`
	NextCursor *string               `json:"nextCursor"`
}

// StandingCounts feeds the filter tabs; it ignores standing and cursor but
// honors search.
type StandingCounts struct {
	All      int `json:"all"`
	Overdue  int `json:"overdue"`
	Pending  int `json:"pending"`
	UpToDate int `json:"upToDate"`
}

type CustomerRowResponse struct {
	CustomerID    string          `json:"customerId"`
	Name          string          `json:"name"`
	Standing      domain.Standing `json:"standing"`
	Balance       CustomerBalance `json:"balance"`
	LastPayment   *LastPayment    `json:"lastPayment"`
	NextDueDate   *string         `json:"nextDueDate"`
	OldestDueDate *string         `json:"oldestDueDate"`
}

type CustomerBalance struct {
	OutstandingCents int64 `json:"outstandingCents"`
	OverdueCents     int64 `json:"overdueCents"`
}

type LastPayment struct {
	AmountCents int64                `json:"amountCents"`
	PaidAt      string               `json:"paidAt"`
	Method      domain.PaymentMethod `json:"method"`
}

type CustomerDetailResponse struct {
	Customer   CustomerRowResponse `json:"customer"`
	Phone      string              `json:"phone"`
	Email      *string             `json:"email,omitempty"`
	Totals     CustomerTotals      `json:"totals"`
	Charges    []ChargeResponse    `json:"charges"`
	NextCursor *string             `json:"nextCursor"`
}

type CustomerTotals struct {
	PaidCents        int64    `json:"paidCents"`
	PaidCount        int      `json:"paidCount"`
	AverageDaysToPay *float64 `json:"averageDaysToPay"`
}
