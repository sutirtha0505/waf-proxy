# Smart WAF

Reverse-proxy based Web Application Firewall written in Go.

The WAF inspects incoming HTTP requests, skips static assets, calls an external AI engine for detection, applies local policy decisions, and stores uncertain requests for human review in the dashboard/admin workflow.

## Quick Start

```sh
make build
make run
```

Default services:

- Proxy: `http://localhost:8080`
- Dashboard: `http://localhost:9090`
- AI engine URL: `http://localhost:5001`

