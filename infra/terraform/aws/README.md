# FIAP X — Terraform AWS (EKS)

Provisiona um ambiente AWS com formato de produção para o FIAP X e roda os workloads
no **EKS**, de modo que os mesmos manifests Kubernetes em `infra/k8s` se apliquem sem alteração
(trocando os backing services in-cluster pelos gerenciados da AWS).

## O que ele cria

| Módulo        | Recursos                                                                  |
| ------------- | ------------------------------------------------------------------------- |
| `network`     | VPC, subnets públicas/privadas em N AZs, IGW, NAT gateway(s), roteamento   |
| `eks`         | Cluster EKS, managed node group, roles IAM, provider OIDC do IRSA          |
| `rds`         | RDS PostgreSQL (criptografado, privado) + security group                   |
| `elasticache` | Replication group do ElastiCache Redis + security group                    |
| `mq`          | Amazon MQ para RabbitMQ (AMQPS) + security group                           |
| `s3`          | Bucket de vídeos (versionado, criptografado, privado) + role IRSA de menor privilégio |
| root          | Entrada no Secrets Manager com as connection strings montadas              |

Os security groups da camada de dados só permitem ingress a partir do security group
do cluster EKS. A policy IAM do S3 é restrita ao único bucket e às service accounts
de api/worker (via IRSA) — sem acesso ao S3 em todo o node, sem wildcards.

## Pré-requisitos

- `terraform >= 1.5`, `awscli`, `kubectl`
- Credenciais AWS com permissão para criar os recursos acima
- Um nome de bucket S3 globalmente único (`videos_bucket_name`)

## Uso

```bash
cd infra/terraform/aws
cp terraform.tfvars.example terraform.tfvars   # then edit

# Secrets via variáveis de ambiente (nunca faça commit delas)
export TF_VAR_db_password='...'
export TF_VAR_mq_password='at-least-12-chars'

terraform init
terraform plan
terraform apply
```

### Faça o deploy do app no cluster

```bash
# 1. Aponte o kubectl para o novo cluster (veja o output kubeconfig_command)
aws eks update-kubeconfig --region <region> --name <cluster>

# 2. Instale o AWS Load Balancer Controller para que o Ingress provisione um ALB
#    (https://kubernetes-sigs.github.io/aws-load-balancer-controller/).

# 3. Aplique os manifests. Na AWS você remove postgres/redis/rabbitmq/minio in-cluster
#    e aponta a config para os endpoints gerenciados (outputs do Terraform); conecte a
#    entrada do Secrets Manager via External Secrets ou o Secrets Store CSI driver,
#    e anote as service accounts de api/worker com s3_irsa_role_arn.
kubectl apply -k ../../k8s/base
```

## Outputs principais

`terraform output` expõe `eks_cluster_name`, `rds_endpoint`,
`redis_endpoint`, `rabbitmq_amqps_endpoint`, `videos_bucket_name`,
`s3_irsa_role_arn` e `app_secret_arn`.

## Notas e premissas

- **Escolha de compute:** EKS (não ECS Fargate) para que os manifests Kubernetes sejam a
  única definição de deploy entre local e AWS.
- O ALB é criado pelo AWS Load Balancer Controller a partir do recurso `Ingress`;
  ele não é gerenciado diretamente no Terraform.
- Os defaults favorecem uma pegada de dev de baixo custo (NAT gateway único, RDS single-AZ,
  Redis/MQ de nó único). Vire `db_multi_az`, `redis_num_nodes`,
  `mq_deployment_mode` e `single_nat_gateway` para HA.
- Nenhum secret é hardcoded: as senhas de DB/MQ vêm de `TF_VAR_*` e as
  connection strings montadas ficam no Secrets Manager (o state ainda é
  sensível — use um backend remoto criptografado, como S3 + locking no DynamoDB).
