# Terraform — Infraestructura OCI

Este directorio contiene toda la **Infraestructura como Código (IaC)** necesaria para aprovisionar de forma automatizada y reproducible los recursos en Oracle Cloud Infrastructure (OCI) que soportan la aplicación **Software Manager Tool**.

Con un único comando (`terraform apply`), se crea desde cero: la red virtual completa, el clúster de Kubernetes, la base de datos autónoma, el almacenamiento de objetos y el registro de contenedores Docker. Esto elimina la configuración manual en la consola de OCI y garantiza entornos idénticos en cada despliegue.

> 📖 Este directorio es invocado automáticamente por [`../scripts/utils/terraform.sh`](../scripts/utils/terraform.sh) durante el proceso de `source setup.sh`. No es necesario ejecutarlo manualmente salvo para desarrollo o depuración.

---

## 📁 Archivos en Este Directorio
```
terraform/
├── provider.tf ← Configuración del proveedor OCI + versión de Terraform
├── main-var.tf ← Variables de entrada requeridas
├── availability_domain.tf← Consulta el Availability Domain físico
├── core.tf ← Red completa: VCN, gateways, subnets, firewalls
├── containerengine.tf ← Clúster Kubernetes (OKE) y Node Pool
├── database.tf ← Oracle Autonomous Database (ATP)
├── object_storage.tf ← Bucket de Object Storage
├── repositories.tf ← Repositorio de imágenes Docker (Container Registry)
├── outputs.tf ← Valores de salida exportados tras el apply
└── apigateway.tf ← (Deshabilitado) API Gateway — referencia histórica
```

---


## Uso

### Ejecución automática (recomendado)
El script `setup.sh` del proyecto llama a Terraform automáticamente. No es necesario ejecutarlo manualmente:
```bash
# Desde la raíz del proyecto
source infraestructura/scripts/env.sh
source infraestructura/scripts/setup.sh
```
---

## 🗺️ Arquitectura que Se Aprovisiona
```
OCI Compartment
│
├── VCN (10.0.0.0/16) ─ core.tf
│ ├── Internet Gateway → tráfico público entrante/saliente
│ ├── NAT Gateway → salida a internet para nodos privados
│ ├── Service Gateway → acceso interno a servicios de OCI
│ │
│ ├── Subnet endpoint (10.0.0.0/28) PUBLIC → API Server K8s (puerto 6443)
│ ├── Subnet nodePool (10.0.10.0/24) PRIVATE → Nodos workers OKE
│ └── Subnet svclb (10.0.20.0/24) PUBLIC → Load Balancer de servicios K8s
│
├── OKE Cluster ─ containerengine.tf
│ └── Node Pool: 3 × VM.Standard.E3.Flex (2 OCPUs, 6 GB RAM)
│
├── Autonomous Database ATP (MTDRDB) ─ database.tf
│ └── Free Tier · 1 CPU · 1 TB · OLTP
│
├── Object Storage Bucket ─ object_storage.tf
│
└── Container Registry Repository ─ repositories.tf
└── Imagen: todolistapp-springboot (pública)
```

---

## 📄 Descripción Detallada de Cada Archivo

---

### [`provider.tf`](./provider.tf)

**¿Qué es?**
El punto de entrada de Terraform. Define qué plugin (provider) se usará para hablar con la API de OCI.

**¿Qué hace?**
- Declara la dependencia del provider oficial `hashicorp/oci` en su versión fijada `4.42.0`
- Configura la región de despliegue usando la variable `ociRegionIdentifier`

```hcl
terraform {
  required_providers {
    oci = {
      source  = "hashicorp/oci"
      version = "4.42.0"
    }
  }
}

provider "oci" {
  region = var.ociRegionIdentifier
}
```

**¿Por qué importa?**
Sin este archivo, Terraform no sabe cómo autenticarse ni en qué región de OCI debe crear los recursos. La versión está fijada (`4.42.0`) para garantizar reproducibilidad — una actualización del provider podría introducir cambios incompatibles.

**Nota para el desarrollador:** La autenticación con OCI se realiza a través del entorno de Cloud Shell (usa Instance Principal automáticamente). Fuera de Cloud Shell, se necesita un archivo `~/.oci/config`.

---

### [`main-var.tf`](./main-var.tf)

**¿Qué es?**
El contrato de configuración del módulo. Declara todas las variables externas que Terraform necesita recibir para funcionar.

**¿Qué hace?**
Define 7 variables requeridas sin valores por defecto, lo que obliga a que sean proporcionadas explícitamente:

