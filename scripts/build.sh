#!/usr/bin/env sh
set -eu
go build -o bin/waf ./cmd/waf
go build -o bin/setup ./cmd/setup
go build -o bin/smart-waf ./cmd/cli
