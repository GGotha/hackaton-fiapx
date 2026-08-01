variable "name" {
  description = "Name prefix for DocumentDB resources."
  type        = string
}

variable "vpc_id" {
  description = "VPC the cluster lives in."
  type        = string
}

variable "subnet_ids" {
  description = "Private subnets for the DocumentDB subnet group."
  type        = list(string)
}

variable "ingress_security_group_ids" {
  description = "Security groups allowed to reach DocumentDB on 27017."
  type        = list(string)
}

variable "username" {
  description = "Master username."
  type        = string
  default     = "fiapx"
}

variable "password" {
  description = "Master password."
  type        = string
  sensitive   = true
}

variable "engine_version" {
  description = "DocumentDB (MongoDB-compatible) engine version."
  type        = string
  default     = "5.0.0"
}

variable "instance_class" {
  description = "DocumentDB instance class."
  type        = string
  default     = "db.t3.medium"
}

variable "instance_count" {
  description = "Number of cluster instances (1 = single primary; >1 adds read replicas / failover)."
  type        = number
  default     = 1
}

variable "backup_retention_period" {
  description = "Days of automated backups to keep."
  type        = number
  default     = 7
}

variable "deletion_protection" {
  description = "Block accidental deletion of the cluster."
  type        = bool
  default     = false
}

variable "skip_final_snapshot" {
  description = "Skip the final snapshot on destroy."
  type        = bool
  default     = true
}

variable "tags" {
  description = "Tags applied to DocumentDB resources."
  type        = map(string)
  default     = {}
}
