variable "kubeconfig_path" {
  description = "Path to the kubeconfig file for the target cluster."
  type        = string
  default     = "~/.kube/config"
}

variable "kube_context" {
  description = "kubeconfig context to use (minikube's default context is 'minikube')."
  type        = string
  default     = "minikube"
}

variable "kustomize_overlay" {
  description = "Path to the kustomize overlay applied to the cluster, relative to this module."
  type        = string
  default     = "../../k8s/overlays/local"
}

variable "install_ingress_nginx" {
  description = "Install the ingress-nginx controller via Helm. Set false if you use `minikube addons enable ingress` instead."
  type        = bool
  default     = true
}

variable "ingress_nginx_chart_version" {
  description = "ingress-nginx Helm chart version."
  type        = string
  default     = "4.11.3"
}
