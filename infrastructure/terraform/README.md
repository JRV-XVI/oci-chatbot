# Terraform OCI - Documentacion Tecnica para Developers

Este directorio contiene el modulo Terraform que aprovisiona infraestructura base en OCI para ejecutar Forgetask en OKE.

El flujo normal de uso es indirecto: se invoca desde scripts en [../scripts](../scripts), especialmente [../scripts/utils/terraform.sh](../scripts/utils/terraform.sh), y no suele ejecutarse manualmente salvo para desarrollo, debug o mantenimiento.

## Estado Actual del Modulo

- La red (VCN, subnets, gateways, security lists) esta activa y definida en [core.tf](core.tf).
- El cluster OKE y node pool estan activos y definidos en [containerengine.tf](containerengine.tf).
- El bucket de Object Storage esta activo y definido en [object_storage.tf](object_storage.tf).
- Los repositorios OCIR de backend y frontend estan activos y definidos en [repositories.tf](repositories.tf).
- La base de datos esta deshabilitada en este modulo: el archivo existe como [database.tf.disabled](database.tf.disabled) y Terraform no lo carga por extension.
- API Gateway no se crea: [apigateway.tf](apigateway.tf) solo conserva referencia historica comentada.

## Estructura de Archivos y Responsabilidad

| Archivo | Rol actual | Recursos principales |
| --- | --- | --- |
| [provider.tf](provider.tf) | Configura Terraform y provider OCI | `required_providers`, `provider oci` |
| [main-var.tf](main-var.tf) | Declara variables de entrada obligatorias | 7 variables de despliegue |
| [availability_domain.tf](availability_domain.tf) | Resuelve AD1 dinamicamente | `data oci_identity_availability_domain.ad1` |
| [core.tf](core.tf) | Capa de red OCI para OKE | VCN, IGW, NGW, SGW, route tables, 3 subnets, security lists |
| [containerengine.tf](containerengine.tf) | Capa Kubernetes gestionada | `oci_containerengine_cluster`, `oci_containerengine_node_pool`, datasources de opciones |
| [object_storage.tf](object_storage.tf) | Storage para artefactos | namespace + bucket |
| [repositories.tf](repositories.tf) | Registro de imagenes en OCIR | 2 repos publicos (`forgetask`, `forgetask-frontend`) |
| [outputs.tf](outputs.tf) | Salidas consumidas por setup | `lab_oke_cluster_id` |
| [database.tf.disabled](database.tf.disabled) | Referencia historica de ATP | No aplicado por Terraform |
| [apigateway.tf](apigateway.tf) | Referencia historica de API Gateway | No aplicado (todo comentado) |

## Que Hace Cada Archivo (Detalle)

### [provider.tf](provider.tf)

- Fija el provider OCI en version `4.42.0`.
- Configura la region con `var.ociRegionIdentifier`.

Impacto: garantiza reproducibilidad del provider y evita cambios inesperados por upgrades automaticos.

### [main-var.tf](main-var.tf)

Declara variables requeridas:

- `ociTenancyOcid`
- `ociUserOcid`
- `ociCompartmentOcid`
- `ociRegionIdentifier`
- `mtdrDbName`
- `runName`
- `mtdrKey`

Notas:

- Aunque `ociUserOcid` no se usa directamente en recursos Terraform de este modulo, sigue siendo requerido por contrato de entrada.
- Aunque la base este deshabilitada, `mtdrDbName` sigue siendo variable obligatoria en el estado actual.

### [availability_domain.tf](availability_domain.tf)

- Consulta el AD numero 1 del tenancy (`ad_number = 1`).
- Expone `data.oci_identity_availability_domain.ad1.name`, utilizado por el node pool en [containerengine.tf](containerengine.tf).

Impacto: evita hardcodear nombres de AD especificos de region.

### [core.tf](core.tf)

Construye la topologia de red para OKE.

Recursos y funcion:

- `oci_core_vcn.okevcn`: VCN `10.0.0.0/16`.
- `oci_core_internet_gateway.igw`: salida/entrada internet para subnets publicas.
- `oci_core_nat_gateway.ngw`: salida internet para subnet privada de nodos.
- `oci_core_service_gateway.sgw`: acceso privado a Oracle Services Network.
- `oci_core_route_table.private`: rutas privadas a NGW y SGW.
- `oci_core_default_route_table.public`: ruta por defecto `0.0.0.0/0` a IGW.
- `oci_core_subnet.endpoint` (`10.0.0.0/28`, publica): endpoint del control plane.
- `oci_core_subnet.nodePool_Subnet` (`10.0.10.0/24`, privada): workers OKE.
- `oci_core_subnet.svclb_Subnet` (`10.0.20.0/24`, publica): load balancers de servicios.
- `oci_core_security_list.endpoint`, `oci_core_security_list.nodePool`, `oci_core_security_list.svclb_sl`: reglas de trafico entre control plane, workers, servicios OCI e internet.
- `data.oci_core_services.services`: obtiene CIDR de servicios OCI para SGW/reglas.

