variable "name" {
  description = "Name prefix for RDS resources."
  type        = string
}

variable "vpc_id" {
  description = "VPC the database lives in."
  type        = string
}

variable "subnet_ids" {
  description = "Private subnets for the DB subnet group."
  type        = list(string)
}

variable "ingress_security_group_ids" {
  description = "Security groups allowed to reach Postgres on 5432."
  type        = list(string)
}

variable "db_name" {
  description = "Initial database name."
  type        = string
  default     = "fiapx"
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
  description = "PostgreSQL engine version."
  type        = string
  default     = "16.4"
}

variable "instance_class" {
  description = "RDS instance class."
  type        = string
  default     = "db.t3.medium"
}

variable "allocated_storage" {
  description = "Allocated storage (GiB)."
  type        = number
  default     = 20
}

variable "max_allocated_storage" {
  description = "Upper bound for storage autoscaling (GiB)."
  type        = number
  default     = 100
}

variable "multi_az" {
  description = "Deploy a standby in a second AZ."
  type        = bool
  default     = false
}

variable "backup_retention_period" {
  description = "Days of automated backups to keep."
  type        = number
  default     = 7
}

variable "deletion_protection" {
  description = "Block accidental deletion of the instance."
  type        = bool
  default     = false
}

variable "skip_final_snapshot" {
  description = "Skip the final snapshot on destroy."
  type        = bool
  default     = true
}

variable "tags" {
  description = "Tags applied to RDS resources."
  type        = map(string)
  default     = {}
}
