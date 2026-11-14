package presentation

import "contractors-platform/backend/internal/modules/dashboard/domain"

type SummaryResponse struct {
	ContractorID      string                    `json:"contractorId"`
	Period            PeriodResponse            `json:"period"`
	Currency          string                    `json:"currency"`
	GeneratedAt       string                    `json:"generatedAt"`
	Collected         CollectedResponse         `json:"collected"`
	Outstanding       BalanceResponse           `json:"outstanding"`
	Overdue           OverdueResponse           `json:"overdue"`
	CollectionRate    CollectionRateResponse    `json:"collectionRate"`
	AverageDaysToPay  *float64                  `json:"averageDaysToPay"`
	Reminders         RemindersResponse         `json:"reminders"`
	CommissionSavings CommissionSavingsResponse `json:"commissionSavings"`
	PaymentMethods    []PaymentMethodResponse   `json:"paymentMethods"`
	Customers         CustomersCountResponse    `json:"customers"`
	TopDebtors        []DebtorResponse          `json:"topDebtors"`
}

type CollectedResponse struct {
	AmountCents   int64    `json:"amountCents"`
	Count         int      `json:"count"`
	ChangePercent *float64 `json:"changePercent"`
}

type BalanceResponse struct {
	AmountCents   int64 `json:"amountCents"`
	Count         int   `json:"count"`
	CustomerCount int   `json:"customerCount"`
}

type OverdueResponse struct {
	BalanceResponse
	OldestDaysOverdue *int `json:"oldestDaysOverdue"`
}

type CollectionRateResponse struct {
	Ratio       *float64 `json:"ratio"`
	PaidCount   int      `json:"paidCount"`
	IssuedCount int      `json:"issuedCount"`
}

type RemindersResponse struct {
	Sent                     int      `json:"sent"`
	PaidWithoutReminderRatio *float64 `json:"paidWithoutReminderRatio"`
}

type CommissionSavingsResponse struct {
	AmountCents int64             `json:"amountCents"`
	Assumption  CardFeeAssumption `json:"assumption"`
}

type CardFeeAssumption struct {
	FeeRate       float64 `json:"feeRate"`
	FixedFeeCents int64   `json:"fixedFeeCents"`
	VATRate       float64 `json:"vatRate"`
}

type PaymentMethodResponse struct {
	Method      domain.PaymentMethod `json:"method"`
	AmountCents int64                `json:"amountCents"`
	Count       int                  `json:"count"`
}

type CustomersCountResponse struct {
	Active int         `json:"active"`
	Plan   domain.Plan `json:"plan"`
	Limit  *int        `json:"limit"`
}

type DebtorResponse struct {
	CustomerID    string `json:"customerId"`
	Name          string `json:"name"`
	AmountCents   int64  `json:"amountCents"`
	OverdueCount  int    `json:"overdueCount"`
	OldestDueDate string `json:"oldestDueDate"`
}
