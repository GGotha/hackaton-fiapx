# FIAP X — Terraform Local (minikube)

Conduz o deploy local em Kubernetes do FIAP X. O Terraform instala o
ingress controller e aplica o overlay kustomize em `infra/k8s/overlays/local`,
de modo que os manifests continuem sendo a única fonte de verdade.

## Pré-requisitos

- [minikube](https://minikube.sigs.k8s.io/), `kubectl` e `terraform >= 1.5`
- Docker (ou outro driver de minikube) rodando
- As imagens dos serviços buildadas e carregadas no cluster (veja abaixo)

## Uso

```bash
# 1. Suba o cluster
minikube start --cpus=4 --memory=6g
minikube addons enable metrics-server   # necessário para o HPA do worker

# 2. Builde as imagens dos apps direto no docker do minikube
eval "$(minikube docker-env)"
docker build -t fiapx/api:latest          -f apps/api/Dockerfile .
docker build -t fiapx/auth:latest         -f apps/auth/Dockerfile .
docker build -t fiapx/worker:latest       -f apps/worker/Dockerfile .
docker build -t fiapx/notification:latest -f apps/notification/Dockerfile .
docker build -t fiapx/app:latest          -f apps/app/Dockerfile .

# 3. Aplique
cd infra/terraform/local
terraform init
terraform apply

# 4. Mapeie os hosts do ingress para o cluster
echo "$(minikube ip) fiapx.local api.fiapx.local auth.fiapx.local" | sudo tee -a /etc/hosts
```

Abra http://fiapx.local para o frontend.

## Variáveis

| Variável                | Default                   | Finalidade                                          |
| ----------------------- | ------------------------- | --------------------------------------------------- |
| `kube_context`          | `minikube`                | contexto do kubeconfig a mirar                      |
| `kubeconfig_path`       | `~/.kube/config`          | localização do kubeconfig                           |
| `kustomize_overlay`     | `../../k8s/overlays/local`| overlay aplicado ao cluster                         |
| `install_ingress_nginx` | `true`                    | instala o ingress-nginx via Helm (senão usa o minikube) |

## Destruir

```bash
terraform destroy      # remove o app + ingress controller
minikube delete
```

## Notas

- O Terraform chama `kubectl apply -k` por fora, então o kustomize continua sendo a única
  definição dos workloads. O `terraform_data.app` reaplica automaticamente
  quando qualquer manifest sob `infra/k8s` muda.
- Se você preferir o ingress embutido do minikube, rode
  `minikube addons enable ingress` e defina `install_ingress_nginx = false`.
