package domain

// Customer es la primera persona a la que el usuario puede cobrar.
type Customer struct {
	Name  string
	Phone string
	Email string
}

// User es la cuenta creada a partir del formulario de alta.
type User struct {
	ID               string
	Name             string
	Profession       string
	BusinessName     string
	BusinessActivity string
	RFC              string
	TaxRegime        *string
	Customer         Customer
	CLABE            string
	CodiStatus       string
	BankAccountID    string
}

// Repository guarda y recupera usuarios.
type Repository interface {
	Save(User) (User, error)
	Find(string) (User, bool)
}
