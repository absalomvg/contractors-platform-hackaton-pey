package domain

import (
	"contractors-platform/backend/internal/modules/onboarding/definitions"
	"net/mail"
	"strings"
	"unicode/utf8"
)

// Build normaliza el formulario y, si las reglas pasan, devuelve el usuario.
func Build(input Input) (User, map[string]string) {
	normalized := normalize(input)
	user := User{
		Name:             normalized.Name,
		Profession:       normalized.Profession,
		BusinessName:     normalized.BusinessName,
		BusinessActivity: normalized.BusinessActivity,
		RFC:              normalized.RFC,
		TaxRegime:        copyText(normalized.TaxRegime),
		Customer: Customer{
			Name:  normalized.Client.Name,
			Phone: normalized.Client.Phone,
			Email: normalized.Client.Email,
		},
		CodiStatus: definitions.CodiNotRegistered,
	}
	if fieldErrors := Allow(user); len(fieldErrors) > 0 {
		return User{}, fieldErrors
	}
	return user, nil
}

// Allow repite las reglas del formulario sobre un usuario ya armado.
func Allow(user User) map[string]string {
	errors := map[string]string{}
	checkText(errors, definitions.FieldName, user.Name)
	checkText(errors, definitions.FieldProfession, user.Profession)
	checkText(errors, definitions.FieldClientName, user.Customer.Name)
	checkText(errors, definitions.FieldClientPhone, user.Customer.Phone)
	checkText(errors, definitions.FieldClientEmail, user.Customer.Email)
	checkText(errors, definitions.FieldBusinessName, user.BusinessName)
	checkText(errors, definitions.FieldBusinessActivity, user.BusinessActivity)
	checkText(errors, definitions.FieldRFC, user.RFC)
	if user.Customer.Email != "" {
		address, err := mail.ParseAddress(user.Customer.Email)
		if err != nil || address.Address != user.Customer.Email {
			errors[definitions.FieldClientEmail] = definitions.MessageEmail
		}
	}
	if user.Customer.Phone != "" && !phoneAllowed(user.Customer.Phone) {
		errors[definitions.FieldClientPhone] = definitions.MessagePhone
	}
	if user.RFC != "" && !definitions.RFCPattern.MatchString(user.RFC) {
		errors[definitions.FieldRFC] = definitions.MessageRFC
	}
	if user.TaxRegime != nil && utf8.RuneCountInString(*user.TaxRegime) > definitions.MaxRunes {
		errors[definitions.FieldTaxRegime] = definitions.MessageMaxRunes
	}
	return errors
}

// View proyecta el usuario al JSON que el formulario ya recibe.
func View(user User) Onboarding {
	return Onboarding{
		ID: user.ID,
		Input: Input{
			Name:             user.Name,
			Profession:       user.Profession,
			Client:           Client{Name: user.Customer.Name, Phone: user.Customer.Phone, Email: user.Customer.Email},
			TaxRegime:        copyText(user.TaxRegime),
			BusinessName:     user.BusinessName,
			BusinessActivity: user.BusinessActivity,
			RFC:              user.RFC,
		},
	}
}

func normalize(input Input) Input {
	input.Name = strings.TrimSpace(input.Name)
	input.Profession = strings.TrimSpace(input.Profession)
	input.Client.Name = strings.TrimSpace(input.Client.Name)
	input.Client.Phone = strings.TrimSpace(input.Client.Phone)
	input.Client.Email = strings.TrimSpace(input.Client.Email)
	input.BusinessName = strings.TrimSpace(input.BusinessName)
	input.BusinessActivity = strings.TrimSpace(input.BusinessActivity)
	input.RFC = strings.ToUpper(strings.TrimSpace(input.RFC))
	if input.TaxRegime != nil {
		value := strings.TrimSpace(*input.TaxRegime)
		if value == "" {
			input.TaxRegime = nil
		} else {
			input.TaxRegime = &value
		}
	}
	return input
}

func checkText(errors map[string]string, field, value string) {
	if value == "" {
		errors[field] = definitions.MessageRequired
		return
	}
	if utf8.RuneCountInString(value) > definitions.MaxRunes {
		errors[field] = definitions.MessageMaxRunes
	}
}

func phoneAllowed(phone string) bool {
	if !definitions.PhonePattern.MatchString(phone) {
		return false
	}
	digits := 0
	for _, char := range phone {
		if char >= '0' && char <= '9' {
			digits++
		}
	}
	return digits >= definitions.PhoneMinDigits && digits <= definitions.PhoneMaxDigits
}

func copyText(value *string) *string {
	if value == nil {
		return nil
	}
	copy := *value
	return &copy
}