```hcl
variable "ociTenancyOcid"      {}  // OCID de la cuenta raíz de OCI
variable "ociUserOcid"         {}  // OCID del usuario que ejecuta el deploy
variable "ociCompartmentOcid"  {}  // OCID del compartment destino
variable "ociRegionIdentifier" {}  // Región (ej: "mx-queretaro-1")
variable "mtdrDbName"          {}  // Nombre de la Autonomous Database
variable "runName"             {}  // Prefijo para nombres de recursos
variable "mtdrKey"             {}  // ID único que diferencia instancias del entorno
```

**¿Por qué importa?**
Centraliza en un solo lugar todos los parámetros externos. El script [`../scripts/utils/terraform.sh`](../scripts/utils/terraform.sh) los inyecta automáticamente como variables de entorno `TF_VAR_*` leyéndolas del sistema de hitos del proyecto.

**Nota para el desarrollador:** Nunca hardcodees valores en este archivo. Usa un archivo `terraform.tfvars` local (que debe estar en `.gitignore`) o las variables de entorno `TF_VAR_*`.

---

### [`availability_domain.tf`](./availability_domain.tf)

**¿Qué es?**
Un data source que consulta la ubicación física (Availability Domain) donde se crearán los recursos de cómputo.

**¿Qué hace?**
Consulta el primer Availability Domain (AD1) del tenancy:

```hcl
data "oci_identity_availability_domain" "ad1" {
  compartment_id = var.ociTenancyOcid
  ad_number      = 1
}
```

El resultado (`data.oci_identity_availability_domain.ad1.name`) es consumido por `containerengine.tf` para ubicar los nodos del Node Pool en AD1.

**¿Por qué importa?**
El nombre del Availability Domain varía según la región (por ejemplo, en `us-ashburn-1` es `IQvU:US-ASHBURN-AD-1` pero en otras regiones tiene un formato diferente). Este data source obtiene el nombre dinámicamente en lugar de hardcodearlo, haciendo el código portable entre regiones.

**Nota para el desarrollador:** `ad_number = 1` siempre apunta al primer AD. Si quisieras despliegues multi-AD para alta disponibilidad, crearías tres data sources con `ad_number` 1, 2 y 3.

---

### [`core.tf`](./core.tf)

**¿Qué es?**
El archivo más extenso y fundamental del proyecto. Define **toda la infraestructura de red** que soporta el clúster de Kubernetes.

**¿Qué hace?**
Crea los siguientes recursos en orden lógico:

#### Red Virtual (VCN)
```hcl
resource "oci_core_vcn" "okevcn" {
  cidr_block   = "10.0.0.0/16"
  display_name = "mtdrworkshop-${var.mtdrKey}"
  dns_label    = "mtdrworkshop"
}
```
La VCN es el contenedor de toda la red privada en OCI. El CIDR `10.0.0.0/16` permite hasta 65,536 direcciones IP internas.

#### Gateways de Conectividad

| Gateway | Recurso | Propósito |
|---|---|---|
| **Internet Gateway (IGW)** | `oci_core_internet_gateway.igw` | Permite que las subnets **públicas** se comuniquen con internet bidirecccionalmente |
| **NAT Gateway (NGW)** | `oci_core_nat_gateway.ngw` | Permite que los nodos workers (subnet **privada**) descarguen imágenes Docker e instalen paquetes sin exponer una IP pública |
| **Service Gateway (SGW)** | `oci_core_service_gateway.sgw` | Conecta la red privada con los servicios internos de OCI (Oracle Services Network) sin pasar por internet — más seguro y sin costo de egreso |

#### Tablas de Rutas

- **Tabla pública (default)**: todo el tráfico `0.0.0.0/0` → IGW. Usada por las subnets `endpoint` y `svclb`.
- **Tabla privada**: tráfico de internet → NGW; tráfico de servicios OCI → SGW. Usada por la subnet `nodePool`.

#### Subnets

| Subnet | CIDR | Tipo | Propósito |
|---|---|---|---|
| `endpoint` | `10.0.0.0/28` | Pública | Expone el API Server de Kubernetes (puerto 6443) |
| `nodePool` | `10.0.10.0/24` | Privada | Aloja los nodos workers del clúster OKE |
| `svclb_Subnet` | `10.0.20.0/24` | Pública | Aloja el Load Balancer que expone los servicios de Kubernetes al internet |

#### Security Lists (Firewall)

Cada subnet tiene su lista de reglas de ingress/egress:

- **`endpoint`**: permite tráfico entrante al puerto TCP `6443` (Kubernetes API), ICMP path discovery, y comunicación con los nodos workers.
- **`nodePool`**: permite tráfico desde el plano de control, entre nodos, y acceso a los servicios de Oracle Services Network.
- **`svclb_sl`**: permite **todo el tráfico TCP** entrante y saliente — necesario para que el Load Balancer enrute tráfico HTTP/HTTPS desde internet a los pods.

