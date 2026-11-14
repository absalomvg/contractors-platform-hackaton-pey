package infrastructure

import (
	"contractors-platform/backend/internal/modules/onboarding/domain"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"sync"
)

var errRejected = errors.New("el usuario no cumple el contrato")

// MemoryRepository guarda los usuarios solo mientras el proceso vive.
type MemoryRepository struct {
	mutex   sync.RWMutex
	records map[string]domain.User
}

// NewMemoryRepository crea el almacén vacío.
func NewMemoryRepository() *MemoryRepository {
	return &MemoryRepository{records: make(map[string]domain.User)}
}

func cloneUser(user domain.User) domain.User {
	user.TaxRegime = domain.CopyText(user.TaxRegime)
	return user
}

// Save persiste el usuario si el contrato lo permite y le asigna un id.
func (repository *MemoryRepository) Save(user domain.User) (domain.User, error) {
	if fieldErrors := domain.Allow(user); len(fieldErrors) > 0 {
		return domain.User{}, errRejected
	}
	var bytes [16]byte
	if _, err := rand.Read(bytes[:]); err != nil {
		return domain.User{}, err
	}
	user.ID = hex.EncodeToString(bytes[:])
	stored := cloneUser(user)
	repository.mutex.Lock()
	defer repository.mutex.Unlock()
	repository.records[stored.ID] = stored
	return cloneUser(stored), nil
}

// Find busca un usuario por id.
func (repository *MemoryRepository) Find(id string) (domain.User, bool) {
	repository.mutex.RLock()
	defer repository.mutex.RUnlock()
	user, found := repository.records[id]
	return cloneUser(user), found
}
