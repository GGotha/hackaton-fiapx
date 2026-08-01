output "endpoint" {
  description = "DocumentDB cluster (writer) endpoint hostname."
  value       = aws_docdb_cluster.this.endpoint
}

output "reader_endpoint" {
  description = "DocumentDB cluster reader endpoint hostname."
  value       = aws_docdb_cluster.this.reader_endpoint
}

output "port" {
  description = "DocumentDB port."
  value       = aws_docdb_cluster.this.port
}

output "security_group_id" {
  description = "Security group guarding the cluster."
  value       = aws_security_group.this.id
}
