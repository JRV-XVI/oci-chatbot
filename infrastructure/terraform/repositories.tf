# ==============================================================================
# repositories.tf
# Recursos de registro de contenedores (OCIR) para publicar imagenes del backend.
# ==============================================================================

# Crea un repositorio de contenedores para el backend de Forgetask
resource "oci_artifacts_container_repository" "forgetask_backend" {
  compartment_id = var.ociCompartmentOcid
  display_name   = "${var.runName}/${var.mtdrKey}/forgetask"
  is_public      = true
}

# Crea un repositorio de contenedores para el frontend de Forgetask
resource "oci_artifacts_container_repository" "forgetask_frontend" {
  compartment_id = var.ociCompartmentOcid
  display_name   = "${var.runName}/${var.mtdrKey}/forgetask-frontend"
  is_public      = true
}