**¿Por qué importa?**
Sin este archivo, ningún otro recurso puede comunicarse. Es la fundación de red de todo el proyecto.

---

### [`containerengine.tf`](./containerengine.tf)

**¿Qué es?**
Define el clúster de Kubernetes gestionado (OKE) y el pool de nodos workers donde corren los contenedores de la aplicación.

**¿Qué hace?**

#### Clúster OKE
```hcl
resource "oci_containerengine_cluster" "mtdrworkshop_cluster" {
  name               = "mtdrworkshopcluster-${var.mtdrKey}"
  kubernetes_version = "v1.34.2"
  vcn_id             = oci_core_vcn.okevcn.id
  ...
}
```

| Configuración | Valor | Razón |
|---|---|---|
| API Server IP pública | `true` | Permite acceder con `kubectl` desde Cloud Shell |
| Subnet del API Server | `endpoint` (10.0.0.0/28) | Exposición controlada del plano de control |
| Subnet del Load Balancer | `svclb_Subnet` (10.0.20.0/24) | Para servicios tipo `LoadBalancer` de Kubernetes |
| CIDR de pods | `10.244.0.0/16` | Red interna de pods (Flannel/CNI) |
| CIDR de servicios | `10.96.0.0/16` | Red de servicios Kubernetes (ClusterIP) |
| Dashboard | Deshabilitado | Reduce superficie de ataque |
| Pod Security Policies | Deshabilitadas | Simplificación para entorno workshop |

#### Node Pool
```hcl
resource "oci_containerengine_node_pool" "oke_node_pool" {
  name           = "Pool"
  node_shape     = "VM.Standard.E3.Flex"
  node_shape_config {
    memory_in_gbs = 6
    ocpus         = 2
  }
  node_config_details {
    size = 3  # 3 nodos workers
  }
}
```

- **Shape `VM.Standard.E3.Flex`**: procesador AMD EPYC, arquitectura x86_64. Es la razón por la que Cloud Shell debe configurarse en x86_64 (ver requisitos del proyecto).
- **3 nodos** en AD1, todos en la subnet `nodePool` (privada).
- La **imagen del SO** se selecciona automáticamente: el código filtra las imágenes disponibles con una expresión regular para obtener siempre la Oracle Linux más reciente para x86:
  ```hcl
  oracle_linux_images = [for source in local.all_sources : source.image_id
    if length(regexall("Oracle-Linux-[0-9]*.[0-9]*-20[0-9]*", source.source_name)) > 0]
  ```

**¿Por qué importa?**
Es el entorno de ejecución donde corren los pods del backend Spring Boot, el frontend React y el bot de Telegram. Un error aquí (por ejemplo, usar el shape ARM `VM.Standard.A1.Flex` con una imagen x86) causaría que los pods entren en `CrashLoopBackOff`.

---

### [`database.tf`](./database.tf)

**¿Qué es?**
Crea la base de datos Oracle Autonomous Transaction Processing (ATP) que persiste todas las tareas de la aplicación.

**¿Qué hace?**

#### Generación de credenciales seguras
Antes de crear la BD, genera credenciales aleatorias:
```hcl
resource "random_string" "autonomous_database_wallet_password" {
  length  = 16
  special = true  // Para el wallet de conexión TLS
}

resource "random_password" "database_admin_password" {
  length  = 12
  upper   = true
  lower   = true
  numeric = true
  special = false  // ATP no acepta especiales en la contraseña admin
}
```

#### Base de datos ATP
```hcl
resource "oci_database_autonomous_database" "autonomous_database_atp" {
  db_name          = var.mtdrDbName     // "MTDRDB"
  display_name     = "MTDRDB"
  db_workload      = "OLTP"             // Transaction Processing
  cpu_core_count   = 1
  data_storage_size_in_tbs = 1
  is_free_tier     = true               // Always Free
  is_auto_scaling_enabled = false
  admin_password   = random_password.database_admin_password.result
}
```

| Parámetro | Valor | Significado |
|---|---|---|
| `db_workload = "OLTP"` | Transaction Processing | Optimizado para muchas transacciones pequeñas (inserts/updates de tareas) |
| `is_free_tier = true` | Always Free | Sin costo, dentro de los límites del Free Tier de OCI |
| `cpu_core_count = 1` | 1 OCPU | Mínimo necesario para el workshop |
| `license_model` | `BRING_YOUR_OWN_LICENSE` | El tenancy del workshop ya incluye licencias Oracle |

