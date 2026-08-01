output "primary_endpoint" {
  description = "Primary endpoint hostname for the Redis replication group."
  value       = aws_elasticache_replication_group.this.primary_endpoint_address
}

output "port" {
  description = "Redis port."
  value       = 6379
}

output "security_group_id" {
  description = "Security group guarding Redis."
  value       = aws_security_group.this.id
}
