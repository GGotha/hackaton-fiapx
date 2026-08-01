variable "name" {
  description = "Name prefix for the broker."
  type        = string
}

variable "vpc_id" {
  description = "VPC the broker lives in."
  type        = string
}

variable "subnet_ids" {
  description = "Private subnets. SINGLE_INSTANCE uses one; CLUSTER_MULTI_AZ uses two."
  type        = list(string)
}

variable "ingress_security_group_ids" {
  description = "Security groups allowed to reach the broker (AMQPS 5671, management 443)."
  type        = list(string)
}

variable "username" {
  description = "RabbitMQ admin username."
  type        = string
  default     = "fiapx"
}

variable "password" {
  description = "RabbitMQ admin password (min 12 chars, no commas)."
  type        = string
  sensitive   = true
}

variable "engine_version" {
  description = "RabbitMQ engine version."
  type        = string
  default     = "3.13"
}

variable "host_instance_type" {
  description = "Broker instance type."
  type        = string
  default     = "mq.t3.micro"
}

variable "deployment_mode" {
  description = "SINGLE_INSTANCE or CLUSTER_MULTI_AZ."
  type        = string
  default     = "SINGLE_INSTANCE"
}

variable "tags" {
  description = "Tags applied to the broker."
  type        = map(string)
  default     = {}
}
