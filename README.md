<div align="center">

<img src="docs/images/fiap-logo.png" alt="FIAP" width="200" />

# FIAP X — Plataforma de Processamento de Vídeo

**Envie um vídeo e receba todos os frames de volta num `.zip` para download.**
A reescrita escalável em microsserviços de uma prova de conceito ingênua — feita para o hackathon da Fase 5 da FIAP Pós-Tech (SOAT).

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](#-licença)
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

O FIAP X pega um vídeo, extrai seus frames com **ffmpeg**, empacota tudo num ZIP e devolve um link de
download pré-assinado. Todo o sistema foi desenhado para aguentar picos: os uploads são aceitos em
milissegundos e processados de forma assíncrona por um pool de workers que você pode escalar
horizontalmente sem perder uma única requisição.

<!-- Adicione capturas da UI em docs/images/ e referencie-as aqui quando disponíveis.
<div align="center">
  <img src="docs/images/dashboard.png" width="49%" alt="Dashboard" />
  <img src="docs/images/login.png" width="49%" alt="Login" />
</div>
-->

## ✨ Funcionalidades

- **Processamento assíncrono de vídeo** — o upload retorna `202` imediatamente; a extração de frames acontece em segundo plano.
- **Escalável horizontalmente** — consumidores concorrentes numa fila durável do RabbitMQ. Precisa de mais vazão? Suba mais réplicas do `worker`.
- **Nada se perde sob carga** — fila durável, mensagens persistentes, ack manual e uma dead-letter queue para as falhas.
- **Status ao vivo** — um feed WebSocket empurra as transições `PENDING → PROCESSING → COMPLETED/FAILED` para o navegador em tempo real.
- **Autenticação embutida** — contas com e-mail/senha que emitem JWTs EdDSA de curta duração, verificados contra um endpoint JWKS.
- **E-mail na conclusão e na falha** — o serviço de notificação envia e-mail ao usuário via Resend (dry-run quando não há chave de API configurada).
- **UI com identidade FIAP (pt-BR)** — React + Vite com o logo oficial da FIAP e a paleta magenta, interface em português do Brasil, upload por drag-and-drop com progresso, alternância claro/escuro e framer-motion em toda parte.
- **Observável** — cada serviço expõe `/metrics` do Prometheus e uma sonda `/health`, integrados a um dashboard do Grafana.

## 🏗 Arquitetura

Um monorepo com cinco apps deployáveis atrás de um API gateway **Kong**, com persistência poliglota —
MongoDB (identidade), Postgres (metadados de vídeo), S3 (binários), RabbitMQ e Redis. Uma descrição
mais completa — diagrama de componentes, diagrama de sequência, topologia do RabbitMQ e a justificativa
das escolhas de tecnologia — está em **[docs/architecture.md](docs/architecture.md)**.

```mermaid
flowchart LR
  subgraph client[Cliente]
    app[app · React/Vite]
  end

  kong[Kong · API gateway]

  subgraph services[Serviços]
    api[api · NestJS]
    auth[auth · better-auth]
    worker[worker · NestJS + ffmpeg]
    notification[notification · Resend]
  end

  subgraph data[Infraestrutura]
    mongo[(MongoDB · identidade)]
    pg[(Postgres · vídeos)]
    s3[(S3 / MinIO)]
    mq{{RabbitMQ}}
    redis[(Redis pub/sub + cache)]
  end

  app -->|HTTP + WebSocket| kong
  kong --> api
  kong --> auth
  auth -->|usuários / sessões| mongo
  api -->|metadados| pg
  api -->|vídeo bruto / zip| s3
  api -->|publica video.process| mq
  api -.->|verifica JWT via JWKS| auth
  mq -->|consome| worker
  mq -->|completed / failed| notification
  worker -->|frames -> zip| s3
  worker -->|status| pg
  worker -->|status alterado| redis
  redis -->|fan-out| api
  api -->|video:status| app
```

**O caminho que um vídeo percorre**

1. O `app` faz upload para o `api` (`POST /api/videos`, multipart, Bearer JWT).
2. O `api` guarda o arquivo bruto no **S3**, grava uma linha `PENDING` no **Postgres**, publica um
   job `video.process` no **RabbitMQ** e retorna `202 { id, status }`.
3. Um `worker` consome o job → `PROCESSING` → baixa o vídeo do S3 → extrai os frames com o
   ffmpeg → compacta em zip → envia o ZIP para o S3 → `COMPLETED` (ou `FAILED`).
4. Cada transição é publicada no pub/sub do **Redis**; o gateway WebSocket do `api` faz o fan-out para o
   navegador do usuário.
5. Na conclusão/falha, o `worker` emite um evento e o serviço `notification` envia e-mail ao usuário.
6. Download: `GET /api/videos/:id/download` retorna uma **URL pré-assinada do S3** de curta duração.

## ✅ Requisitos → Implementação

Cada requisito do enunciado do hackathon e como ele é atendido neste código:

| Requisito | Como é implementado |
|---|---|
| Processar múltiplos vídeos **concorrentemente** | Consumidores concorrentes do RabbitMQ na fila durável `video.process`; escale adicionando réplicas do `worker`, ajuste a vazão com `RABBITMQ_PREFETCH`. |
| **Nunca perder uma requisição** sob pico | Topic exchange durável + fila durável, mensagens `persistent`, publisher confirms, `ack` manual só no sucesso e uma dead-letter queue (`video.process.dlq`) para tudo que falhar. |
| Autenticação por **usuário/senha** | Serviço `auth` (better-auth) com e-mail/senha, emitindo **JWTs** EdDSA; o `api` os verifica contra o endpoint **JWKS**. |
| **Listar os vídeos de um usuário** com status | `GET /api/videos` paginado e restrito ao chamador, mais atualizações `video:status` ao vivo por WebSocket. |
| **Notificar em erro** (e sucesso) | O serviço `notification` consome `video.failed` / `video.completed` e envia e-mail via **Resend**. |
| **Persistir todos os dados** | **Postgres** para metadados/status de vídeo, **MongoDB** para identidade (better-auth) e **S3** (MinIO localmente) para os binários (vídeo bruto + ZIP). |
| **Escalável · versionado · testado · CI/CD** | Microsserviços stateless — **Docker Compose** para toda a stack local, **Kubernetes** (kustomize) e **Terraform** (local + AWS) em `infra/`. Monorepo Nx no GitHub, testes unitários + de integração com **Testcontainers** e um pipeline de **GitHub Actions** (Biome → typecheck → test → build). |

## 🧰 Stack de tecnologia

**Backend** NestJS 11 · TypeScript · SOLID/DDD por serviço ·
**Frontend** React 19 · Vite · TanStack Query · framer-motion ·
**Auth** better-auth (JWT/JWKS, EdDSA) ·
**Mensageria** RabbitMQ (`amqp-connection-manager`) ·
**Dados** MongoDB (auth) · PostgreSQL (vídeos) · Redis (cache/pub-sub) · S3 (MinIO / LocalStack) ·
**Mídia** ffmpeg · archiver ·
**Gateway** Kong ·
**E-mail** Resend ·
**Monorepo** Nx + pnpm ·
**Monitoramento** Prometheus + Grafana (`prom-client`) ·
**Ferramental** Biome · Jest · Vitest · Testcontainers · Docker Compose

## 📦 Pré-requisitos

- **Docker** + Docker Compose (para MongoDB, Postgres, Redis, RabbitMQ, MinIO, Prometheus, Grafana)
- **Node 22**
- **pnpm 10** (`corepack enable` fornece a versão fixada)

## 🚀 Início rápido

Toda a stack — os cinco apps, o gateway **Kong** e todos os serviços de apoio — sobe a partir de um
único arquivo Compose.

```bash
git clone <url-do-seu-fork> hackaton-fiapx
cd hackaton-fiapx
cp .env.example .env
docker compose up -d --build
```

Isso constrói as imagens dos serviços e inicia o Postgres (schema aplicado automaticamente a partir de
[`infra/db/init.sql`](infra/db/init.sql)), o MongoDB (o better-auth cria suas coleções no primeiro
uso), o Redis, o RabbitMQ, o MinIO (bucket criado automaticamente), o Prometheus, o Grafana, os quatro
serviços NestJS, o frontend React e o Kong como único gateway de borda. O primeiro build leva alguns
minutos; acompanhe o progresso com `docker compose ps`.

Prefere hot reload durante o desenvolvimento? Veja [Desenvolvimento local](#-desenvolvimento-local) para
rodar só a infra no Docker e os apps pelo Nx.

Assim que tudo estiver saudável:

| O quê | URL | Credenciais |
|---|---|---|
| App web | http://localhost:4200 | — |
| API gateway (Kong) | http://localhost:8000 | Bearer JWT |
| Swagger da API | http://localhost:8000/api/docs | Bearer JWT |
| Management do RabbitMQ | http://localhost:15672 | `fiapx` / `fiapx` |
| Console do MinIO | http://localhost:9001 | `minioadmin` / `minioadmin` |
| Grafana | http://localhost:3005 | `admin` / `admin` (viewer anônimo ligado) |
| Prometheus | http://localhost:9090 | — |

Tudo o que o navegador acessa passa pelo Kong na `:8000`; o `api` (`:3000`) e o `auth` (`:3001`) também
são publicados diretamente por conveniência.

**4a. Use pelo navegador** — abra http://localhost:4200, crie uma conta, arraste um vídeo para a
zona de upload, veja o status virar `COMPLETED` ao vivo e clique em **Download**.

**4b. Ou opere via curl**

```bash
BASE=http://localhost:8000   # gateway Kong

# Registrar (faz login automaticamente; guarda o cookie de sessão)
curl -s -c cookies.txt -X POST $BASE/api/auth/sign-up/email \
  -H 'Content-Type: application/json' \
  -d '{"name":"Ada Lovelace","email":"ada@example.com","password":"supersecret"}'

# Trocar a sessão por um bearer JWT
TOKEN=$(curl -s -b cookies.txt $BASE/api/auth/token | jq -r .token)

# Enviar um vídeo -> 202 { id, status: "PENDING" }
VIDEO_ID=$(curl -s -X POST $BASE/api/videos \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@./clip.mp4" | jq -r .id)

# Consultar a lista de status (ou acompanhar ao vivo por WebSocket)
curl -s -H "Authorization: Bearer $TOKEN" \
  "$BASE/api/videos?page=1&pageSize=10" | jq

# Quando COMPLETED, pegue a URL pré-assinada e baixe os frames
URL=$(curl -s -H "Authorization: Bearer $TOKEN" \
  "$BASE/api/videos/$VIDEO_ID/download" | jq -r .url)
curl -L -o frames.zip "$URL"
```

> **Nota sobre portas:** o `.env` versionado mapeia o Postgres do host para a **5433**
> (`POSTGRES_PORT=5433`) para não colidir com um Postgres local na 5432 padrão. O `.env.example` já vem
> com a `5432`. Se você mudar o `POSTGRES_PORT`, atualize o `DATABASE_URL` para bater.

## 🧑‍💻 Desenvolvimento local

Para hot reload, rode apenas os serviços de apoio no Docker e os apps pelo Nx:

```bash
docker compose up -d mongo postgres redis rabbitmq minio minio-init prometheus grafana
pnpm install
pnpm nx serve @fiapx/api            # API NestJS        -> :3000
pnpm nx serve @fiapx/auth           # Serviço de auth   -> :3001
pnpm nx serve @fiapx/worker         # Worker de vídeo   (metrics :3002)
pnpm nx serve @fiapx/notification   # Consumidor de e-mail (metrics :3003)
pnpm nx serve @fiapx/app            # Frontend React    -> :4200
```

Prefere rodar o output compilado? Faça o build e rode direto com o suporte a env-file do Node:

```bash
pnpm nx build @fiapx/api
node --env-file=.env apps/api/dist/main.js
```

Os serviços de backend leem a configuração de variáveis de ambiente (veja a tabela abaixo); o `serve` do
Nx carrega o `.env` para você. Os serviços `worker` e `notification` não têm superfície HTTP além dos
endpoints `/metrics` e `/health` — eles fazem o trabalho a partir da fila do RabbitMQ.

## 🧪 Rodando os testes

```bash
pnpm nx run-many -t test        # testes unitários + integração com Testcontainers
pnpm nx run-many -t typecheck   # TypeScript, em todo o projeto
pnpm biome check .              # verificação de lint + formatação
```

- **Testes unitários** cobrem a lógica de domínio e os use-cases (puros, sem I/O).
- **Testes de integração** sobem Postgres e RabbitMQ reais via **Testcontainers** — o Docker precisa estar rodando.
- **CI** ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) roda a cada push e PR: install → `biome ci` → `nx run-many -t typecheck` → `test` → `build`.

## 📁 Estrutura do projeto

```
hackaton-fiapx/
├── apps/
│   ├── api/            NestJS — uploads, lista de status, URLs de download, gateway WebSocket, Swagger
│   ├── auth/           better-auth — e-mail/senha, JWT (EdDSA) + JWKS
│   ├── worker/         NestJS — consumidor RabbitMQ, frames com ffmpeg -> zip -> S3
│   ├── notification/   NestJS — consome eventos de conclusão/falha, envia e-mail via Resend
│   └── app/            Frontend React + Vite
├── libs/
│   ├── contracts/      DTOs HTTP compartilhados + contratos de mensagem RabbitMQ/Redis
│   ├── database/       Módulo de pool do Postgres
│   ├── storage/        Cliente S3 (put/get/presign)
│   ├── messaging/      Topologia, publisher e consumer do RabbitMQ
│   └── observability/  Métricas Prometheus + controller /health
├── infra/
│   ├── db/init.sql     Script de criação do Postgres (schema de vídeos; auth vive no MongoDB)
│   ├── kong/           Config declarativa do gateway Kong
│   ├── nginx/          Config de serve estático do frontend
│   ├── prometheus/     Config de scrape do Prometheus
│   ├── grafana/        Datasource + dashboard provisionados
│   ├── k8s/            Manifests Kubernetes (base kustomize + overlay local)
│   └── terraform/      IaC — local (minikube) e AWS (EKS, RDS, ElastiCache, MQ, S3)
├── docs/               Arquitetura e referência da API
├── Dockerfile          Build multi-stage dos quatro serviços Node
├── Dockerfile.web      Build do frontend servido pelo nginx
├── docker-compose.yml  Stack completa — apps, Kong e todos os serviços de apoio
├── .github/workflows/  Pipeline de CI (Biome, typecheck, test, build)
└── .env.example        Todos os valores configuráveis
```

Cada serviço de backend segue um layout DDD: `domain/` (entidades, ports) → `application/` (use-cases) →
`infrastructure/` (adapters) → `interface/` (controllers, gateways, consumers). O domínio nunca importa
infraestrutura; as fronteiras são reforçadas pelo Nx.

## ⚙️ Variáveis de ambiente

Copie o `.env.example` para `.env` e ajuste conforme necessário. Os defaults já estão prontos para o
Docker Compose local.

| Variável | Default | Finalidade |
|---|---|---|
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | `fiapx` | Credenciais e banco do Postgres. |
| `POSTGRES_PORT` | `5432` | Porta de host do Postgres (o `.env` do repo usa `5433`). |
| `DATABASE_URL` | `postgres://fiapx:fiapx@localhost:5432/fiapx` | String de conexão do Postgres usada por `api` e `worker` (o serviço `auth` não a usa mais — ele conecta ao MongoDB via `MONGODB_URI`). |
| `MONGODB_URI` | `mongodb://fiapx:fiapx@localhost:27017/fiapx_auth?authSource=admin` | String de conexão do MongoDB usada pelo `auth` (store de identidade do better-auth). |
| `MONGO_INITDB_ROOT_USERNAME` / `MONGO_INITDB_ROOT_PASSWORD` | `fiapx` | Credenciais e banco root do MongoDB. |
| `MONGO_PORT` | `27017` | Porta de host do MongoDB. |
| `REDIS_PORT` / `REDIS_URL` | `6379` / `redis://localhost:6379` | Redis para cache + pub/sub do fan-out do WebSocket. |
| `RABBITMQ_DEFAULT_USER` / `RABBITMQ_DEFAULT_PASS` | `fiapx` | Credenciais do RabbitMQ. |
| `RABBITMQ_PORT` / `RABBITMQ_MGMT_PORT` | `5672` / `15672` | Portas do AMQP e da UI de management. |
| `RABBITMQ_URL` | `amqp://fiapx:fiapx@localhost:5672` | String de conexão do broker. |
| `RABBITMQ_PREFETCH` | `4` | Mensagens que um único consumidor processa por vez (ajuste de vazão). |
| `S3_ENDPOINT` | `http://localhost:9000` | Endpoint S3 usado pelos serviços (MinIO localmente; vazio para AWS real). |
| `S3_PUBLIC_ENDPOINT` | `http://localhost:9000` | Endpoint usado para assinar URLs de download voltadas ao navegador (default: `S3_ENDPOINT`). |
| `S3_REGION` | `us-east-1` | Região do S3. |
| `S3_ACCESS_KEY` / `S3_SECRET_KEY` | `minioadmin` | Credenciais do S3. |
| `S3_BUCKET_VIDEOS` | `fiapx-videos` | Bucket para vídeos brutos e ZIPs. |
| `S3_FORCE_PATH_STYLE` | `true` | Endereçamento path-style (exigido pelo MinIO). |
| `MINIO_ROOT_USER` / `MINIO_ROOT_PASSWORD` | `minioadmin` | Credenciais root do MinIO. |
| `MINIO_PORT` / `MINIO_CONSOLE_PORT` | `9000` / `9001` | Portas da API e do console do MinIO. |
| `AUTH_SECRET` | `dev-only-secret-…` | Segredo de assinatura do better-auth (**troque em produção**). |
| `AUTH_BASE_URL` | `http://localhost:3001` | URL pública do serviço de auth. |
| `AUTH_TRUSTED_ORIGINS` | `http://localhost:4200` | Allow-list de CORS (também usada pelo `api`). |
| `JWKS_URL` | `http://localhost:3001/api/auth/jwks` | Onde o `api` busca as chaves de verificação do JWT. |
| `JWT_ISSUER` | `http://localhost:3001` | Issuer esperado do JWT. |
| `JWT_AUDIENCE` | `fiapx` | Audience do JWT. |
| `RESEND_API_KEY` | _(vazio)_ | Chave do Resend; vazio ⇒ notificações rodam em dry-run. |
| `RESEND_FROM` | `FIAP X <onboarding@resend.dev>` | Header `From` do e-mail. |
| `NOTIFY_DRY_RUN` | `true` | Loga os e-mails em vez de enviá-los. |
| `API_PORT` / `AUTH_PORT` | `3000` / `3001` | Portas HTTP do `api` e do `auth`. |
| `WORKER_METRICS_PORT` / `NOTIFICATION_METRICS_PORT` | `3002` / `3003` | Portas `/metrics` dos consumidores. |
| `PROMETHEUS_PORT` / `GRAFANA_PORT` | `9090` / `3005` | Portas das UIs de monitoramento. |
| `FRAME_RATE` | `1` | Frames por segundo extraídos pelo ffmpeg. |
| `MAX_VIDEO_MB` | `200` | Limite de tamanho do upload. |
| `FFMPEG_PATH` | _(não definido)_ | Sobrescreve o binário do ffmpeg; cai no `ffmpeg-static` empacotado. |
| `VITE_API_URL` / `VITE_AUTH_URL` | `:3000` / `:3001` | URLs de backend que o frontend chama (a stack Compose builda o app contra o Kong na `:8000`). |

## 📊 Monitoramento

Cada serviço expõe métricas do Prometheus em `/metrics` e uma sonda de liveness em `/health`.

- O **Prometheus** (http://localhost:9090) faz scrape de `api`, `auth`, `worker` e `notification`
  (config em [`infra/prometheus/prometheus.yml`](infra/prometheus/prometheus.yml)).
- O **Grafana** (http://localhost:3005) já vem com um datasource provisionado e um dashboard
  **FIAP X — Overview** (serviços no ar, taxa de processamento, durações).
- Além dos defaults de Node/processo, o worker publica métricas de domínio:
  `fiapx_videos_processed_total{result}` e o histograma `fiapx_video_processing_seconds`.

## 📈 Escalabilidade

O sistema é feito para absorver rajadas sem descartar trabalho:

- **Mais vazão** — rode réplicas adicionais do `worker`. Elas são consumidores concorrentes na mesma
  fila durável, então o RabbitMQ balanceia os jobs entre elas automaticamente:
  `docker compose up -d --scale worker=4` no Compose, ou aumente `replicas` / o HPA no Deployment do
  `worker` no Kubernetes.
- **Concorrência por consumidor** — aumente o `RABBITMQ_PREFETCH` para que cada worker puxe mais
  mensagens em voo (com o trade-off de CPU/memória por instância).
- **Back-pressure e segurança** — a fila é durável e as mensagens são persistentes, então um crash do
  worker ou um pico estaciona o trabalho na fila em vez de perdê-lo. Mensagens envenenadas vão para a
  dead-letter `video.process.dlq` em vez de entrar em loop quente.
- **Serviços stateless** — `api`, `auth` e os consumidores não guardam estado local (tudo vive em
  MongoDB/Postgres/Redis/S3/RabbitMQ), então escalam horizontalmente sem atrito atrás do Kong ou de um
  Service do Kubernetes.

Veja [docs/architecture.md](docs/architecture.md#escalabilidade-e-resiliência) para a justificativa completa.

## 🚢 Deploy

- **Docker Compose** — `docker compose up -d --build` sobe a stack completa (veja [Início rápido](#-início-rápido)).
- **Kubernetes** — manifests kustomize em [`infra/k8s`](infra/k8s). Aplique o overlay local com
  `kubectl apply -k infra/k8s/overlays/local` (Deployments/Services por serviço, um HPA do `worker`,
  Postgres/Redis/RabbitMQ/MinIO in-cluster, ConfigMap/Secret e um Ingress).
- **Terraform** — [`infra/terraform`](infra/terraform): uma raiz `local/` (minikube pelos providers
  kubernetes/helm) e uma raiz `aws/` que provisiona VPC, EKS, RDS Postgres, ElastiCache Redis, Amazon MQ
  (RabbitMQ) e um bucket S3 com acesso IRSA de menor privilégio.

## 🗄 Bancos de dados

**Persistência poliglota** — cada bounded context possui o store que melhor lhe serve: **MongoDB** para
identidade, **PostgreSQL** para metadados de vídeo, **Redis** para cache e realtime, e **S3** para
binários. Isso satisfaz o "banco por (bounded) context".

**PostgreSQL (contexto de processamento de vídeo).** A única fonte de verdade do schema de vídeo é o
**[`infra/db/init.sql`](infra/db/init.sql)**. Ele roda automaticamente no primeiro startup do Postgres
(montado em `/docker-entrypoint-initdb.d`) e também é usável de forma standalone:

```bash
psql "$DATABASE_URL" -f infra/db/init.sql
```

Ele cria **apenas** o enum `video_status` (`PENDING`/`PROCESSING`/`COMPLETED`/`FAILED`) e a tabela
`videos` (com um trigger de `updated_at` e índices em `(user_id, created_at)` e `status`), usados por
`api` e `worker`. Binários nunca tocam o Postgres — apenas as chaves de objeto que apontam para o S3.

**MongoDB (contexto de identidade).** O serviço `auth` persiste identidade através do `mongodbAdapter` do
better-auth contra o banco `fiapx_auth` (`MONGODB_URI`). O MongoDB é schemaless, então **não há migração
SQL para o auth**: o better-auth cria suas coleções (`user`, `session`, `account`, `verification`,
`jwks`) automaticamente no primeiro uso.

## 📄 Licença

MIT.
