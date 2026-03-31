# ==============================================================================
# availability_domain.tf
# Resolucion del Availability Domain usado por componentes dependientes del OKE.
# ==============================================================================

# Consulta el AD numero 1 del tenancy para ubicar recursos que requieren
# una zona especifica (por ejemplo, configuraciones de node pools).
data "oci_identity_availability_domain" "ad1" {
  compartment_id = var.ociTenancyOcid
  ad_number      = 1
}