# ==============================================================================
# main-var.tf
# Variables de entrada del modulo Terraform para OCI.
# Define identidad OCI, alcance de despliegue y convenciones de naming.
# ==============================================================================

# Copyright (c) 2022 Oracle and/or its affiliates.
# Licensed under the Universal Permissive License v 1.0 as shown at https://oss.oracle.com/licenses/upl.

variable "ociTenancyOcid" {
	type        = string
	description = "OCID del tenancy OCI propietario de los recursos y dominios de disponibilidad."
}

variable "ociUserOcid" {
	type        = string
	description = "OCID del usuario OCI que ejecuta operaciones del workshop."
}

variable "ociCompartmentOcid" {
	type        = string
	description = "OCID del compartment OCI donde se crearan los recursos del despliegue."
}

variable "ociRegionIdentifier" {
	type        = string
	description = "Region OCI donde se aprovisionara la infraestructura (por ejemplo, us-ashburn-1)."
}

variable "mtdrDbName" {
	type        = string
	description = "Nombre de la Autonomous Database usada por la solucion MTDR."
}

variable "runName" {
	type        = string
	description = "Prefijo logico para nombrar recursos del run o entorno actual."
}

variable "mtdrKey" {
	type        = string
	description = "Clave unica generada para evitar colisiones de nombres entre despliegues."
}