variable "name" {
  description = "Name prefix for S3/IAM resources."
  type        = string
}

variable "bucket_name" {
  description = "Globally-unique bucket name for uploaded videos and zips."
  type        = string
}

variable "force_destroy" {
  description = "Allow deleting a non-empty bucket on destroy."
  type        = bool
  default     = false
}

variable "oidc_provider_arn" {
  description = "EKS IAM OIDC provider ARN (from the eks module)."
  type        = string
}

variable "oidc_provider_url" {
  description = "EKS IAM OIDC provider URL without scheme (from the eks module)."
  type        = string
}

variable "service_account_namespace" {
  description = "Namespace of the Kubernetes service account granted S3 access."
  type        = string
  default     = "fiapx"
}

variable "service_account_names" {
  description = "Service accounts (in service_account_namespace) allowed to assume the S3 role."
  type        = list(string)
  default     = ["api", "worker"]
}

variable "tags" {
  description = "Tags applied to S3/IAM resources."
  type        = map(string)
  default     = {}
}
