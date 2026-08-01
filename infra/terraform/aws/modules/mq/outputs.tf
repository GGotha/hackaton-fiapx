output "amqps_endpoint" {
  description = "AMQPS endpoint (amqps://host:5671) for the broker."
  value       = aws_mq_broker.this.instances[0].endpoints[0]
}

output "console_url" {
  description = "RabbitMQ management console URL."
  value       = aws_mq_broker.this.instances[0].console_url
}

output "security_group_id" {
  description = "Security group guarding the broker."
  value       = aws_security_group.this.id
}
