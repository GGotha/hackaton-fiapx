variable "name" {
  description = "Name prefix for ElastiCache resources."
  type        = string
}

variable "vpc_id" {
  description = "VPC the cache lives in."
  type        = string
}

variable "subnet_ids" {
  description = "Private subnets for the cache subnet group."
  type        = list(string)
}

variable "ingress_security_group_ids" {
  description = "Security groups allowed to reach Redis on 6379."
  type        = list(string)
}

variable "node_type" {
  description = "ElastiCache node type."
  type        = string
  default     = "cache.t3.small"
}

variable "engine_version" {
  description = "Redis engine version."
  type        = string
  default     = "7.1"
}

variable "num_cache_clusters" {
  description = "Number of nodes (1 = single primary, >1 adds read replicas + failover)."
  type        = number
  default     = 1
}

variable "tags" {
  description = "Tags applied to ElastiCache resources."
  type        = map(string)
  default     = {}
}