#### Outputs de este archivo
- `ns_objectstorage_namespace` — namespace del tenancy para Object Storage
- `autonomous_database_admin_password` — devuelve `["Welcome12345"]` (la contraseña real se configura via `setup.sh`)

**¿Por qué importa?**
Aquí se almacenan las tablas `TODOITEM` y `USERS`. Sin esta base de datos, el backend Spring Boot no puede arrancar (falla la conexión JDBC al iniciar).

---

### [`object_storage.tf`](./object_storage.tf)

**¿Qué es?**
Crea un bucket de Object Storage en OCI para almacenamiento de artefactos.

**¿Qué hace?**
```hcl
data "oci_objectstorage_namespace" "namespace" {
  compartment_id = var.ociCompartmentOcid
}

resource "oci_objectstorage_bucket" "dbbucket" {
  namespace      = data.oci_objectstorage_namespace.namespace.namespace
  compartment_id = var.ociCompartmentOcid
  name           = "${var.runName}-${var.mtdrKey}"  // ej: "mtdrworkshop-abc123"
}
```

El nombre combina `runName` y `mtdrKey` para garantizar unicidad global (los nombres de buckets deben ser únicos en todo el namespace del tenancy).

**¿Por qué importa?**
El bucket es utilizado por los scripts auxiliares (`os-destroy.sh`) durante el teardown y puede usarse para almacenar backups del wallet de conexión de la base de datos. También es donde el pipeline CI/CD de OCI DevOps puede depositar artefactos de build.

---

### [`repositories.tf`](./repositories.tf)

**¿Qué es?**
Crea el repositorio en OCI Container Registry (OCIR) donde se almacena la imagen Docker del backend Spring Boot.

**¿Qué hace?**
```hcl
resource "oci_artifacts_container_repository" "todolist" {
  compartment_id = var.ociCompartmentOcid
  display_name   = "${var.runName}/${var.mtdrKey}/todolistapp-springboot"
  is_public      = true
}
```

El repositorio es **público** (`is_public = true`), lo que permite que OKE descargue la imagen sin necesidad de configurar `imagePullSecrets` en los manifiestos de Kubernetes.

**Nombre del repositorio:** `<runName>/<mtdrKey>/todolistapp-springboot`
Ejemplo: `mtdrworkshop/abc123/todolistapp-springboot`

**¿Por qué importa?**
El script `build.sh` del proyecto construye la imagen Docker del backend y la sube a este repositorio con el tag `latest`. Cuando `deploy.sh` aplica el YAML de Kubernetes, los nodos del Node Pool descargan la imagen desde aquí para crear los pods.

---

### [`outputs.tf`](./outputs.tf)

**¿Qué es?**
Define los valores que Terraform expone como output una vez completado el `apply`.

**¿Qué hace?**
```hcl
output "lab_oke_cluster_id" {
  value = oci_containerengine_cluster.mtdrworkshop_cluster.id
}
```

Exporta el OCID del clúster OKE, que es consumido por `main-setup.sh` para configurar `kubectl` apuntando al clúster correcto.

**¿Por qué importa?**
Sin este output, el script de setup no podría obtener automáticamente el ID del clúster para ejecutar `oci ce cluster create-kubeconfig ...` y configurar el acceso de `kubectl`.

**Para consultar los outputs después del apply:**
```bash
terraform output
terraform output lab_oke_cluster_id
```

---

### [`apigateway.tf`](./apigateway.tf)

**¿Qué es?**
Archivo que **ya no crea ningún recurso**. Todo su contenido está comentado.

**Estado actual:**
```hcl
# No longer creating API_gateway
# resource "oci_apigateway_gateway" "todolist" {
#   compartment_id = var.ociCompartmentOcid
#   endpoint_type  = "PUBLIC"
#   subnet_id      = oci_core_subnet.svclb_Subnet.id
#   display_name   = "todolist"
# }
```

**Historia:** En una versión anterior de la arquitectura, el tráfico externo entraba por un API Gateway de OCI. La arquitectura evolucionó para usar directamente el **Load Balancer de OKE** (aprovisionado automáticamente por Kubernetes cuando se crea un `Service` de tipo `LoadBalancer`). Esto simplifica la arquitectura al eliminar un hop innecesario.

**¿Por qué se conserva?**
Como documentación de una decisión de arquitectura. Si en el futuro se necesita agregar autenticación OAuth, rate limiting o transformación de requests a nivel de gateway, este archivo es el punto de partida.

---

## 🔗 Dependencias Entre Archivos

Terraform resuelve automáticamente el orden de creación basándose en las referencias entre recursos: