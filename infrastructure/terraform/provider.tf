# ==============================================================================
# provider.tf
# Configuracion de Terraform y proveedor OCI para el modulo de infraestructura.
# ==============================================================================

# Define el proveedor requerido y version fijada para reproducibilidad.
terraform {
  required_providers {
    oci = {
      source  = "hashicorp/oci"
      version = "4.42.0"
    }
  }
}

# Configura el proveedor OCI usando la region recibida por variable.
provider "oci" {
  region = var.ociRegionIdentifier
}