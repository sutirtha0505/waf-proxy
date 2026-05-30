package utils

import "github.com/google/uuid"

func NewRequestID() string {
	return uuid.NewString()
}
