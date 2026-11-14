package infrastructure

import (
	"contractors-platform/backend/internal/modules/onboarding/domain"
	"crypto/rand"
	"encoding/hex"
	"sync"
)

type MemoryRepository struct {
	mutex   sync.RWMutex
	records map[string]domain.Onboarding
}

func NewMemoryRepository() *MemoryRepository {
	return &MemoryRepository{records: make(map[string]domain.Onboarding)}
}

func clone(record domain.Onboarding) domain.Onboarding {
	if record.TaxRegime != nil {
		value := *record.TaxRegime
		record.TaxRegime = &value
	}
	return record
}

func (repository *MemoryRepository) Create(input domain.Input) (domain.Onboarding, error) {
	var bytes [16]byte
	if _, err := rand.Read(bytes[:]); err != nil {
		return domain.Onboarding{}, err
	}
	record := domain.Onboarding{ID: hex.EncodeToString(bytes[:]), Input: input}
	repository.mutex.Lock()
	defer repository.mutex.Unlock()
	repository.records[record.ID] = clone(record)
	return clone(record), nil
}

func (repository *MemoryRepository) Find(id string) (domain.Onboarding, bool) {
	repository.mutex.RLock()
	defer repository.mutex.RUnlock()
	record, found := repository.records[id]
	return clone(record), found
}
