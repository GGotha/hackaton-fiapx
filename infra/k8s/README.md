# FIAP X — Manifests Kubernetes

Manifests kustomize da plataforma de processamento de vídeo FIAP X. Tudo vive
no namespace `fiapx`.

```
base/                # namespace, app services, backing services, config/secrets, ingress, monitoramento
overlays/local/      # overlay minikube: imagens locais, recursos pequenos, réplica única (worker=2)
```

## Estrutura

- **App services** — `api`, `auth`, `worker` (+ HPA), `notification`, `app`
  (frontend). Cada um tem um Deployment e um Service; os serviços de backend rodam
  probes de liveness/readiness contra `/health` e são anotados para o scraping do
  Prometheus em `/metrics`.
- **Backing services** — `postgres` (StatefulSet, schema carregado a partir do
  ConfigMap `postgres-init` gerado de `infra/db/init.sql`), `redis`
  (cache efêmero), `rabbitmq` e `minio` (StatefulSets), além de `prometheus`
  e `grafana`.
- **Config/secrets** — env não-secreto no ConfigMap `fiapx-config`
  (`base/config.env`); credenciais no Secret `fiapx-secrets`
  (`base/secrets.env`, placeholders de dev — substitua para qualquer coisa compartilhada).
- **Ingress** — roteia `fiapx.local` → frontend, `api.fiapx.local` → api,
  `auth.fiapx.local` → auth (ingressClassName `nginx`).

### URLs de JWT / auth

`JWKS_URL` é server-to-server, então usa o nome DNS interno do cluster
(`http://auth:3001/api/auth/jwks`). `AUTH_BASE_URL` e `JWT_ISSUER` precisam bater
com a origem de auth **voltada ao navegador** (`http://auth.fiapx.local`), porque a
claim de issuer é validada contra o que os clientes veem. Altere o host em
`base/config.env` (e `base/ingress.yaml`) para corresponder ao seu ambiente.

## Validar

```bash
kubectl kustomize overlays/local | kubectl apply --dry-run=client -f -
```

## Deploy no minikube

```bash
minikube start --cpus=4 --memory=6g
minikube addons enable ingress          # ingress controller
minikube addons enable metrics-server   # para o HPA do worker

# Builde as imagens dos apps no docker do minikube para o IfNotPresent encontrá-las
eval "$(minikube docker-env)"
docker build -t fiapx/api:latest -f apps/api/Dockerfile .
# ...repita para auth, worker, notification, app

kubectl apply -k overlays/local

# Mapeie os hosts do ingress
echo "$(minikube ip) fiapx.local api.fiapx.local auth.fiapx.local" | sudo tee -a /etc/hosts
```

O ConfigMap `postgres-init` é gerado a partir de uma cópia de `infra/db/init.sql`
mantida em `base/postgres/init.sql` (o load restrictor padrão do kustomize não consegue
ler arquivos fora da raiz da kustomization). Mantenha os dois em sincronia se o schema
mudar.

Para um apply destes manifests dirigido por Terraform, veja `../terraform/local`.
