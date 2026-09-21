# FIAP X — Terraform

Duas raízes independentes:

| Raiz     | Alvo                  | Finalidade                                                          |
| -------- | --------------------- | ------------------------------------------------------------------- |
| `local/` | minikube              | Instala o ingress-nginx e aplica o overlay kustomize de `infra/k8s` |
| `aws/`   | AWS (EKS + managed)   | VPC, EKS, RDS, ElastiCache, Amazon MQ, S3, IAM — um deploy real      |

Cada raiz é autocontida (`terraform init` / `plan` / `apply` de dentro dela)
e tem seu próprio README com pré-requisitos e uso passo a passo.

## Início rápido

```bash
# Local (minikube)
cd local && terraform init && terraform apply

# AWS (EKS)
cd aws
cp terraform.tfvars.example terraform.tfvars   # edit, then set secrets:
export TF_VAR_db_password=... TF_VAR_mq_password=...
terraform init && terraform apply
```

## Convenções

- `>= 1.5` requerido; cada módulo fixa seus providers em `versions.tf`.
- Sem secrets no código: as senhas vêm de `TF_VAR_*`; a raiz AWS armazena
  as connection strings montadas no Secrets Manager. Use um backend remoto
  criptografado (S3 + DynamoDB) para state real.
- A raiz AWS usa **EKS** para que os manifests Kubernetes sejam a única
  definição de deploy compartilhada com o ambiente local.
