package tui

import (
	"fmt"
	"net/url"
	"strconv"
)

func validateUsername(v string) error {
	if v == "" {
		return fmt.Errorf("username is required")
	}
	return nil
}

func validatePassword(v string) error {
	if len(v) < 8 {
		return fmt.Errorf("password must be at least 8 characters")
	}
	return nil
}

func validateURL(v string) error {
	parsed, err := url.ParseRequestURI(v)
	if err != nil || parsed.Scheme == "" || parsed.Host == "" {
		return fmt.Errorf("invalid url")
	}
	return nil
}

func validatePort(v string) error {
	port, err := strconv.Atoi(v)
	if err != nil || port < 1 || port > 65535 {
		return fmt.Errorf("invalid port")
	}
	return nil
}
