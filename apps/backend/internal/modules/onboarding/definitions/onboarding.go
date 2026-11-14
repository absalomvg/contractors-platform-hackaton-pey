// Package definitions guarda los nombres, límites y frases del alta.
package definitions

import "regexp"

const (
	FieldName             = "name"
	FieldProfession       = "profession"
	FieldClientName       = "client.name"
	FieldClientPhone      = "client.phone"
	FieldClientEmail      = "client.email"
	FieldBusinessName     = "businessName"
	FieldBusinessActivity = "businessActivity"
	FieldRFC              = "rfc"
	FieldTaxRegime        = "taxRegime"
)

const (
	MessageRequired = "Este campo es obligatorio."
	MessageMaxRunes = "Usa como máximo 255 caracteres."
	MessageEmail    = "Ingresa un email válido."
	MessagePhone    = "Ingresa un teléfono de 7 a 15 dígitos."
	MessageRFC      = "Ingresa un RFC válido de 12 o 13 caracteres."
)

const (
	MaxRunes       = 255
	PhoneMinDigits = 7
	PhoneMaxDigits = 15
)

const CodiNotRegistered = "not_registered"

const (
	PeyAlias  = "alias"
	PeyName   = "name"
	PeyCLABE  = "clabe"
	PeyEntity = "entity"
)

var RFCPattern = regexp.MustCompile(`^[A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3}$`)
var PhonePattern = regexp.MustCompile(`^\+?[0-9 ()-]+$`)
