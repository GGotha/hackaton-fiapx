# FIAP X — Local Terraform (minikube)

Drives the local Kubernetes deployment of FIAP X. Terraform installs the
ingress controller and applies the kustomize overlay in `infra/k8s/overlays/local`,
so the manifests stay the single source of truth.

## Prerequisites

- [minikube](https://minikube.sigs.k8s.io/), `kubectl`, and `terraform >= 1.5`
- Docker (or another minikube driver) running
- The service images built and loaded into the cluster (see below)

## Usage

```bash
# 1. Start the cluster
minikube start --cpus=4 --memory=6g
minikube addons enable metrics-server   # needed for the worker HPA

# 2. Build the app images straight into minikube's docker
eval "$(minikube docker-env)"
docker build -t fiapx/api:latest          -f apps/api/Dockerfile .
docker build -t fiapx/auth:latest         -f apps/auth/Dockerfile .
docker build -t fiapx/worker:latest       -f apps/worker/Dockerfile .
docker build -t fiapx/notification:latest -f apps/notification/Dockerfile .
docker build -t fiapx/app:latest          -f apps/app/Dockerfile .

# 3. Apply
cd infra/terraform/local
terraform init
terraform apply

# 4. Map the ingress hosts to the cluster
echo "$(minikube ip) fiapx.local api.fiapx.local auth.fiapx.local" | sudo tee -a /etc/hosts
```

Open http://fiapx.local for the frontend.

## Variables

| Variable                | Default                   | Purpose                                             |
| ----------------------- | ------------------------- | --------------------------------------------------- |
| `kube_context`          | `minikube`                | kubeconfig context to target                        |
| `kubeconfig_path`       | `~/.kube/config`          | kubeconfig location                                 |
| `kustomize_overlay`     | `../../k8s/overlays/local`| overlay applied to the cluster                      |
| `install_ingress_nginx` | `true`                    | install ingress-nginx via Helm (else use minikube)  |

## Teardown

```bash
terraform destroy      # deletes the app + ingress controller
minikube delete
```

## Notes

- Terraform shells out to `kubectl apply -k` so kustomize remains the one
  definition of the workloads. `terraform_data.app` re-applies automatically
  when any manifest under `infra/k8s` changes.
- If you prefer minikube's built-in ingress, run
  `minikube addons enable ingress` and set `install_ingress_nginx = false`.
