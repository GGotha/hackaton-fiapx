# FIAP X — Terraform

Two independent roots:

| Root     | Target                | Purpose                                                             |
| -------- | --------------------- | ------------------------------------------------------------------- |
| `local/` | minikube              | Installs ingress-nginx and applies the `infra/k8s` kustomize overlay |
| `aws/`   | AWS (EKS + managed)   | VPC, EKS, RDS, ElastiCache, Amazon MQ, S3, IAM — a real deployment   |

Each root is self-contained (`terraform init` / `plan` / `apply` from inside it)
and has its own README with prerequisites and step-by-step usage.

## Quick start

```bash
# Local (minikube)
cd local && terraform init && terraform apply

# AWS (EKS)
cd aws
cp terraform.tfvars.example terraform.tfvars   # edit, then set secrets:
export TF_VAR_db_password=... TF_VAR_mq_password=...
terraform init && terraform apply
```

## Conventions

- `>= 1.5` required; each module pins its providers in `versions.tf`.
- No secrets in code: passwords come from `TF_VAR_*`; the AWS root stores
  assembled connection strings in Secrets Manager. Use a remote encrypted
  backend (S3 + DynamoDB) for real state.
- The AWS root uses **EKS** so the Kubernetes manifests are the single
  deployment definition shared with the local environment.
