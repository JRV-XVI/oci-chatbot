# ==============================================================================
# outputs.tf
# Salidas del modulo Terraform consumidas por scripts de setup y operacion.
# ==============================================================================

output "lab_oke_cluster_id" {
  description = "OCID del cluster OKE usado por el flujo de setup para configuracion operativa."
  value       = oci_containerengine_cluster.mtdrworkshop_cluster.id
}