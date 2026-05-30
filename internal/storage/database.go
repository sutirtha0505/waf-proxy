package storage

import "smart-waf/pkg/models"

type Repository interface {
	CreateUser(u *models.User) error
	GetUser(username string) (*models.User, error)
	SavePendingRequest(req *models.WAFRequest, aiResp *models.AIResponse) error
	GetPendingRequests() ([]*PendingRequestDetails, error)
	GetPendingRequestByID(id string) (*PendingRequestDetails, error)
	CountPendingRequests() (int, error)
	DeletePendingRequest(id string) error
	SaveLabeledData(req string, vector string, code int) error
	SaveAttackVector(name string, code int, category ...string) error
	GetAttackVectors() (map[string]int, error)
	SaveBlockedEvent(req *models.WAFRequest, aiResp *models.AIResponse) error
	GetBlockedEvents() ([]*BlockedEventDetails, error)
}
