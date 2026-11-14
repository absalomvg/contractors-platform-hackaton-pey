package domain

import (
	"net/mail"
	"regexp"
	"strings"
	"unicode/utf8"
)

type Client struct {
	Name  string `json:"name"`
	Phone string `json:"phone"`
	Email string `json:"email"`
}

type Input struct {
	Name             string  `json:"name"`
	Profession       string  `json:"profession"`
	Client           Client  `json:"client"`
	TaxRegime        *string `json:"taxRegime,omitempty"`
	BusinessName     string  `json:"businessName"`
	BusinessActivity string  `json:"businessActivity"`
	RFC              string  `json:"rfc"`
}

type Onboarding struct {
	ID string `json:"id"`
	Input
}

type Repository interface {
	Create(Input) (Onboarding, error)
	Find(string) (Onboarding, bool)
}

var rfcPattern = regexp.MustCompile(`^[A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3}$`)
var phonePattern = regexp.MustCompile(`^\+?[0-9 ()-]+$`)

func (input *Input) Normalize() {
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
}

func (input Input) Validate() map[string]string {
	errors := map[string]string{}
	for field, value := range map[string]string{
		"name": input.Name, "profession": input.Profession, "client.name": input.Client.Name,
		"client.phone": input.Client.Phone, "client.email": input.Client.Email,
		"businessName": input.BusinessName, "businessActivity": input.BusinessActivity, "rfc": input.RFC,
	} {
		if value == "" {
			errors[field] = "Este campo es obligatorio."
		} else if utf8.RuneCountInString(value) > 255 {
			errors[field] = "Usa como máximo 255 caracteres."
		}
	}
	if input.Client.Email != "" {
		address, err := mail.ParseAddress(input.Client.Email)
		if err != nil || address.Address != input.Client.Email {
			errors["client.email"] = "Ingresa un email válido."
		}
	}
	digits := 0
	for _, char := range input.Client.Phone {
		if char >= '0' && char <= '9' {
			digits++
		}
	}
	if input.Client.Phone != "" && (!phonePattern.MatchString(input.Client.Phone) || digits < 7 || digits > 15) {
		errors["client.phone"] = "Ingresa un teléfono de 7 a 15 dígitos."
	}
	if input.RFC != "" && !rfcPattern.MatchString(input.RFC) {
		errors["rfc"] = "Ingresa un RFC válido de 12 o 13 caracteres."
	}
	if input.TaxRegime != nil && utf8.RuneCountInString(*input.TaxRegime) > 255 {
		errors["taxRegime"] = "Usa como máximo 255 caracteres."
	}
	return errors
}
