# ==============================================================================
# object_storage.tf
# Recursos de Object Storage para el workshop: namespace y bucket de artefactos.
# ==============================================================================

# Obtiene el namespace de Object Storage del compartment objetivo.
data "oci_objectstorage_namespace" "namespace" {
  #Required
  compartment_id = var.ociCompartmentOcid
}

# Crea el bucket principal con nombre derivado del run y la clave unica.
resource "oci_objectstorage_bucket" "dbbucket" {
  namespace      = data.oci_objectstorage_namespace.test_namespace.namespace
  compartment_id = var.ociCompartmentOcid
  name           = "${var.runName}-${var.mtdrKey}"
}