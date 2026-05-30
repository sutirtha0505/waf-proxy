# Smart WAF Startup Guide

This repository contains three moving parts:

- the WAF reverse proxy and dashboard
- the AI engine that answers `GET /health` and `POST /detect`
- DVWA, which should sit behind the WAF as the protected backend

The current code uses these default ports and URLs:

- WAF proxy: `http://localhost:8080`
- Dashboard: `http://localhost:9090`
- AI engine: `http://localhost:5001`
- DVWA on the host: `http://localhost:8888`
- DVWA in Docker Compose: `http://dvwa:80`

## 1. Build The Project

Run this from the repository root:

```sh
make build
```

This builds:

- `bin/waf`
- `bin/setup`
- `bin/smart-waf`

## 2. Run The First-Time Setup

The setup wizard creates the admin user in SQLite and writes the runtime config to `configs/waf.yaml`.

```sh
make setup
```

During setup, enter:

- admin username
- admin password
- backend URL
- AI engine URL
- proxy port
- dashboard port

Use these values depending on where you run DVWA and the AI engine:

- Local WAF + Docker DVWA: backend URL `http://localhost:8888`
- Docker Compose WAF + DVWA service: backend URL `http://dvwa:80`
- Local WAF + local AI engine: AI URL `http://localhost:5001`
- Docker Compose WAF + AI service: AI URL `http://ai-engine:5001`

Important: there is no baked-in default admin account. You must run setup at least once before logging into the dashboard.

## 3. Start DVWA

If you are using the provided Docker Compose stack, DVWA is already defined as a service and will be started with the WAF.

If you are starting DVWA separately, make sure it is reachable on the backend URL you chose during setup. The WAF must be able to forward requests to that address.

## 4. Start The AI Engine

The WAF checks the AI service with `GET /health` and sends requests to `POST /detect`.

If your AI engine is a local service, start it before the WAF and make sure it listens on port `5001`.

If you are using Docker Compose, the compose file expects an `ai-engine` service.

## 5. Start The WAF

After setup is complete, start the WAF with either command:

```sh
make run
```

or:

```sh
./bin/smart-waf start
```

The CLI launches two servers:

- proxy on port `8080`
- dashboard on port `9090`

## 6. Verify The Services

Check whether the proxy and dashboard are up:

```sh
./bin/smart-waf status
```

Expected browser targets:

- proxy entry point: `http://localhost:8080`
- dashboard login: `http://localhost:9090/login`

## 7. How DVWA Is Bound To The WAF

The WAF is a reverse proxy. You do not open DVWA directly for the demo. You open the WAF port, and the WAF forwards the request to DVWA after inspection.

The flow is:

1. browser or client sends traffic to the WAF on port `8080`
2. WAF parses the request and builds the JSON request object
3. WAF calls the AI engine at `/health` and then `/detect`
4. if the confidence is high enough, the WAF allows or blocks the request locally
5. if the confidence is low, the request is stored for manual review in the dashboard
6. if allowed, the WAF forwards the request to DVWA

For Docker Compose, the binding is already defined in `configs/waf.yaml`:

```yaml
proxy:
  backend_url: "http://dvwa:80"

ai:
  url: "http://ai-engine:5001"
```

That means the WAF container talks to the DVWA container and the AI container by service name over the Docker network.

## 8. Docker Compose Startup

The repository includes a compose file at `deploy/docker/docker-compose.yml`.

From the repository root, run:

```sh
docker compose -f deploy/docker/docker-compose.yml up --build
```

This exposes:

- WAF proxy on `8080`
- dashboard on `9090`
- AI engine on `5001`
- DVWA on `8888`

### Docker Note

The compose file builds the WAF image with the current repository contents. If you change the setup values in `configs/waf.yaml`, rebuild the image so the container sees the updated configuration.

Also, the compose file expects an `ai-engine` build context at `../../ai-engine` relative to `deploy/docker/docker-compose.yml`. If that folder is not present beside this repository, you must either place the AI engine project there or update the compose file to point to the correct path.

## 9. Recommended Demo Order

For the cleanest one-by-one check, use this order:

1. start DVWA
2. start the AI engine
3. run `make setup`
4. run `make run`
5. open `http://localhost:8080` and send a test request
6. open `http://localhost:9090/login` and verify the admin panel

## 10. Quick Troubleshooting

- If the dashboard login fails, confirm that `make setup` was run and that the user was created in `data/waf.db`.
- If the proxy returns bad gateway, confirm that the backend URL still points to DVWA and that DVWA is running.
- If requests are always treated as AI failures, confirm that the AI engine responds on `/health` and `/detect`.
- If Docker Compose fails to build the AI service, check the `../../ai-engine` path in `deploy/docker/docker-compose.yml`.