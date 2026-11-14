package domain

// Client es la persona indicada en el formulario.
type Client struct {
	Name  string `json:"name"`
	Phone string `json:"phone"`
	Email string `json:"email"`
}

// Input es el JSON que envía el formulario de alta.
type Input struct {
	Name             string  `json:"name"`
	Profession       string  `json:"profession"`
	Client           Client  `json:"client"`
	TaxRegime        *string `json:"taxRegime,omitempty"`
	BusinessName     string  `json:"businessName"`
	BusinessActivity string  `json:"businessActivity"`
	RFC              string  `json:"rfc"`
	// CLABE is the 18-digit interbank account where the business receives its
	// payments (pey deposits there; the platform never holds the money).
	CLABE string `json:"clabe"`
}

// Onboarding es la respuesta que el formulario ya sabe leer.
type Onboarding struct {
	ID string `json:"id"`
	Input
}
