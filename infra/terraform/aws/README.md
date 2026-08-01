# FIAP X — AWS Terraform (EKS)

Provisions a production-shaped AWS environment for FIAP X and runs the workloads
on **EKS**, so the same Kubernetes manifests in `infra/k8s` apply unchanged
(swapping the in-cluster backing services for managed AWS ones).

## What it creates

| Module        | Resources                                                                 |
| ------------- | ------------------------------------------------------------------------- |
| `network`     | VPC, public/private subnets across N AZs, IGW, NAT gateway(s), routing     |
| `eks`         | EKS cluster, managed node group, IAM roles, IRSA OIDC provider             |
| `rds`         | RDS PostgreSQL (encrypted, private) + security group                       |
| `elasticache` | ElastiCache Redis replication group + security group                       |
| `mq`          | Amazon MQ for RabbitMQ (AMQPS) + security group                            |
| `s3`          | Videos bucket (versioned, encrypted, private) + least-privilege IRSA role  |
| root          | Secrets Manager entry with the assembled connection strings                |

Data-tier security groups only allow ingress from the EKS cluster security
group. The S3 IAM policy is scoped to the single bucket and the api/worker
service accounts (via IRSA) — no node-wide S3 access, no wildcards.

## Prerequisites

- `terraform >= 1.5`, `awscli`, `kubectl`
- AWS credentials with permission to create the resources above
- A globally-unique S3 bucket name (`videos_bucket_name`)

## Usage

```bash
cd infra/terraform/aws
cp terraform.tfvars.example terraform.tfvars   # then edit

# Secrets via environment (never commit them)
export TF_VAR_db_password='...'
export TF_VAR_mq_password='at-least-12-chars'

terraform init
terraform plan
terraform apply
```

### Deploy the app onto the cluster

```bash
# 1. Point kubectl at the new cluster (see the kubeconfig_command output)
aws eks update-kubeconfig --region <region> --name <cluster>

# 2. Install the AWS Load Balancer Controller so the Ingress provisions an ALB
#    (https://kubernetes-sigs.github.io/aws-load-balancer-controller/).

# 3. Apply the manifests. For AWS you drop the in-cluster postgres/redis/rabbitmq/
#    minio and point config at the managed endpoints (Terraform outputs); wire the
#    Secrets Manager entry in with External Secrets or the Secrets Store CSI driver,
#    and annotate the api/worker service accounts with s3_irsa_role_arn.
kubectl apply -k ../../k8s/base
```

## Key outputs

`terraform output` exposes `eks_cluster_name`, `rds_endpoint`,
`redis_endpoint`, `rabbitmq_amqps_endpoint`, `videos_bucket_name`,
`s3_irsa_role_arn`, and `app_secret_arn`.

## Notes & assumptions

- **Compute choice:** EKS (not ECS Fargate) so the Kubernetes manifests are the
  single deployment definition across local and AWS.
- The ALB is created by the AWS Load Balancer Controller from the `Ingress`
  resource; it is not managed directly in Terraform.
- Defaults favor a low-cost dev footprint (single NAT gateway, single-AZ RDS,
  single-node Redis/MQ). Flip `db_multi_az`, `redis_num_nodes`,
  `mq_deployment_mode`, and `single_nat_gateway` for HA.
- No secrets are hardcoded: DB/MQ passwords come from `TF_VAR_*` and the
  assembled connection strings live in Secrets Manager (state is still
  sensitive — use a remote encrypted backend such as S3 + DynamoDB locking).
