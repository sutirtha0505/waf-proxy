package storage

import "smart-waf/pkg/models"

type Repository interface {
	CreateUser(u *models.User) error
	GetUser(username string) (*models.User, error)
	SavePendingRequest(req *models.WAFRequest, aiResp *models.AIResponse) error
	GetPendingRequests() ([]*models.WAFRequest, error)
	GetPendingRequestByID(id string) (*models.WAFRequest, error)
	CountPendingRequests() (int, error)
	DeletePendingRequest(id string) error
	SaveLabeledData(req string, vector string, code int) error
	SaveAttackVector(name string, code int, category ...string) error
	GetAttackVectors() (map[string]int, error)
}
