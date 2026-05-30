package auth

import (
	"smart-waf/internal/storage"
	"smart-waf/pkg/utils"
)

type Authenticator struct {
	repo storage.Repository
}

func New(repo storage.Repository) *Authenticator {
	return &Authenticator{repo: repo}
}

func (a *Authenticator) Verify(username, password string) (bool, error) {
	user, err := a.repo.GetUser(username)
	if err != nil {
		return false, nil
	}
	if err := utils.CheckPassword(user.PasswordHash, password); err != nil {
		return false, nil
	}
	return true, nil
}
