variable "project" {
  description = "Project name, used as a prefix for resource names."
  type        = string
  default     = "fiapx"
}

variable "environment" {
  description = "Deployment environment (e.g. dev, staging, prod)."
  type        = string
  default     = "dev"
}

variable "region" {
  description = "AWS region."
  type        = string
  default     = "us-east-1"
}

variable "tags" {
  description = "Extra tags merged onto every resource."
  type        = map(string)
  default     = {}
}

# ---- Network ----
variable "vpc_cidr" {
  description = "CIDR block for the VPC."
  type        = string
  default     = "10.0.0.0/16"
}

variable "az_count" {
  description = "Number of availability zones to spread across."
  type        = number
  default     = 2
}

variable "single_nat_gateway" {
  description = "Use a single NAT gateway (cheaper, non-HA)."
  type        = bool
  default     = true
}

# ---- EKS ----
variable "eks_version" {
  description = "Kubernetes control-plane version."
  type        = string
  default     = "1.30"
}

variable "node_instance_types" {
  description = "Instance types for the EKS managed node group."
  type        = list(string)
  default     = ["t3.large"]
}

variable "node_desired_size" {
  description = "Desired worker node count."
  type        = number
  default     = 2
}

variable "node_min_size" {
  description = "Minimum worker node count."
  type        = number
  default     = 2
}

variable "node_max_size" {
  description = "Maximum worker node count."
  type        = number
  default     = 5
}

# ---- RDS (PostgreSQL) ----
variable "db_name" {
  description = "Initial database name."
  type        = string
  default     = "fiapx"
}

variable "db_username" {
  description = "RDS master username."
  type        = string
  default     = "fiapx"
}

variable "db_password" {
  description = "RDS master password. Provide via TF_VAR_db_password or a gitignored tfvars file."
  type        = string
  sensitive   = true
}

variable "db_instance_class" {
  description = "RDS instance class."
  type        = string
  default     = "db.t3.medium"
}

variable "db_engine_version" {
  description = "PostgreSQL engine version."
  type        = string
  default     = "16.4"
}

variable "db_allocated_storage" {
  description = "RDS allocated storage (GiB)."
  type        = number
  default     = 20
}

variable "db_multi_az" {
  description = "Deploy an RDS standby in a second AZ."
  type        = bool
  default     = false
}

# ---- ElastiCache (Redis) ----
variable "redis_node_type" {
  description = "ElastiCache node type."
  type        = string
  default     = "cache.t3.small"
}

variable "redis_engine_version" {
  description = "Redis engine version."
  type        = string
  default     = "7.1"
}

variable "redis_num_nodes" {
  description = "Redis node count (1 = single primary; >1 enables failover)."
  type        = number
  default     = 1
}

# ---- Amazon MQ (RabbitMQ) ----
variable "mq_username" {
  description = "RabbitMQ admin username."
  type        = string
  default     = "fiapx"
}

variable "mq_password" {
  description = "RabbitMQ admin password (min 12 chars). Provide via TF_VAR_mq_password or a gitignored tfvars file."
  type        = string
  sensitive   = true

  validation {
    condition     = length(var.mq_password) >= 12
    error_message = "Amazon MQ requires a password of at least 12 characters."
  }
}

variable "mq_instance_type" {
  description = "Amazon MQ broker instance type."
  type        = string
  default     = "mq.t3.micro"
}

variable "mq_deployment_mode" {
  description = "SINGLE_INSTANCE or CLUSTER_MULTI_AZ."
  type        = string
  default     = "SINGLE_INSTANCE"
}

# ---- S3 ----
variable "videos_bucket_name" {
  description = "Globally-unique bucket name for uploaded videos and generated zips."
  type        = string
}

variable "s3_force_destroy" {
  description = "Allow destroying a non-empty videos bucket."
  type        = bool
  default     = false
}
