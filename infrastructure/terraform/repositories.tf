# ==============================================================================
# repositories.tf
# Recursos de registro de contenedores (OCIR) para publicar imagenes del backend.
# ==============================================================================

# Crea el repositorio de contenedores de la aplicacion con nombre por entorno.
resource "oci_artifacts_container_repository" todolist {
  #Required
  compartment_id = var.ociCompartmentOcid
  display_name   = "${var.runName}/${var.mtdrKey}/todolistapp-springboot"
  is_public      = true
}