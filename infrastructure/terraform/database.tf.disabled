# ==============================================================================
# database.tf
# Recursos de base de datos para el workshop: ATP, auxiliares de password y outputs.
# ==============================================================================

# Tipo de workload de la Autonomous Database.
variable "autonomous_database_db_workload" {
  type        = string
  description = "Tipo de workload para ATP; por defecto OLTP."
  default     = "OLTP"
}

# Valor de tags definidos para escenarios donde se habilite tagging corporativo.
variable "autonomous_database_defined_tags_value" {
  type        = string
  description = "Valor de tags definidos para recursos de base de datos."
  default     = "value"
}

# Modelo de licenciamiento para Autonomous Database.
variable "autonomous_database_license_model" {
  type        = string
  description = "Modelo de licencia de ATP; se conserva para compatibilidad del modulo."
  default     = "BRING_YOUR_OWN_LICENSE"
}

# Indica si la base se despliega en infraestructura dedicada.
variable "autonomous_database_is_dedicated" {
  type        = bool
  description = "Bandera para despliegue dedicado de ATP; por defecto deshabilitado."
  default     = false
}

# Genera password aleatorio para wallet (recurso auxiliar conservado en el modulo).
resource "random_string" "autonomous_database_wallet_password" {
  length  = 16
  special = true
}

# Genera password aleatorio para la cuenta admin de ATP.
resource "random_password" "database_admin_password" {
  length      = 12
  upper       = true
  lower       = true
  numeric     = true
  special     = false
  min_lower   = "1"
  min_upper   = "1"
  min_numeric = "1"
}

# Crea la Autonomous Transaction Processing (ATP) en modalidad Free Tier.
resource "oci_database_autonomous_database" "autonomous_database_atp" {
  #Required
  admin_password           = random_password.database_admin_password.result
  compartment_id           = var.ociCompartmentOcid
  cpu_core_count           = "1"
  data_storage_size_in_tbs = "1"
  db_name                  = var.mtdrDbName
  # is_free_tier = true , if there exists sufficient service limit
  is_free_tier             = true
  #Optional #db_workload = "${var.autonomous_database_db_workload}"
  db_workload                                    = var.autonomous_database_db_workload
  display_name                                   = "MTDRDB"
  is_auto_scaling_enabled                        = "false"
  is_preview_version_with_service_terms_accepted = "false"
}

# Consulta bases ATP por nombre de despliegue para integraciones posteriores.
data "oci_database_autonomous_databases" "autonomous_databases_atp" {
  #Required
  compartment_id = var.ociCompartmentOcid
  #Optional
  display_name = "MTDRDB"
  db_workload  = var.autonomous_database_db_workload
}

# Obtiene el namespace de Object Storage usado por procesos auxiliares.
data "oci_objectstorage_namespace" "test_namespace" {
  #Optional
  compartment_id = var.ociCompartmentOcid
}

# Expone el namespace de Object Storage resuelto para el entorno actual.
output "ns_objectstorage_namespace" {
  description = "Namespace de Object Storage del compartment activo."
  value       = [data.oci_objectstorage_namespace.test_namespace.namespace]
}

# Expone una referencia de password administrativa usada por scripts legacy.
output "autonomous_database_admin_password" {
  description = "Password administrativa de referencia para flujos heredados de automatizacion."
  value       = ["Welcome12345"]
}