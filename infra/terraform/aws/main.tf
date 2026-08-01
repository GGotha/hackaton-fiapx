data "aws_availability_zones" "available" {
  state = "available"
}

locals {
  name = "${var.project}-${var.environment}"

  tags = merge(var.tags, {
    Project     = var.project
    Environment = var.environment
    ManagedBy   = "terraform"
  })

  azs = slice(data.aws_availability_zones.available.names, 0, var.az_count)

  # Subnet tags the AWS Load Balancer Controller uses to place ALBs.
  public_subnet_tags = {
    "kubernetes.io/role/elb"              = "1"
    "kubernetes.io/cluster/${local.name}" = "shared"
  }
  private_subnet_tags = {
    "kubernetes.io/role/internal-elb"     = "1"
    "kubernetes.io/cluster/${local.name}" = "shared"
  }
}

module "network" {
  source = "./modules/network"

  name               = local.name
  cidr_block         = var.vpc_cidr
  azs                = local.azs
  single_nat_gateway = var.single_nat_gateway

  public_subnet_tags  = local.public_subnet_tags
  private_subnet_tags = local.private_subnet_tags
  tags                = local.tags
}

module "eks" {
  source = "./modules/eks"

  name               = local.name
  kubernetes_version = var.eks_version
  private_subnet_ids = module.network.private_subnet_ids
  public_subnet_ids  = module.network.public_subnet_ids

  node_instance_types = var.node_instance_types
  node_desired_size   = var.node_desired_size
  node_min_size       = var.node_min_size
  node_max_size       = var.node_max_size

  tags = local.tags
}

module "rds" {
  source = "./modules/rds"

  name       = local.name
  vpc_id     = module.network.vpc_id
  subnet_ids = module.network.private_subnet_ids

  ingress_security_group_ids = [module.eks.cluster_security_group_id]

  db_name           = var.db_name
  username          = var.db_username
  password          = var.db_password
  engine_version    = var.db_engine_version
  instance_class    = var.db_instance_class
  allocated_storage = var.db_allocated_storage
  multi_az          = var.db_multi_az

  tags = local.tags
}

module "documentdb" {
  source = "./modules/documentdb"

  name       = local.name
  vpc_id     = module.network.vpc_id
  subnet_ids = module.network.private_subnet_ids

  ingress_security_group_ids = [module.eks.cluster_security_group_id]

  username       = var.docdb_username
  password       = var.docdb_password
  engine_version = var.docdb_engine_version
  instance_class = var.docdb_instance_class
  instance_count = var.docdb_instance_count

  tags = local.tags
}

module "elasticache" {
  source = "./modules/elasticache"

  name       = local.name
  vpc_id     = module.network.vpc_id
  subnet_ids = module.network.private_subnet_ids

  ingress_security_group_ids = [module.eks.cluster_security_group_id]

  node_type          = var.redis_node_type
  engine_version     = var.redis_engine_version
  num_cache_clusters = var.redis_num_nodes

  tags = local.tags
}

module "mq" {
  source = "./modules/mq"

  name       = local.name
  vpc_id     = module.network.vpc_id
  subnet_ids = module.network.private_subnet_ids

  ingress_security_group_ids = [module.eks.cluster_security_group_id]

  username           = var.mq_username
  password           = var.mq_password
  host_instance_type = var.mq_instance_type
  deployment_mode    = var.mq_deployment_mode

  tags = local.tags
}

module "s3" {
  source = "./modules/s3"

  name          = local.name
  bucket_name   = var.videos_bucket_name
  force_destroy = var.s3_force_destroy

  oidc_provider_arn = module.eks.oidc_provider_arn
  oidc_provider_url = module.eks.oidc_provider_url

  tags = local.tags
}

# Connection strings the in-cluster workloads consume (e.g. via the External
# Secrets Operator or the Secrets Store CSI driver). Values are assembled from
# module outputs so nothing is hardcoded.
resource "aws_secretsmanager_secret" "app" {
  name        = "${local.name}/app"
  description = "FIAP X runtime connection strings and credentials"
  tags        = local.tags
}

resource "aws_secretsmanager_secret_version" "app" {
  secret_id = aws_secretsmanager_secret.app.id
  secret_string = jsonencode({
    DATABASE_URL = "postgres://${var.db_username}:${var.db_password}@${module.rds.address}:${module.rds.port}/${module.rds.db_name}"
    # DocumentDB enforces TLS and does not support retryable writes, so the auth
    # service's driver needs tls=true&retryWrites=false. The auth db (fiapx_auth)
    # is created lazily on first write; the master user authenticates via admin.
    MONGODB_URI      = "mongodb://${var.docdb_username}:${var.docdb_password}@${module.documentdb.endpoint}:${module.documentdb.port}/${var.docdb_auth_database}?authSource=admin&tls=true&retryWrites=false"
    REDIS_URL        = "redis://${module.elasticache.primary_endpoint}:${module.elasticache.port}"
    RABBITMQ_URL     = replace(module.mq.amqps_endpoint, "amqps://", "amqps://${var.mq_username}:${var.mq_password}@")
    S3_BUCKET_VIDEOS = module.s3.bucket_name
    S3_REGION        = var.region
  })
}
