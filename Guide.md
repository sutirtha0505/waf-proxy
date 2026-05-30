# Smart WAF Implementation Guide

This repository follows the reverse-proxy Smart WAF structure described in the project guide.

Core paths:

- `cmd/waf`: WAF daemon
- `cmd/setup`: setup wizard
- `cmd/cli`: local CLI wrapper
- `internal/proxy`: reverse proxy and request interception
- `internal/ai`: AI engine HTTP client
- `internal/engine`: decision and fail-open policy
- `internal/admin`: review API
- `internal/dashboard`: dashboard server
- `internal/storage`: repository abstraction and file-backed development store
- `pkg/models`: shared request/response/user models