Observaciones de seguridad importantes:

- Hay reglas amplias desde/hacia `0.0.0.0/0` en varias security lists.
- En `nodePool`, SSH `22/tcp` esta abierto a `0.0.0.0/0`.

### [containerengine.tf](containerengine.tf)

Define el plano Kubernetes gestionado.

Cluster:

- `oci_containerengine_cluster.mtdrworkshop_cluster`.
- Version Kubernetes: `v1.34.2`.
- Endpoint publico habilitado (`is_public_ip_enabled = "true"`).
- Subnet endpoint: `endpoint`.
- Subnet para Service LB: `svclb_Subnet`.
- CIDRs: pods `10.244.0.0/16`, services `10.96.0.0/16`.

Node pool:

- `oci_containerengine_node_pool.oke_node_pool`.
- Shape: `VM.Standard.E3.Flex`.
- Capacidad por nodo: `2` OCPUs y `6` GB RAM.
- Tamano de pool: `3` nodos.
- AD: usa `data.oci_identity_availability_domain.ad1.name`.
- Imagen: seleccion dinamica de Oracle Linux via regex sobre `data oci_containerengine_node_pool_option`.

Consideraciones:

- Incluye una `ssh_public_key` hardcodeada en el archivo.
- Existen comentarios de opcion ARM (`VM.Standard.A1.Flex`) pero no esta activa.

### [object_storage.tf](object_storage.tf)

- Consulta namespace del compartment (`data oci_objectstorage_namespace.test_namespace`).
- Crea bucket `oci_objectstorage_bucket.dbbucket` con nombre `${var.runName}-${var.mtdrKey}`.

Impacto: bucket util para artefactos y flujos auxiliares del entorno.

### [repositories.tf](repositories.tf)

Crea dos repositorios publicos en OCIR:

- `oci_artifacts_container_repository.forgetask_backend`
  - Nombre: `${var.runName}/${var.mtdrKey}/forgetask`
- `oci_artifacts_container_repository.forgetask_frontend`
  - Nombre: `${var.runName}/${var.mtdrKey}/forgetask-frontend`

Impacto: separa imagenes backend/frontend y simplifica pull desde OKE al ser repos publicos (`is_public = true`).

### [outputs.tf](outputs.tf)

Expone:

- `lab_oke_cluster_id`: OCID del cluster OKE.

Este output es clave para scripts de setup que generan kubeconfig y conectan `kubectl` al cluster correcto.

### [database.tf.disabled](database.tf.disabled)

Contiene definicion historica de ATP:

- Variables auxiliares de workload/licenciamiento.
- Recursos `random_string` y `random_password`.
- Recurso `oci_database_autonomous_database` (Free Tier).
- Data source de ATP y namespace.
- Outputs legacy asociados.

Estado actual: no forma parte del plan/apply porque no tiene extension `.tf`.

### [apigateway.tf](apigateway.tf)

- No crea recursos.
- Mantiene comentada una antigua definicion de `oci_apigateway_gateway`.

Estado actual: referencia historica.

## Flujo de Provisioning

### Ejecucion recomendada (automatizada)

Desde la raiz del repo:

```bash
source infrastructure/scripts/env.sh
source infrastructure/scripts/setup.sh
```

Que ocurre por debajo:

- `setup.sh` orquesta el flujo de aprovisionamiento.
- `utils/terraform.sh` exporta variables `TF_VAR_*`, ejecuta `terraform init` y `terraform apply -auto-approve` dentro de [../terraform](../terraform).

### Ejecucion manual (debug)

```bash
cd infrastructure/terraform
terraform init
terraform plan
terraform apply
```

En ejecucion manual debes proveer todas las variables requeridas (`TF_VAR_*` o `terraform.tfvars`).

## Salidas y Verificacion Rapida

Comandos utiles:

```bash
cd infrastructure/terraform
terraform output
terraform output lab_oke_cluster_id
terraform state list
```

Esperado en estado actual:

- Deben aparecer recursos de red, OKE, Object Storage y OCIR.
- No deben aparecer recursos de ATP ni API Gateway.

## Notas de Mantenimiento

- Si se reactiva base de datos, renombrar [database.tf.disabled](database.tf.disabled) a `database.tf` y validar limites de servicio en OCI.
- Si se requiere acceso privado al endpoint de Kubernetes, ajustar `is_public_ip_enabled` en [containerengine.tf](containerengine.tf).
- Revisar reglas abiertas de [core.tf](core.tf) antes de mover este modulo a entornos no workshop.
- Evaluar mover la `ssh_public_key` hardcodeada a variable sensible.