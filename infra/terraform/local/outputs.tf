output "namespace" {
  description = "Namespace the platform is deployed into."
  value       = "fiapx"
}

output "ingress_hosts" {
  description = "Hostnames served by the ingress. Map them to the minikube IP in /etc/hosts."
  value = {
    frontend = "http://fiapx.local"
    api      = "http://api.fiapx.local"
    auth     = "http://auth.fiapx.local"
  }
}

output "post_apply_hint" {
  description = "How to wire up local DNS once applied."
  value       = "Run `minikube ip`, then add `<ip> fiapx.local api.fiapx.local auth.fiapx.local` to /etc/hosts."
}
