<div align="center">

# FIAP X — Video Processing Platform

**Upload a video, get every frame back as a downloadable `.zip`.**
The scalable, microservices rewrite of a naive proof-of-concept — built for the FIAP Pós-Tech (SOAT) Fase 5 hackathon.

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](#-license)
[![TypeScript](https://img.shields.io/badge/TypeScript-6-3178c6?logo=typescript&logoColor=white)]()
[![Node](https://img.shields.io/badge/Node-22-339933?logo=nodedotjs&logoColor=white)]()
[![pnpm](https://img.shields.io/badge/pnpm-10-f69220?logo=pnpm&logoColor=white)]()
[![Nx](https://img.shields.io/badge/Nx-monorepo-143055?logo=nx&logoColor=white)]()
[![NestJS](https://img.shields.io/badge/NestJS-11-e0234e?logo=nestjs&logoColor=white)]()
[![React](https://img.shields.io/badge/React-19-149eca?logo=react&logoColor=white)]()
[![Docker](https://img.shields.io/badge/Docker-compose-2496ed?logo=docker&logoColor=white)]()
[![Biome](https://img.shields.io/badge/lint-Biome-60a5fa?logo=biome&logoColor=white)]()

</div>

---

FIAP X takes a video, extracts its frames with **ffmpeg**, packs them into a ZIP, and hands back a
presigned download link. The whole thing is designed to survive a peak: uploads are accepted in
milliseconds and processed asynchronously by a pool of workers that you can scale horizontally
without dropping a single request.

<!-- Add UI captures under docs/images/ and reference them here once available.
<div align="center">
  <img src="docs/images/dashboard.png" width="49%" alt="Dashboard" />
  <img src="docs/images/login.png" width="49%" alt="Login" />
</div>
-->

## ✨ Features

- **Async video processing** — upload returns `202` immediately; frame extraction happens in the background.
- **Horizontally scalable** — competing consumers on a durable RabbitMQ queue. Need more throughput? Run more `worker` replicas.
- **Nothing lost under load** — durable queue, persistent messages, manual ack, and a dead-letter queue for failures.
- **Live status** — a WebSocket feed pushes `PENDING → PROCESSING → COMPLETED/FAILED` transitions to the browser in real time.
- **Auth built in** — email/password accounts issuing short-lived EdDSA JWTs, verified against a JWKS endpoint.
- **Email on completion & failure** — the notification service emails the user via Resend (dry-run when no API key is set).
- **Spacetime-themed UI** — React + Vite, drag-and-drop upload with progress, dark/light toggle, framer-motion throughout.
- **Observable** — every service exposes Prometheus `/metrics` and a `/health` probe, wired into a Grafana dashboard.

## 🏗 Architecture

A monorepo of five deployable apps behind a **Kong** API gateway, backed by Postgres, S3, RabbitMQ,
and Redis. A fuller write-up — component diagram, sequence diagram, RabbitMQ topology, and the
tech-choice rationale — lives in **[docs/architecture.md](docs/architecture.md)**.

```mermaid
flowchart LR
  subgraph client[Client]
    app[app · React/Vite]
  end

  kong[Kong · API gateway]

  subgraph services[Services]
    api[api · NestJS]
    auth[auth · better-auth]
    worker[worker · NestJS + ffmpeg]
    notification[notification · Resend]
  end

  subgraph data[Infrastructure]
    pg[(Postgres)]
    s3[(S3 / MinIO)]
    mq{{RabbitMQ}}
    redis[(Redis pub/sub + cache)]
  end

  app -->|HTTP + WebSocket| kong
  kong --> api
  kong --> auth
  api -->|metadata| pg
  api -->|raw video / zip| s3
  api -->|publish video.process| mq
  api -.->|verify JWT via JWKS| auth
  mq -->|consume| worker
  mq -->|completed / failed| notification
  worker -->|frames -> zip| s3
  worker -->|status| pg
  worker -->|status changed| redis
  redis -->|fan-out| api
  api -->|video:status| app
```

**The path a video takes**

1. `app` uploads to `api` (`POST /api/videos`, multipart, Bearer JWT).
2. `api` stores the raw file in **S3**, writes a `PENDING` row to **Postgres**, publishes a
   `video.process` job to **RabbitMQ**, and returns `202 { id, status }`.
3. A `worker` consumes the job → `PROCESSING` → pulls the video from S3 → extracts frames with
   ffmpeg → zips them → uploads the ZIP to S3 → `COMPLETED` (or `FAILED`).
4. Every transition is published to **Redis** pub/sub; the `api` WebSocket gateway fans it out to the
   user's browser.
5. On completion/failure, `worker` emits an event and the `notification` service emails the user.
6. Download: `GET /api/videos/:id/download` returns a short-lived **presigned S3 URL**.

## ✅ Requirements → Implementation

Every requirement from the hackathon brief and how it is met in this codebase:

| Requirement | How it's implemented |
|---|---|
| Process multiple videos **concurrently** | Competing RabbitMQ consumers on the durable `video.process` queue; scale by adding `worker` replicas, tune throughput with `RABBITMQ_PREFETCH`. |
| **Never lose a request** under peak | Durable topic exchange + durable queue, `persistent` messages, publisher confirms, manual `ack` on success only, and a dead-letter queue (`video.process.dlq`) for anything that fails. |
| **User/password** authentication | `auth` service (better-auth) with email/password, issuing EdDSA **JWTs**; `api` verifies them against the **JWKS** endpoint. |
| **List a user's videos** with status | Paginated `GET /api/videos` scoped to the caller, plus live `video:status` updates over WebSocket. |
| **Notify on error** (and success) | `notification` service consumes `video.failed` / `video.completed` and emails via **Resend**. |
| **Persist all data** | **Postgres** for metadata/status, **S3** (MinIO locally) for the binaries (raw video + ZIP). |
| **Scalable · versioned · tested · CI/CD** | Stateless microservices — **Docker Compose** for the full local stack, **Kubernetes** (kustomize) and **Terraform** (local + AWS) under `infra/`. Nx monorepo on GitHub, unit + **Testcontainers** integration tests, and a **GitHub Actions** pipeline (Biome → typecheck → test → build). |

## 🧰 Tech Stack

**Backend** NestJS 11 · TypeScript · SOLID/DDD per service ·
**Frontend** React 19 · Vite · TanStack Query · framer-motion ·
**Auth** better-auth (JWT/JWKS, EdDSA) ·
**Messaging** RabbitMQ (`amqp-connection-manager`) ·
**Data** PostgreSQL · Redis · S3 (MinIO / LocalStack) ·
**Media** ffmpeg · archiver ·
**Gateway** Kong ·
**Email** Resend ·
**Monorepo** Nx + pnpm ·
**Monitoring** Prometheus + Grafana (`prom-client`) ·
**Tooling** Biome · Jest · Vitest · Testcontainers · Docker Compose

## 📦 Prerequisites

- **Docker** + Docker Compose (for Postgres, Redis, RabbitMQ, MinIO, Prometheus, Grafana)
- **Node 22**
- **pnpm 10** (`corepack enable` will provide the pinned version)

## 🚀 Quickstart

The entire stack — the five apps, the **Kong** gateway, and every backing service — comes up from a
single Compose file.

```bash
git clone <your-fork-url> hackaton-fiapx
cd hackaton-fiapx
cp .env.example .env
docker compose up -d --build
```

That builds the service images and starts Postgres (schema auto-applied from
[`infra/db/init.sql`](infra/db/init.sql)), Redis, RabbitMQ, MinIO (bucket auto-created), Prometheus,
Grafana, the four NestJS services, the React frontend, and Kong as the single edge gateway. The
first build takes a couple of minutes; check progress with `docker compose ps`.

Prefer hot reload while developing? See [Local development](#-local-development) to run just the
infra in Docker and the apps through Nx.

Once everything is healthy:

| What | URL | Credentials |
|---|---|---|
| Web app | http://localhost:4200 | — |
| API gateway (Kong) | http://localhost:8000 | Bearer JWT |
| API Swagger | http://localhost:8000/api/docs | Bearer JWT |
| RabbitMQ management | http://localhost:15672 | `fiapx` / `fiapx` |
| MinIO console | http://localhost:9001 | `minioadmin` / `minioadmin` |
| Grafana | http://localhost:3005 | `admin` / `admin` (anon viewer on) |
| Prometheus | http://localhost:9090 | — |

Everything the browser touches goes through Kong on `:8000`; `api` (`:3000`) and `auth` (`:3001`) are
also published directly for convenience.

**4a. Use it from the browser** — open http://localhost:4200, create an account, drag a video onto
the upload zone, watch the status flip to `COMPLETED` live, then hit **Download**.

**4b. Or drive it with curl**

```bash
BASE=http://localhost:8000   # Kong gateway

# Register (auto-signs in; keeps the session cookie)
curl -s -c cookies.txt -X POST $BASE/api/auth/sign-up/email \
  -H 'Content-Type: application/json' \
  -d '{"name":"Ada Lovelace","email":"ada@example.com","password":"supersecret"}'

# Exchange the session for a bearer JWT
TOKEN=$(curl -s -b cookies.txt $BASE/api/auth/token | jq -r .token)

# Upload a video -> 202 { id, status: "PENDING" }
VIDEO_ID=$(curl -s -X POST $BASE/api/videos \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@./clip.mp4" | jq -r .id)

# Poll the status list (or watch it live over WebSocket)
curl -s -H "Authorization: Bearer $TOKEN" \
  "$BASE/api/videos?page=1&pageSize=10" | jq

# When COMPLETED, grab a presigned URL and download the frames
URL=$(curl -s -H "Authorization: Bearer $TOKEN" \
  "$BASE/api/videos/$VIDEO_ID/download" | jq -r .url)
curl -L -o frames.zip "$URL"
```

> **Port note:** the checked-in `.env` maps host Postgres to **5433** (`POSTGRES_PORT=5433`) to avoid
> clashing with a local Postgres on the default 5432. `.env.example` ships the plain `5432`. If you
> change `POSTGRES_PORT`, update `DATABASE_URL` to match.

## 🧑‍💻 Local development

For hot reload, run only the backing services in Docker and the apps through Nx:

```bash
docker compose up -d postgres redis rabbitmq minio minio-init prometheus grafana
pnpm install
pnpm nx serve @fiapx/api            # NestJS API        -> :3000
pnpm nx serve @fiapx/auth           # Auth service      -> :3001
pnpm nx serve @fiapx/worker         # Video worker      (metrics :3002)
pnpm nx serve @fiapx/notification   # Email consumer    (metrics :3003)
pnpm nx serve @fiapx/app            # React frontend    -> :4200
```

Prefer running the compiled output? Build and run it directly with Node's env-file support:

```bash
pnpm nx build @fiapx/api
node --env-file=.env apps/api/dist/main.js
```

The backend services read configuration from environment variables (see the table below); Nx
`serve` loads `.env` for you. The `worker` and `notification` services have no HTTP surface beyond
their `/metrics` and `/health` endpoints — they do their work off the RabbitMQ queue.

## 🧪 Running tests

```bash
pnpm nx run-many -t test        # unit + Testcontainers integration tests
pnpm nx run-many -t typecheck   # TypeScript, project-wide
pnpm biome check .              # lint + format check
```

- **Unit tests** cover domain logic and use-cases (pure, no I/O).
- **Integration tests** spin up real Postgres and RabbitMQ via **Testcontainers** — Docker must be running.
- **CI** ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) runs on every push and PR: install → `biome ci` → `nx run-many -t typecheck` → `test` → `build`.

## 📁 Project structure

```
hackaton-fiapx/
├── apps/
│   ├── api/            NestJS — uploads, status list, download URLs, WebSocket gateway, Swagger
│   ├── auth/           better-auth — email/password, JWT (EdDSA) + JWKS
│   ├── worker/         NestJS — RabbitMQ consumer, ffmpeg frames -> zip -> S3
│   ├── notification/   NestJS — consumes completion/failure events, emails via Resend
│   └── app/            React + Vite frontend
├── libs/
│   ├── contracts/      Shared HTTP DTOs + RabbitMQ/Redis message contracts
│   ├── database/       Postgres pool module
│   ├── storage/        S3 client (put/get/presign)
│   ├── messaging/      RabbitMQ topology, publisher, consumer
│   └── observability/  Prometheus metrics + /health controller
├── infra/
│   ├── db/init.sql     Database creation script (schema + better-auth tables)
│   ├── kong/           Kong declarative gateway config
│   ├── nginx/          Frontend static-serve config
│   ├── prometheus/     Prometheus scrape config
│   ├── grafana/        Provisioned datasource + dashboard
│   ├── k8s/            Kubernetes manifests (kustomize base + local overlay)
│   └── terraform/      IaC — local (minikube) and AWS (EKS, RDS, ElastiCache, MQ, S3)
├── docs/               Architecture & API reference
├── Dockerfile          Multi-stage build for the four Node services
├── Dockerfile.web      Frontend build served by nginx
├── docker-compose.yml  Full stack — apps, Kong, and all backing services
├── .github/workflows/  CI pipeline (Biome, typecheck, test, build)
└── .env.example        Every configurable value
```

Each backend service follows a DDD layout: `domain/` (entities, ports) → `application/` (use-cases) →
`infrastructure/` (adapters) → `interface/` (controllers, gateways, consumers). Domain never imports
infrastructure; the boundaries are enforced by Nx.

## ⚙️ Environment variables

Copy `.env.example` to `.env` and adjust as needed. Defaults are wired for local Docker Compose.

| Variable | Default | Purpose |
|---|---|---|
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | `fiapx` | Postgres credentials & database. |
| `POSTGRES_PORT` | `5432` | Host port for Postgres (the repo `.env` uses `5433`). |
| `DATABASE_URL` | `postgres://fiapx:fiapx@localhost:5432/fiapx` | Connection string used by `api`, `auth`, `worker`. |
| `REDIS_PORT` / `REDIS_URL` | `6379` / `redis://localhost:6379` | Redis cache + pub/sub for WebSocket fan-out. |
| `RABBITMQ_DEFAULT_USER` / `RABBITMQ_DEFAULT_PASS` | `fiapx` | RabbitMQ credentials. |
| `RABBITMQ_PORT` / `RABBITMQ_MGMT_PORT` | `5672` / `15672` | AMQP and management UI ports. |
| `RABBITMQ_URL` | `amqp://fiapx:fiapx@localhost:5672` | Broker connection string. |
| `RABBITMQ_PREFETCH` | `4` | Messages a single consumer handles at once (throughput knob). |
| `S3_ENDPOINT` | `http://localhost:9000` | S3 endpoint the services use (MinIO locally; empty for real AWS). |
| `S3_PUBLIC_ENDPOINT` | `http://localhost:9000` | Endpoint used to sign browser-facing download URLs (defaults to `S3_ENDPOINT`). |
| `S3_REGION` | `us-east-1` | S3 region. |
| `S3_ACCESS_KEY` / `S3_SECRET_KEY` | `minioadmin` | S3 credentials. |
| `S3_BUCKET_VIDEOS` | `fiapx-videos` | Bucket for raw videos and ZIPs. |
| `S3_FORCE_PATH_STYLE` | `true` | Path-style addressing (required by MinIO). |
| `MINIO_ROOT_USER` / `MINIO_ROOT_PASSWORD` | `minioadmin` | MinIO root credentials. |
| `MINIO_PORT` / `MINIO_CONSOLE_PORT` | `9000` / `9001` | MinIO API and console ports. |
| `AUTH_SECRET` | `dev-only-secret-…` | better-auth signing secret (**change in production**). |
| `AUTH_BASE_URL` | `http://localhost:3001` | Public URL of the auth service. |
| `AUTH_TRUSTED_ORIGINS` | `http://localhost:4200` | CORS allow-list (also used by `api`). |
| `JWKS_URL` | `http://localhost:3001/api/auth/jwks` | Where `api` fetches JWT verification keys. |
| `JWT_ISSUER` | `http://localhost:3001` | Expected JWT issuer. |
| `JWT_AUDIENCE` | `fiapx` | JWT audience. |
| `RESEND_API_KEY` | _(empty)_ | Resend key; empty ⇒ notifications run in dry-run. |
| `RESEND_FROM` | `FIAP X <onboarding@resend.dev>` | Email `From` header. |
| `NOTIFY_DRY_RUN` | `true` | Log emails instead of sending them. |
| `API_PORT` / `AUTH_PORT` | `3000` / `3001` | HTTP ports for `api` and `auth`. |
| `WORKER_METRICS_PORT` / `NOTIFICATION_METRICS_PORT` | `3002` / `3003` | `/metrics` ports for the consumers. |
| `PROMETHEUS_PORT` / `GRAFANA_PORT` | `9090` / `3005` | Monitoring UI ports. |
| `FRAME_RATE` | `1` | Frames per second extracted by ffmpeg. |
| `MAX_VIDEO_MB` | `200` | Upload size limit. |
| `FFMPEG_PATH` | _(unset)_ | Override ffmpeg binary; falls back to bundled `ffmpeg-static`. |
| `VITE_API_URL` / `VITE_AUTH_URL` | `:3000` / `:3001` | Backend URLs the frontend calls (the Compose stack builds the app against Kong on `:8000`). |

## 📊 Monitoring

Every service exposes Prometheus metrics at `/metrics` and a liveness probe at `/health`.

- **Prometheus** (http://localhost:9090) scrapes `api`, `auth`, `worker`, and `notification`
  (config in [`infra/prometheus/prometheus.yml`](infra/prometheus/prometheus.yml)).
- **Grafana** (http://localhost:3005) ships a provisioned datasource and a **FIAP X — Overview**
  dashboard (services up, processing rate, durations).
- Beyond Node/process defaults, the worker publishes domain metrics:
  `fiapx_videos_processed_total{result}` and the `fiapx_video_processing_seconds` histogram.

## 📈 Scaling

The system is built to absorb bursts without dropping work:

- **More throughput** — run additional `worker` replicas. They are competing consumers on the same
  durable queue, so RabbitMQ load-balances jobs across them automatically:
  `docker compose up -d --scale worker=4` in Compose, or bump `replicas` / the HPA on the `worker`
  Deployment in Kubernetes.
- **Per-consumer concurrency** — raise `RABBITMQ_PREFETCH` so each worker pulls more messages in
  flight (trade off against CPU/memory per box).
- **Back-pressure & safety** — the queue is durable and messages are persistent, so a worker crash
  or a spike parks work in the queue rather than losing it. Poison messages dead-letter to
  `video.process.dlq` instead of hot-looping.
- **Stateless services** — `api`, `auth`, and the consumers hold no local state (everything lives in
  Postgres/Redis/S3/RabbitMQ), so they scale out cleanly behind Kong or a Kubernetes Service.

See [docs/architecture.md](docs/architecture.md#scaling--resilience) for the full rationale.

## 🚢 Deployment

- **Docker Compose** — `docker compose up -d --build` runs the full stack (see [Quickstart](#-quickstart)).
- **Kubernetes** — kustomize manifests in [`infra/k8s`](infra/k8s). Apply the local overlay with
  `kubectl apply -k infra/k8s/overlays/local` (per-service Deployments/Services, a `worker` HPA,
  in-cluster Postgres/Redis/RabbitMQ/MinIO, ConfigMap/Secret, and an Ingress).
- **Terraform** — [`infra/terraform`](infra/terraform): a `local/` root (minikube via the
  kubernetes/helm providers) and an `aws/` root that provisions VPC, EKS, RDS Postgres, ElastiCache
  Redis, Amazon MQ (RabbitMQ), and an S3 bucket with least-privilege IRSA access.

## 🗄 Database

The single source of truth for the schema is **[`infra/db/init.sql`](infra/db/init.sql)**. It runs
automatically on first Postgres startup (mounted into `/docker-entrypoint-initdb.d`) and is equally
usable standalone:

```bash
psql "$DATABASE_URL" -f infra/db/init.sql
```

It creates the `video_status` enum (`PENDING`/`PROCESSING`/`COMPLETED`/`FAILED`), the `videos` table
(with an `updated_at` trigger and indexes on `(user_id, created_at)` and `status`), and the
better-auth identity tables (`user`, `session`, `account`, `verification`, `jwks`). Binaries never
touch Postgres — only object keys pointing into S3.

## 📄 License

MIT.
