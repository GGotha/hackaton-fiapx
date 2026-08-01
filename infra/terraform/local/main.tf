provider "kubernetes" {
  config_path    = var.kubeconfig_path
  config_context = var.kube_context
}

provider "helm" {
  kubernetes {
    config_path    = var.kubeconfig_path
    config_context = var.kube_context
  }
}

locals {
  overlay_path = "${path.module}/${var.kustomize_overlay}"

  # Re-apply whenever any manifest in the overlay or the shared base changes.
  manifest_files = concat(
    tolist(fileset(local.overlay_path, "**")),
    tolist(fileset("${path.module}/../../k8s/base", "**")),
  )
  manifest_fingerprint = sha1(join("", [
    for f in local.manifest_files : filesha1("${local.overlay_path}/${f}")
    if fileexists("${local.overlay_path}/${f}")
  ]))
}

# Ingress controller the app's Ingress routes through. Skip it with
# install_ingress_nginx=false when relying on `minikube addons enable ingress`.
resource "helm_release" "ingress_nginx" {
  count = var.install_ingress_nginx ? 1 : 0

  name             = "ingress-nginx"
  repository       = "https://kubernetes.github.io/ingress-nginx"
  chart            = "ingress-nginx"
  version          = var.ingress_nginx_chart_version
  namespace        = "ingress-nginx"
  create_namespace = true

  set {
    name  = "controller.service.type"
    value = "NodePort"
  }
}

# The app itself is defined once as kustomize manifests (single source of truth
# shared with `kubectl apply -k`); Terraform drives them so `plan/apply/destroy`
# manage the full lifecycle.
resource "terraform_data" "app" {
  triggers_replace = [
    local.manifest_fingerprint,
    var.kube_context,
  ]

  input = {
    overlay = local.overlay_path
    context = var.kube_context
  }

  provisioner "local-exec" {
    command = "kubectl --context ${self.input.context} apply -k ${self.input.overlay}"
  }

  provisioner "local-exec" {
    when    = destroy
    command = "kubectl --context ${self.input.context} delete -k ${self.input.overlay} --ignore-not-found"
  }

  depends_on = [helm_release.ingress_nginx]
}
