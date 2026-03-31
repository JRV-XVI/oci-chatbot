# ==============================================================================
# containerengine.tf
# Recursos de Oracle Kubernetes Engine (OKE): cluster, node pool y opciones.
# ==============================================================================

# Crea el cluster OKE principal asociado a la VCN y subredes definidas en red.
resource "oci_containerengine_cluster" "mtdrworkshop_cluster" {
  #Required
  compartment_id = var.ociCompartmentOcid

  endpoint_config {
    #Optional
    is_public_ip_enabled = "true"
    nsg_ids              = []
    subnet_id            = oci_core_subnet.endpoint.id
  }

  kubernetes_version = "v1.34.2"
  name               = "mtdrworkshopcluster-${var.mtdrKey}"
  vcn_id             = oci_core_vcn.okevcn.id

  options {
    service_lb_subnet_ids = [oci_core_subnet.svclb_Subnet.id]

    add_ons {
      #Optional
      is_kubernetes_dashboard_enabled = "false"
      is_tiller_enabled               = "false"
    }

    admission_controller_options {
      #Optional
      is_pod_security_policy_enabled = "false"
    }

    kubernetes_network_config {
      #Optional
      pods_cidr     = "10.244.0.0/16"
      services_cidr = "10.96.0.0/16"
    }
  }
}

# Crea el node pool de workers donde se desplegaran los workloads del cluster.
resource "oci_containerengine_node_pool" "oke_node_pool" {
  #Required
  cluster_id         = oci_containerengine_cluster.mtdrworkshop_cluster.id
  compartment_id     = var.ociCompartmentOcid
  kubernetes_version = "v1.34.2"
  name               = "Pool"
  #node_shape        = "VM.Standard.A1.Flex"  #Always Free Option
  node_shape         = "VM.Standard.E3.Flex"

  # Opcion alternativa (Always Free) conservada como referencia:
  # node_shape = "VM.Standard.A1.Flex"

  node_shape_config {
    memory_in_gbs = 6
    ocpus         = 2
  }
  #subnet_ids         = [oci_core_subnet.nodePool_Subnet_1.id]
  #Optional
  node_config_details {
    placement_configs {
      availability_domain = data.oci_identity_availability_domain.ad1.name
      subnet_id           = oci_core_subnet.nodePool_Subnet.id
    }

    # Opciones para distribuir nodos en multiples AD (referencia historica):
    # placement_configs {
    #   availability_domain = data.oci_identity_availability_domain.ad2.name
    #   subnet_id           = oci_core_subnet.nodePool_Subnet.id
    # }
    # placement_configs {
    #   availability_domain = data.oci_identity_availability_domain.ad3.name
    #   subnet_id           = oci_core_subnet.nodePool_Subnet.id
    # }

    size = "3"
  }

  node_source_details {
    #Required
    image_id    = local.oracle_linux_images.0 # Latest
    source_type = "IMAGE"

    #Optional
    # Opcion de tamano de boot volume (desactivada por defecto):
    # boot_volume_size_in_gbs = "60"
  }

  # Opcion alternativa de clave SSH por variable:
  # ssh_public_key = var.resUserPublicKey
  ssh_public_key = "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQCsXyGATqdTnvEDe0aYHGL+QQDjUXf6EIBlKiNLYR4gZhStp4yfn/MEWmCMGg3cbne04HlaeO3zGrUnrtfAQE90XccW9Dc4WkhLYf2vucja9NezAVQZE2qBYiwdZSF9G/FwPI1DzfbXF2UAAN3ix/IwJSWN3KZnd1FOcHOA052QMa7jGOIbi8+skKqkys3gcTaor7eXe/wONimkpPevF30FTQZpsQFU7ZzYcFM3C+XVZ2/UVtZ/MaDf73ub6mYNMpDtDCTMo9FyujzK84EKWIytAKofNwJ/Og3Wqr+CKAeLgCMtWp0926w+ff8dJRDuOxlxgJB48YaFSvjIr4lAv/aX rafael_a_g@6ab23190fb98"
}

# Consulta todas las opciones de cluster disponibles en la region activa.
data "oci_containerengine_cluster_option" "mtdrworkshop_cluster_option" {
  cluster_option_id = "all"
}

# Consulta todas las opciones de node pool para derivar imagenes compatibles.
data "oci_containerengine_node_pool_option" "mtdrworkshop_node_pool_option" {
  node_pool_option_id = "all"
}

# Selecciona dinamicamente la ultima imagen Oracle Linux compatible para nodos.
locals {
  all_sources = data.oci_containerengine_node_pool_option.mtdrworkshop_node_pool_option.sources

  # Opcion ARM conservada como referencia historica:
  # oracle_linux_images = [for source in local.all_sources : source.image_id if length(regexall("Oracle-Linux-[0-9]*.[0-9]*-aarch64-20[0-9]*", source.source_name)) > 0]
  oracle_linux_images = [for source in local.all_sources : source.image_id if length(regexall("Oracle-Linux-[0-9]*.[0-9]*-20[0-9]*", source.source_name)) > 0]
}
