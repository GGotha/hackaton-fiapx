output "vpc_id" {
  description = "VPC ID."
  value       = module.network.vpc_id
}

output "private_subnet_ids" {
  description = "Private subnet IDs."
  value       = module.network.private_subnet_ids
}

output "public_subnet_ids" {
  description = "Public subnet IDs."
  value       = module.network.public_subnet_ids
}

output "eks_cluster_name" {
  description = "EKS cluster name."
  value       = module.eks.cluster_name
}

output "eks_cluster_endpoint" {
  description = "EKS API endpoint."
  value       = module.eks.cluster_endpoint
}

output "kubeconfig_command" {
  description = "Command to point kubectl at the cluster."
  value       = "aws eks update-kubeconfig --region ${var.region} --name ${module.eks.cluster_name}"
}

output "rds_endpoint" {
  description = "PostgreSQL endpoint (host)."
  value       = module.rds.address
}

output "redis_endpoint" {
  description = "Redis primary endpoint (host)."
  value       = module.elasticache.primary_endpoint
}

output "rabbitmq_amqps_endpoint" {
  description = "RabbitMQ AMQPS endpoint."
  value       = module.mq.amqps_endpoint
}

output "rabbitmq_console_url" {
  description = "RabbitMQ management console URL."
  value       = module.mq.console_url
}

output "videos_bucket_name" {
  description = "S3 bucket for videos."
  value       = module.s3.bucket_name
}

output "s3_irsa_role_arn" {
  description = "IAM role ARN to annotate on the api/worker service accounts for S3 access."
  value       = module.s3.irsa_role_arn
}

output "app_secret_arn" {
  description = "Secrets Manager ARN holding the runtime connection strings."
  value       = aws_secretsmanager_secret.app.arn
}
