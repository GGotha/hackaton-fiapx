# Referência da API

Duas superfícies HTTP, ambas sob `/api`:

- **auth** (`http://localhost:3001`) — contas e tokens (better-auth).
- **api** (`http://localhost:3000`) — vídeos, protegido por um Bearer JWT.

A documentação interativa do Swagger para o serviço `api` é servida em
**http://localhost:3000/api/docs**.

Num ambiente implantado, ambos ficam atrás do **Kong** numa única origem; localmente o frontend os
chama diretamente (`VITE_API_URL` / `VITE_AUTH_URL`).

## Autenticação

Contas e sessões são tratadas pelo better-auth. O cadastro por e-mail/senha faz login automaticamente e
retorna um cookie de sessão; o `api` não consome esse cookie — ele espera um **bearer JWT**, que você
obtém em `GET /api/auth/token` usando a sessão. Os JWTs são assinados com EdDSA, expiram após 1 hora e
carregam o `email` e o `name` do usuário. O `api` os verifica contra o endpoint JWKS e confere o
issuer.

| Método | Endpoint | Corpo | Retorna |
|---|---|---|---|
| `POST` | `/api/auth/sign-up/email` | `{ name, email, password }` | Sessão (define cookie); faz login automaticamente |
| `POST` | `/api/auth/sign-in/email` | `{ email, password }` | Sessão (define cookie) |
| `GET` | `/api/auth/token` | — (cookie de sessão) | `{ token }` — o bearer JWT para o `api` |
| `GET` | `/api/auth/jwks` | — | Chaves públicas JWKS (usadas pelo `api` para verificar os JWTs) |
| `POST` | `/api/auth/sign-out` | — (cookie de sessão) | Encerra a sessão |

```bash
# Cadastro (faz login automaticamente, guarda o cookie de sessão)
curl -s -c cookies.txt -X POST http://localhost:3001/api/auth/sign-up/email \
  -H 'Content-Type: application/json' \
  -d '{"name":"Ada Lovelace","email":"ada@example.com","password":"supersecret"}'

# Trocar a sessão por um bearer JWT
curl -s -b cookies.txt http://localhost:3001/api/auth/token
# -> { "token": "eyJ..." }
```

> As senhas devem ter pelo menos 8 caracteres.

## Vídeos

Todos os endpoints de vídeo exigem `Authorization: Bearer <jwt>` e operam apenas sobre os vídeos do
próprio chamador. Uma requisição a um vídeo de outra pessoa responde como se ele não existisse.

### `POST /api/videos`

Envia um vídeo para processamento. Formulário multipart com um único campo chamado **`file`**. Retorna
`202` imediatamente — o processamento é assíncrono. Uploads acima de `MAX_VIDEO_MB` (padrão 200 MB) são
rejeitados.

```bash
curl -s -X POST http://localhost:3000/api/videos \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@./clip.mp4"
```

```json
{ "id": "0f8c…", "status": "PENDING" }
```

| Código | Significado |
|---|---|
| `202` | Aceito; job enfileirado. |
| `400` | Sem o campo `file`. |
| `401` | Token ausente/inválido. |
| — | Uploads acima de `MAX_VIDEO_MB` são rejeitados pelo interceptor de upload (limite de tamanho de arquivo do Multer). |

### `GET /api/videos`

Lista paginada dos vídeos do chamador, do mais recente para o mais antigo.

**Query:** `page` (padrão `1`, mín. `1`), `pageSize` (padrão `10`, mín. `1`, máx. `100`).

```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/videos?page=1&pageSize=10"
```

```json
{
  "items": [
    {
      "id": "0f8c…",
      "originalName": "clip.mp4",
      "status": "COMPLETED",
      "frameCount": 42,
      "error": null,
      "sizeBytes": 10485760,
      "createdAt": "2026-08-01T12:00:00.000Z",
      "updatedAt": "2026-08-01T12:00:07.000Z"
    }
  ],
  "page": 1,
  "pageSize": 10,
  "total": 1,
  "totalPages": 1
}
```

### `GET /api/videos/:id`

Um único vídeo por id (deve pertencer ao chamador). Retorna o mesmo formato de uma entrada de `items[]`
acima; `404` se não existir ou não for seu.

### `GET /api/videos/:id/download`

Retorna uma URL S3 pré-assinada de curta duração para o ZIP processado. Só é válida quando o vídeo está
`COMPLETED`.

```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/videos/$VIDEO_ID/download"
```

```json
{ "url": "http://localhost:9000/fiapx-videos/zips/…", "expiresInSeconds": 900 }
```

| Código | Significado |
|---|---|
| `200` | URL retornada. |
| `404` | Não encontrado / não pertence ao chamador. |
| `409` | Vídeo não pronto (ainda não está `COMPLETED`). |

## WebSocket — status ao vivo

O `api` hospeda um servidor Socket.IO na sua origem. Autentique-se ao conectar passando o mesmo bearer
JWT; o servidor o verifica e restringe os eventos ao seu usuário.

```ts
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000', {
  auth: { token }, // o JWT do api
  transports: ['websocket'],
});

socket.on('video:status', (payload) => {
  // { videoId, userId, status, frameCount, error, updatedAt }
  console.log(payload.videoId, payload.status);
});
```

Emitido sempre que um dos seus vídeos muda de estado
(`PENDING → PROCESSING → COMPLETED` / `FAILED`). Uma conexão sem um token válido é desconectada.

## Valores de status do vídeo

| Status | Significado |
|---|---|
| `PENDING` | Enviado e enfileirado; ainda não retirado. |
| `PROCESSING` | Um worker está extraindo os frames. |
| `COMPLETED` | ZIP pronto; `frameCount` preenchido, download disponível. |
| `FAILED` | O processamento deu erro; `error` preenchido, um e-mail de falha é enviado. |

## Endpoints operacionais

Expostos por todos os serviços (fora do prefixo `/api`):

| Endpoint | Finalidade |
|---|---|
| `GET /health` | Liveness — `{ status: "ok", uptime }`. |
| `GET /metrics` | Formato de exposição do Prometheus. |
