package domain

// Vocabulary of the dashboard of a Mexican micro-business ("contractor" in
// code): the charges it issues to its customers and how they get paid.
// Charges and customers are owned by other modules; these values are the
// dashboard's view of them and must stay aligned with those modules' contracts.

// PaymentMethod is how a charge was settled.
type PaymentMethod string

const (
	// PaymentMethodCoDi: paid through CoDi (push or QR). No fee.
	PaymentMethodCoDi PaymentMethod = "codi"
	// PaymentMethodCard: paid by card through a payment link. Carries a fee.
	PaymentMethodCard PaymentMethod = "card"
	// Manual methods: recorded by the business from the dashboard for money
	// received outside pey.
	PaymentMethodCash     PaymentMethod = "cash"
	PaymentMethodTransfer PaymentMethod = "transfer"
	PaymentMethodOther    PaymentMethod = "other"
)

// ManualPaymentMethods are the methods accepted by the manual-payment action.
var ManualPaymentMethods = []PaymentMethod{PaymentMethodCash, PaymentMethodTransfer, PaymentMethodOther}

// IsManual reports whether the business records this method by hand.
func (method PaymentMethod) IsManual() bool {
	for _, manual := range ManualPaymentMethods {
		if method == manual {
			return true
		}
	}
	return false
}

// ChargeStatus is the lifecycle of a charge as shown in a customer's history.
// Overdue is derived (pending and due date before today), not a status.
type ChargeStatus string

const (
	ChargeStatusPending   ChargeStatus = "pending"
	ChargeStatusPaid      ChargeStatus = "paid"
	ChargeStatusCancelled ChargeStatus = "cancelled"
)

// Standing summarizes a customer's account for the customers table.
type Standing string

const (
	// StandingOverdue: at least one unpaid charge past its due date.
	StandingOverdue Standing = "overdue"
	// StandingPending: unpaid charges, none overdue.
	StandingPending Standing = "pending"
	// StandingUpToDate: nothing unpaid.
	StandingUpToDate Standing = "up_to_date"
)

// ActivityType is the kind of event in the dashboard feed.
type ActivityType string

const (
	ActivityPaymentReceived ActivityType = "payment_received"
	ActivityChargeCreated   ActivityType = "charge_created"
	ActivityReminderSent    ActivityType = "reminder_sent"
	ActivityChargeCancelled ActivityType = "charge_cancelled"
	// ActivityChargeUpdated: concept, due date or amount changed. Notes and
	// tags do not create activity.
	ActivityChargeUpdated ActivityType = "charge_updated"
)

// Plan is the contractor's subscription plan.
type Plan string

const (
	PlanFree Plan = "free"
	PlanPro  Plan = "pro"
)

// FreePlanCustomerLimit is the maximum number of active customers on PlanFree.
// PlanPro has no limit.
const FreePlanCustomerLimit = 5

// Card fee used to estimate commission savings: what the contractor would have
// paid if CoDi payments had been charged by card (3.6% + MXN 3.00 + 16% VAT).
// 30 charges of MXN 400 -> about MXN 605.
const (
	CardFeeRate       = 0.036
	CardFixedFeeCents = 300
	CardFeeVATRate    = 0.16
)

// MaxTopDebtors caps the debtors list in the summary.
const MaxTopDebtors = 5

// Granularity is the bucket size of the trend series.
type Granularity string

const (
	GranularityDay   Granularity = "day"
	GranularityWeek  Granularity = "week"
	GranularityMonth Granularity = "month"
)

// Automatic granularity when none is requested: day up to MaxDailyBuckets
// days, week up to MaxWeeklyBucketsDays days, month beyond.
const (
	MaxDailyBuckets      = 31
	MaxWeeklyBucketsDays = 182
)

// AutoGranularity picks the bucket size for a period of the given length.
func AutoGranularity(periodDays int) Granularity {
	switch {
	case periodDays <= MaxDailyBuckets:
		return GranularityDay
	case periodDays <= MaxWeeklyBucketsDays:
		return GranularityWeek
	default:
		return GranularityMonth
	}
}

// CustomerSort is the order of the customers table.
type CustomerSort string

const (
	// CustomerSortOverdue: overdue amount desc, then outstanding desc, then name.
	CustomerSortOverdue CustomerSort = "overdue"
	// CustomerSortName: name asc.
	CustomerSortName CustomerSort = "name"
	// CustomerSortLastPayment: most recent payment first; never paid last.
	CustomerSortLastPayment CustomerSort = "last_payment"
)

// ChargeSort is the order of the charges table.
type ChargeSort string

const (
	// ChargeSortDueDate: due date asc (most urgent first), then created desc.
	ChargeSortDueDate ChargeSort = "due_date"
	// ChargeSortCreated: newest first.
	ChargeSortCreated ChargeSort = "created"
	// ChargeSortAmount: amount desc.
	ChargeSortAmount ChargeSort = "amount"
)

// ChargeField names a field the business can edit. Values match the JSON names
// of UpdateChargeRequest.
type ChargeField string

const (
	ChargeFieldConcept     ChargeField = "concept"
	ChargeFieldDueDate     ChargeField = "dueDate"
	ChargeFieldAmountCents ChargeField = "amountCents"
	ChargeFieldNote        ChargeField = "note"
	ChargeFieldTags        ChargeField = "tags"
)

// EditableFields lists, per status, the fields the business may change.
// Billing fields only while pending; organization fields always.
var EditableFields = map[ChargeStatus][]ChargeField{
	ChargeStatusPending:   {ChargeFieldConcept, ChargeFieldDueDate, ChargeFieldAmountCents, ChargeFieldNote, ChargeFieldTags},
	ChargeStatusPaid:      {ChargeFieldNote, ChargeFieldTags},
	ChargeStatusCancelled: {ChargeFieldNote, ChargeFieldTags},
}

// CanEdit reports whether field may change while the charge is in status.
func CanEdit(status ChargeStatus, field ChargeField) bool {
	for _, editable := range EditableFields[status] {
		if editable == field {
			return true
		}
	}
	return false
}

// Limits of the editable fields.
const (
	MinAmountCents   int64 = 1
	MaxAmountCents   int64 = 100_000_000
	ConceptMaxLength       = 40
	NoteMaxLength          = 500
	MaxTagsPerCharge       = 10
	TagMaxLength           = 30
)
