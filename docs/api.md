# API Reference

Two HTTP surfaces, both under `/api`:

- **auth** (`http://localhost:3001`) — accounts and tokens (better-auth).
- **api** (`http://localhost:3000`) — videos, protected by a Bearer JWT.

Interactive Swagger docs for the `api` service are served at
**http://localhost:3000/api/docs**.

In a deployed environment both sit behind **Kong** on a single origin; locally the frontend calls
them directly (`VITE_API_URL` / `VITE_AUTH_URL`).

## Authentication

Accounts and sessions are handled by better-auth. Email/password sign-up auto-signs-in and returns a
session cookie; the `api` does not consume that cookie — it expects a **bearer JWT**, which you
obtain from `GET /api/auth/token` using the session. JWTs are EdDSA-signed, expire after 1 hour, and
carry the user's `email` and `name`. The `api` verifies them against the JWKS endpoint and checks the
issuer.

| Method | Endpoint | Body | Returns |
|---|---|---|---|
| `POST` | `/api/auth/sign-up/email` | `{ name, email, password }` | Session (sets cookie); auto-signs-in |
| `POST` | `/api/auth/sign-in/email` | `{ email, password }` | Session (sets cookie) |
| `GET` | `/api/auth/token` | — (session cookie) | `{ token }` — the bearer JWT for the `api` |
| `GET` | `/api/auth/jwks` | — | JWKS public keys (used by `api` to verify JWTs) |
| `POST` | `/api/auth/sign-out` | — (session cookie) | Ends the session |

```bash
# Sign up (auto-signs-in, stores the session cookie)
curl -s -c cookies.txt -X POST http://localhost:3001/api/auth/sign-up/email \
  -H 'Content-Type: application/json' \
  -d '{"name":"Ada Lovelace","email":"ada@example.com","password":"supersecret"}'

# Exchange the session for a bearer JWT
curl -s -b cookies.txt http://localhost:3001/api/auth/token
# -> { "token": "eyJ..." }
```

> Passwords must be at least 8 characters.

## Videos

All video endpoints require `Authorization: Bearer <jwt>` and operate only on the caller's own
videos. A request for a video owned by someone else responds as if it does not exist.

### `POST /api/videos`

Upload a video for processing. Multipart form with a single field named **`file`**. Returns `202`
immediately — processing is asynchronous. Uploads over `MAX_VIDEO_MB` (default 200 MB) are rejected.

```bash
curl -s -X POST http://localhost:3000/api/videos \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@./clip.mp4"
```

```json
{ "id": "0f8c…", "status": "PENDING" }
```

| Code | Meaning |
|---|---|
| `202` | Accepted; job queued. |
| `400` | No `file` field. |
| `401` | Missing/invalid token. |
| — | Uploads above `MAX_VIDEO_MB` are rejected by the upload interceptor (Multer file-size limit). |

### `GET /api/videos`

Paginated list of the caller's videos, newest first.

**Query:** `page` (default `1`, min `1`), `pageSize` (default `10`, min `1`, max `100`).

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

A single video by id (must belong to the caller). Returns the same shape as an `items[]` entry above;
`404` if it doesn't exist or isn't yours.

### `GET /api/videos/:id/download`

Returns a short-lived presigned S3 URL for the processed ZIP. Only valid once the video is
`COMPLETED`.

```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/videos/$VIDEO_ID/download"
```

```json
{ "url": "http://localhost:9000/fiapx-videos/zips/…", "expiresInSeconds": 900 }
```

| Code | Meaning |
|---|---|
| `200` | URL returned. |
| `404` | Not found / not owned by caller. |
| `409` | Video not ready (not `COMPLETED` yet). |

## WebSocket — live status

The `api` hosts a Socket.IO server at its origin. Authenticate on connect by passing the same bearer
JWT; the server verifies it and scopes events to your user.

```ts
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000', {
  auth: { token }, // the api JWT
  transports: ['websocket'],
});

socket.on('video:status', (payload) => {
  // { videoId, userId, status, frameCount, error, updatedAt }
  console.log(payload.videoId, payload.status);
});
```

Emitted whenever one of your videos changes state
(`PENDING → PROCESSING → COMPLETED` / `FAILED`). A connection without a valid token is disconnected.

## Video status values

| Status | Meaning |
|---|---|
| `PENDING` | Uploaded and queued; not yet picked up. |
| `PROCESSING` | A worker is extracting frames. |
| `COMPLETED` | ZIP ready; `frameCount` populated, download available. |
| `FAILED` | Processing errored; `error` populated, a failure email is sent. |

## Operational endpoints

Exposed by every service (outside the `/api` prefix):

| Endpoint | Purpose |
|---|---|
| `GET /health` | Liveness — `{ status: "ok", uptime }`. |
| `GET /metrics` | Prometheus exposition format. |
