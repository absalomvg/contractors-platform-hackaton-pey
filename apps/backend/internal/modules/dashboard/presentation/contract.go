package presentation

// Public HTTP contract of the dashboard of a micro-business ("contractor").
// Documented in docs/openapi.json (tag "dashboard") and mirrored in
// packages/contracts. Reads are GET; the business updates its charges with
// PATCH / POST actions under ChargePath. pey side effects belong to the
// charges module, not to the dashboard.
const (
	PathParamContractorID = "contractorId"
	PathParamCustomerID   = "customerId"
	PathParamChargeID     = "chargeId"

	DashboardPath     = "/api/contractors/{" + PathParamContractorID + "}/dashboard"
	ProfilePath       = DashboardPath + "/profile"
	SummaryPath       = DashboardPath + "/summary"
	TrendPath         = DashboardPath + "/trend"
	CustomersPath     = DashboardPath + "/customers"
	CustomerPath      = CustomersPath + "/{" + PathParamCustomerID + "}"
	ChargesPath       = DashboardPath + "/charges"
	ChargePath        = ChargesPath + "/{" + PathParamChargeID + "}"
	ManualPaymentPath = ChargePath + "/manual-payment"
	CancelChargePath  = ChargePath + "/cancel"
	ActivityPath      = DashboardPath + "/activity"
	EventsPath        = DashboardPath + "/events"

	ProfileRoutePattern   = "GET " + ProfilePath
	SummaryRoutePattern   = "GET " + SummaryPath
	TrendRoutePattern     = "GET " + TrendPath
	CustomersRoutePattern = "GET " + CustomersPath
	CustomerRoutePattern  = "GET " + CustomerPath
	ActivityRoutePattern  = "GET " + ActivityPath
	EventsRoutePattern    = "GET " + EventsPath
)

// Query parameters.
const (
	QueryParamFrom        = "from"
	QueryParamTo          = "to"
	QueryParamGranularity = "granularity"
	QueryParamStanding    = "standing"
	QueryParamStatus      = "status"
	QueryParamOverdue     = "overdue"
	QueryParamTag         = "tag"
	QueryParamSearch      = "search"
	QueryParamSort        = "sort"
	QueryParamLimit       = "limit"
	QueryParamCursor      = "cursor"
)

const (
	// DateLayout is the format of date params and fields (inclusive days).
	DateLayout = "2006-01-02"
	// Timezone used to resolve day boundaries and default periods.
	Timezone = "America/Mexico_City"
	// MaxPeriodDays is the largest accepted from..to range.
	MaxPeriodDays = 366
	// Currency of every *Cents amount.
	Currency = "MXN"
	// SearchMinLength is the shortest accepted customer search.
	SearchMinLength = 2
)

// Page sizes per list.
const (
	DefaultCustomersLimit = 50
	DefaultHistoryLimit   = 20
	DefaultActivityLimit  = 20
	MaxListLimit          = 100
)

// Server-Sent Events on EventsPath.
const (
	ContentTypeEventStream = "text/event-stream"
	// EventActivity carries one ActivityItemResponse as data.
	EventActivity = "dashboard.activity"
	// HeartbeatSeconds is the interval of keep-alive comments.
	HeartbeatSeconds = 15
)

const (
	headerContentType = "Content-Type"
	contentTypeJSON   = "application/json; charset=utf-8"
)

// ErrorCode values returned in ErrorResponse.Code for errors the UI must
// branch on.
const (
	ErrorCodeVersionConflict      = "version_conflict"
	ErrorCodeFieldNotEditable     = "field_not_editable"
	ErrorCodeChargeNotPayable     = "charge_not_payable"
	ErrorCodeChargeNotCancellable = "charge_not_cancellable"
	ErrorCodePaymentInProgress    = "payment_in_progress"
)

const (
	messageInvalidQuery         = "Revisa los filtros solicitados."
	messageInvalidDate          = "Usa el formato AAAA-MM-DD."
	messageRangeInverted        = "La fecha inicial debe ser anterior o igual a la final."
	messageRangeTooLong         = "El periodo solicitado es demasiado largo."
	messageInvalidCursor        = "El cursor no es válido o expiró."
	messageContractorNotFound   = "No se encontró el contratista."
	messageCustomerNotFound     = "No se encontró el cliente."
	messageChargeNotFound       = "No se encontró el cobro."
	messageInvalidCharge        = "Revisa los datos del cobro."
	messageVersionConflict      = "El cobro cambió mientras lo editabas. Revisa la versión actual."
	messageFieldNotEditable     = "Este dato ya no se puede modificar."
	messageChargeNotPayable     = "Este cobro ya está pagado o cancelado."
	messageChargeNotCancellable = "Solo puedes cancelar cobros pendientes."
	messagePaymentInProgress    = "Hay un pago en proceso para este cobro. Inténtalo en unos minutos."
	messageDashboardFailure     = "No fue posible obtener la información del tablero."
)

type ErrorResponse struct {
	Message string            `json:"message"`
	Code    string            `json:"code,omitempty"`
	Errors  map[string]string `json:"errors,omitempty"`
}

// PeriodResponse is the resolved period, with defaults applied.
type PeriodResponse struct {
	From     string `json:"from"`
	To       string `json:"to"`
	Timezone string `json:"timezone"`
}
