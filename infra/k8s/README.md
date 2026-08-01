# FIAP X — Kubernetes manifests

Kustomize manifests for the FIAP X video-processing platform. Everything lives
in the `fiapx` namespace.

```
base/                # namespace, app services, backing services, config/secrets, ingress, monitoring
overlays/local/      # minikube overlay: local images, small resources, single replicas (worker=2)
```

## Layout

- **App services** — `api`, `auth`, `worker` (+ HPA), `notification`, `app`
  (frontend). Each has a Deployment and a Service; the backend services run
  liveness/readiness probes against `/health` and are annotated for Prometheus
  scraping on `/metrics`.
- **Backing services** — `postgres` (StatefulSet, schema loaded from the
  `postgres-init` ConfigMap generated from `infra/db/init.sql`), `redis`
  (ephemeral cache), `rabbitmq` and `minio` (StatefulSets), plus `prometheus`
  and `grafana`.
- **Config/secrets** — non-secret env in the `fiapx-config` ConfigMap
  (`base/config.env`); credentials in the `fiapx-secrets` Secret
  (`base/secrets.env`, dev placeholders — replace for anything shared).
- **Ingress** — routes `fiapx.local` → frontend, `api.fiapx.local` → api,
  `auth.fiapx.local` → auth (ingressClassName `nginx`).

### JWT / auth URLs

`JWKS_URL` is server-to-server so it uses the in-cluster DNS name
(`http://auth:3001/api/auth/jwks`). `AUTH_BASE_URL` and `JWT_ISSUER` must match
the **browser-facing** auth origin (`http://auth.fiapx.local`) because the
issuer claim is validated against what clients see. Change the host in
`base/config.env` (and `base/ingress.yaml`) to match your environment.

## Validate

```bash
kubectl kustomize overlays/local | kubectl apply --dry-run=client -f -
```

## Deploy to minikube

```bash
minikube start --cpus=4 --memory=6g
minikube addons enable ingress          # ingress controller
minikube addons enable metrics-server   # for the worker HPA

# Build the app images into minikube's docker so IfNotPresent finds them
eval "$(minikube docker-env)"
docker build -t fiapx/api:latest -f apps/api/Dockerfile .
# ...repeat for auth, worker, notification, app

kubectl apply -k overlays/local

# Map the ingress hosts
echo "$(minikube ip) fiapx.local api.fiapx.local auth.fiapx.local" | sudo tee -a /etc/hosts
```

The `postgres-init` ConfigMap is generated from a copy of `infra/db/init.sql`
kept at `base/postgres/init.sql` (kustomize's default load restrictor cannot
read files outside the kustomization root). Keep the two in sync if the schema
changes.

For a Terraform-driven apply of these manifests, see `../terraform/local`.
