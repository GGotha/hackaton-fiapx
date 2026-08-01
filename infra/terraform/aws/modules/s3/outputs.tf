output "bucket_name" {
  description = "Name of the videos bucket."
  value       = aws_s3_bucket.videos.bucket
}

output "bucket_arn" {
  description = "ARN of the videos bucket."
  value       = aws_s3_bucket.videos.arn
}

output "irsa_role_arn" {
  description = "IAM role ARN to annotate on the api/worker service accounts (eks.amazonaws.com/role-arn)."
  value       = aws_iam_role.s3_access.arn
}

output "policy_arn" {
  description = "ARN of the least-privilege S3 access policy."
  value       = aws_iam_policy.s3_access.arn
}
