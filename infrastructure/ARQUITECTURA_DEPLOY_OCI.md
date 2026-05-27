# Arquitectura de Despliegue en OCI — MyTodoList

> **Nivel:** Explicación detallada para desarrolladores  
> **Fecha:** Marzo 2026  
> **Proyecto:** OCI Chatbot / MyTodoList

---

## Tabla de Contenidos

1. [Visión General de la Arquitectura Desplegada](#1-visión-general-de-la-arquitectura-desplegada)
2. [Jerarquía OCI: Region → AD → Fault Domain](#2-jerarquía-oci-region--ad--fault-domain)
3. [Qué es OKE y cómo se configura en este proyecto](#3-qué-es-oke-y-cómo-se-configura-en-este-proyecto)
4. [Qué contiene cada Worker Node](#4-qué-contiene-cada-worker-node)
5. [Pods y lo que corre dentro](#5-pods-y-lo-que-corre-dentro)
6. [Red: VCN, Subredes, Gateways y Security Lists](#6-red-vcn-subredes-gateways-y-security-lists)
7. [Base de Datos: Oracle ATP](#7-base-de-datos-oracle-atp)
8. [Flujo completo del Deploy (build.sh → deploy.sh)](#8-flujo-completo-del-deploy)
9. [Diagrama de Arquitectura Completo](#9-diagrama-de-arquitectura-completo)
10. [Resumen de todos los recursos OCI creados por Terraform](#10-resumen-de-todos-los-recursos-oci-creados-por-terraform)

---

## 1. Visión General de la Arquitectura Desplegada

Cuando se hace deploy, la aplicación queda distribuida así:

```
                    ┌─── OCI Region (ej. us-ashburn-1) ───────────────────────────────────┐
                    │                                                                       │
                    │  ┌─── Availability Domain 1 ──────────────────────────────────────┐   │
                    │  │                                                                 │   │
                    │  │  ┌─── Fault Domain 1 ───┐  ┌─── Fault Domain 2 ───┐           │   │
                    │  │  │   Worker Node 1       │  │   Worker Node 2       │           │   │
                    │  │  │   ┌──────────────┐    │  │   ┌──────────────┐    │           │   │
                    │  │  │   │ POD: Spring   │    │  │   │ POD: Spring   │    │           │   │
                    │  │  │   │ Boot + React  │    │  │   │ Boot + React  │    │           │   │
                    │  │  │   │ + Telegram Bot│    │  │   │ + Telegram Bot│    │           │   │
                    │  │  │   └──────────────┘    │  │   └──────────────┘    │           │   │
                    │  │  └──────────────────────┘  └──────────────────────┘           │   │
                    │  │                                                                 │   │
                    │  │           ┌─── Fault Domain 3 ───┐                             │   │
                    │  │           │   Worker Node 3       │                             │   │
                    │  │           │   ┌──────────────┐    │                             │   │
                    │  │           │   │ POD: Spring   │    │                             │   │
                    │  │           │   │ Boot + React  │    │                             │   │
                    │  │           │   │ + Telegram Bot│    │                             │   │
                    │  │           │   └──────────────┘    │                             │   │
                    │  │           └──────────────────────┘                             │   │
                    │  └────────────────────────────────────────────────────────────────┘   │
                    │                                                                       │
                    │  ┌──────────────────────┐  ┌──────────────────────┐                   │
                    │  │  Oracle ATP (Free)    │  │  Object Storage      │                   │
                    │  │  Tabla: TODOITEM      │  │  Bucket: wallet      │                   │
                    │  │  Tabla: USERS         │  │                      │                   │
                    │  └──────────────────────┘  └──────────────────────┘                   │
                    │                                                                       │
                    └───────────────────────────────────────────────────────────────────────┘
```

---

## 2. Jerarquía OCI: Region → AD → Fault Domain

### OCI Region

Una **Region** es un área geográfica donde Oracle tiene data centers (ej. `us-ashburn-1`, `us-phoenix-1`, `sa-saopaulo-1`). Todos los recursos de este proyecto se crean en una sola región.

Se configura en `terraform/provider.tf`:
```hcl
provider "oci" {
  region = var.ociRegionIdentifier   # ← Variable que configura main-setup.sh
}
```

Y viene de la variable de entorno `OCI_REGION` del Cloud Shell.

### Availability Domain (AD)

Dentro de cada región hay **1 a 3 Availability Domains**. Cada AD es un data center físicamente separado con su propia energía, refrigeración y red. Si un AD se cae, los otros siguen funcionando.

En este proyecto, se usa **solo 1 AD** (configurado en `terraform/availability_domain.tf`):
```hcl
data "oci_identity_availability_domain" "ad1" {
  compartment_id = var.ociTenancyOcid
  ad_number = 1    # ← Solo el primer Availability Domain
}
```

En `containerengine.tf` hay código **comentado** para usar AD2 y AD3:
```hcl
# Estos están comentados — solo se usa AD1:
# placement_configs {
#   availability_domain = data.oci_identity_availability_domain.ad2.name
# }
# placement_configs {
#   availability_domain = data.oci_identity_availability_domain.ad3.name
# }
```

**¿Por qué solo 1 AD?** Muchas regiones de OCI solo tienen 1 AD. Para alta disponibilidad en regiones con varios ADs, se descomentaría ese código.

### Fault Domain (FD)

Dentro de **cada AD**, OCI distribuye los recursos en **3 Fault Domains**. Cada FD es un grupo de hardware independiente (distinto rack, distinta fuente de energía).

Cuando creates 3 Worker Nodes en 1 AD, OCI los reparte automáticamente entre los 3 FDs:

```
Availability Domain 1
├── Fault Domain 1 → Worker Node 1  (rack A, power supply A)
├── Fault Domain 2 → Worker Node 2  (rack B, power supply B)
└── Fault Domain 3 → Worker Node 3  (rack C, power supply C)
```

**Beneficio:** Si un rack falla (FD1), los Worker Nodes en FD2 y FD3 siguen sirviendo la app. OCI hace esta distribución automáticamente, no hay código Terraform para esto — es una feature implícita del Node Pool.

Además, en `todolistapp-springboot.yaml` hay una regla explícita de distribución:
```yaml
topologySpreadConstraints:
  - maxSkew: 1
    topologyKey: kubernetes.io/hostname    # ← Distribuir pods en distintos nodos
    whenUnsatisfiable: DoNotSchedule
    labelSelector:
      matchLabels:
        app: todolistapp-springboot
```

Esto le dice a Kubernetes: "no pongas todos mis pods en el mismo Worker Node — distribúyelos uniformemente".

---

## 3. Qué es OKE y cómo se configura en este proyecto

**OKE = Oracle Container Engine for Kubernetes.** Es el servicio managed de Kubernetes de OCI. Oracle se encarga de:
- Mantener el **Control Plane** (API Server, etcd, scheduler, controller-manager)
- Parchear y actualizar los componentes de Kubernetes
- Proveer la integración con la red de OCI

Tú solo gestionas los **Worker Nodes** (donde corren tus pods).

### Configuración del Cluster (`containerengine.tf`)

```hcl
resource "oci_containerengine_cluster" "mtdrworkshop_cluster" {
  compartment_id     = var.ociCompartmentOcid
  kubernetes_version = "v1.34.2"                     # ← Versión de K8s
  name               = "mtdrworkshopcluster-${var.mtdrKey}"
  vcn_id             = oci_core_vcn.okevcn.id        # ← Red donde vive el cluster

  endpoint_config {
    is_public_ip_enabled = "true"                    # ← API Server accesible desde internet
    subnet_id = oci_core_subnet.endpoint.id          # ← Subred pública para el endpoint
  }

  options {
    service_lb_subnet_ids = [oci_core_subnet.svclb_Subnet.id]  # ← Subred del Load Balancer
    kubernetes_network_config {
      pods_cidr     = "10.244.0.0/16"               # ← Rango IP interno de pods
      services_cidr = "10.96.0.0/16"                 # ← Rango IP interno de services
    }
  }
}
```

### Configuración del Node Pool (Worker Nodes)

```hcl
resource "oci_containerengine_node_pool" "oke_node_pool" {
  cluster_id         = oci_containerengine_cluster.mtdrworkshop_cluster.id
  kubernetes_version = "v1.34.2"
  name               = "Pool"
  node_shape         = "VM.Standard.E3.Flex"          # ← Tipo de máquina virtual

  node_shape_config {
    memory_in_gbs = 6                                 # ← 6 GB RAM por nodo
    ocpus         = 2                                 # ← 2 CPUs por nodo
  }

  node_config_details {
    placement_configs {
      availability_domain = data.oci_identity_availability_domain.ad1.name
      subnet_id           = oci_core_subnet.nodePool_Subnet.id  # ← Subred PRIVADA
    }
    size = "3"                                        # ← 3 Worker Nodes en total
  }

  node_source_details {
    image_id    = local.oracle_linux_images.0         # ← Oracle Linux (última versión)
    source_type = "IMAGE"
  }
}
```

**Resumen del Node Pool:**

| Propiedad | Valor |
|---|---|
| Shape | VM.Standard.E3.Flex |
| OCPUs por nodo | 2 |
| RAM por nodo | 6 GB |
| Cantidad de nodos | 3 |
| OS | Oracle Linux (last) |
| Subred | Privada (10.0.10.0/24) — sin IP pública |
| AD | Solo AD1 |
| Total del cluster | 6 OCPUs, 18 GB RAM |

---

## 4. Qué contiene cada Worker Node

Un Worker Node es una **máquina virtual (VM)** corriendo Oracle Linux en OCI. Cada uno contiene:

```
┌─────────────── Worker Node (VM.Standard.E3.Flex) ───────────────┐
│                                                                   │
│  OS: Oracle Linux                                                │
│  CPU: 2 OCPUs   RAM: 6 GB                                       │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐     │
│  │  kubelet (agente de Kubernetes)                         │     │
│  │  → Recibe instrucciones del Control Plane               │     │
│  │  → Arranca, para y monitorea pods                       │     │
│  └─────────────────────────────────────────────────────────┘     │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐     │
│  │  kube-proxy (proxy de red)                              │     │
│  │  → Maneja las reglas de red para los Services de K8s    │     │
│  │  → Enruta tráfico del Load Balancer a los pods          │     │
│  └─────────────────────────────────────────────────────────┘     │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐     │
│  │  Container Runtime (CRI-O o containerd)                 │     │
│  │  → Ejecuta los contenedores Docker dentro de los pods   │     │
│  └─────────────────────────────────────────────────────────┘     │
│                                                                   │
│  ┌──────────────── POD 1 ────────────────────────────────┐      │
│  │                                                        │      │
│  │  Container: todolistapp-springboot                     │      │
│  │  ┌──────────────────────────────────────────────────┐  │      │
│  │  │  Java 22 (OpenJDK)                               │  │      │
│  │  │  Spring Boot 3.5.6                               │  │      │
│  │  │  ├── REST API (/todolist, /users, /projects)     │  │      │
│  │  │  ├── Telegram Bot (Long Polling)                 │  │      │
│  │  │  ├── DeepSeek LLM Client                        │  │      │
│  │  │  └── React Build (archivos estáticos en /static) │  │      │
│  │  │  Puerto: 8080                                    │  │      │
│  │  └──────────────────────────────────────────────────┘  │      │
│  │                                                        │      │
│  │  Volumen montado: /mtdrworkshop/creds                  │      │
│  │  └── wallet de Oracle ATP (cwallet.sso, tnsnames.ora)  │      │
│  │                                                        │      │
│  │  Variables de entorno:                                 │      │
│  │  ├── db_user     = "TODOUSER"                          │      │
│  │  ├── db_url      = "jdbc:oracle:thin:@<BD>_tp?..."    │      │
│  │  ├── dbpassword  = (K8s Secret 'dbuser')              │      │
│  │  ├── driver_class_name = "oracle.jdbc.OracleDriver"    │      │
│  │  ├── OCI_REGION  = "<region>"                          │      │
│  │  └── ui_username = (K8s Secret 'frontendadmin')       │      │
│  └────────────────────────────────────────────────────────┘      │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

### Contenido detallado del contenedor dentro del Pod

La imagen Docker (`todolistapp-springboot:0.1`) contiene:

| Componente | Qué hace dentro del contenedor |
|---|---|
| **OpenJDK 22** | Runtime de Java |
| **MyTodoList.jar** | El .jar empaquetado con Spring Boot que incluye TODO: backend + frontend compilado |
| **Spring Boot Embedded Tomcat** | Servidor web interno que escucha en el puerto 8080 |
| **React build (estáticos)** | Los archivos HTML/JS/CSS del frontend compilados — servidos por el Tomcat integrado en `/static` |
| **TelegramBots lib** | Librería que abre conexión long-polling con los servidores de Telegram |
| **Apache HttpClient 5** | Cliente HTTP que habla con la API de DeepSeek |
| **Oracle JDBC + UCP** | Driver y connection pool para conectarse al ATP via el wallet montado |
| **Wallet montado en `/mtdrworkshop/creds`** | Certificados SSL para la conexión cifrada a Oracle ATP |

### Replicas

En `todolistapp-springboot.yaml` se configuran **2 réplicas** del pod:
```yaml
spec:
  replicas: 2    # ← 2 pods idénticos distribuidos en los 3 Worker Nodes
```

Kubernetes distribuye los 2 pods entre los 3 Worker Nodes usando el `topologySpreadConstraints`, garantizando que **no estén en el mismo nodo**. Esto significa que 1 Worker Node no tendrá pod asignado y funciona como respaldo.

---

## 5. Pods y lo que corre dentro

### ¿Qué es un Pod?

Un Pod es la unidad mínima de ejecución en Kubernetes. En este proyecto, cada Pod tiene **1 contenedor** con la aplicación completa.

### Kubernetes Secrets consumidos por cada Pod

| Secret Name | Key | Montaje | Qué contiene |
|---|---|---|---|
| `db-wallet-secret` | (múltiples archivos) | Volumen en `/mtdrworkshop/creds` | cwallet.sso, tnsnames.ora, keystore.jks, truststore.jks, sqlnet.ora, ojdbc.properties |
| `dbuser` | `dbpassword` | Variable de entorno `dbpassword` | Contraseña del usuario TODOUSER en Oracle ATP |
| `frontendadmin` | `password` | Variable de entorno `ui_password` | Contraseña de la UI web |

### Kubernetes Services que exponen los Pods

```yaml
# Service 1: Load Balancer externo (tráfico de internet → pods)
kind: Service
metadata:
  name: todolistapp-springboot-service
spec:
  type: LoadBalancer              # ← OCI crea un Load Balancer público
  externalTrafficPolicy: Local
  ports:
    - port: 80                    # ← Puerto público (HTTP)
      targetPort: 8080            # ← Puerto del pod (Tomcat)

# Service 2: Router interno (comunicación entre servicios)
kind: Service
metadata:
  name: todolistapp-backend-router
spec:
  ports:
    - port: 80
      targetPort: http
```

El flujo del tráfico web:
```
Internet → OCI Load Balancer (IP pública, puerto 80)
             → kube-proxy (en el Worker Node)
                → Pod (puerto 8080 del contenedor)
                   → Spring Boot Tomcat → REST API o archivos React estáticos
```

---

## 6. Red: VCN, Subredes, Gateways y Security Lists

Todo definido en `terraform/core.tf`:

```
┌──────────────────── VCN: 10.0.0.0/16 ────────────────────────────┐
│                      (mtdrworkshop-xxxx)                          │
│                                                                    │
│  ┌── Subred Pública: Endpoint ──┐                                │
│  │   CIDR: 10.0.0.0/28          │ ← Kubernetes API Server        │
│  │   Route: Internet Gateway     │   (kubectl habla con esto)     │
│  │   Puerto: 6443 abierto       │                                │
│  └──────────────────────────────┘                                │
│                                                                    │
│  ┌── Subred Privada: Node Pool ─┐                                │
│  │   CIDR: 10.0.10.0/24         │ ← Worker Nodes viven aquí      │
│  │   Route: NAT Gateway         │   (sin IP pública)              │
│  │   Sin acceso directo          │                                │
│  │   de internet                 │                                │
│  └──────────────────────────────┘                                │
│                                                                    │
│  ┌── Subred Pública: Service LB ┐                                │
│  │   CIDR: 10.0.20.0/24         │ ← OCI Load Balancer            │
│  │   Route: Internet Gateway     │   (la IP pública de la app)    │
│  │   Puerto 80/443 abierto       │                                │
│  └──────────────────────────────┘                                │
│                                                                    │
│  ┌─────────── Gateways ─────────┐                                │
│  │  Internet Gateway  ← tráfico │ público (entrada/salida)       │
│  │  NAT Gateway       ← nodos  │ privados acceden a internet    │
│  │  Service Gateway    ← acceso │ a servicios OCI internos       │
│  └──────────────────────────────┘                                │
└────────────────────────────────────────────────────────────────────┘
```

### ¿Por qué los Worker Nodes están en subred privada?

Los Worker Nodes **no tienen IP pública**. Esto es una buena práctica de seguridad:
- Nadie puede hacer SSH directo a un nodo desde internet
- Los nodos acceden a internet (para descargar imágenes Docker) via el **NAT Gateway**
- El tráfico de usuarios llega solo por el **Load Balancer** en la subred pública

### Security Lists (Reglas de firewall)

| Security List | Tráfico permitido |
|---|---|
| **Endpoint** | Entrada: puerto 6443 (K8s API) desde internet y Worker Nodes. Salida: 443 a OCI Services, todo tráfico a Worker Nodes |
| **Node Pool** | Entrada: todo tráfico entre nodos (pod-to-pod), SSH (22), TCP desde Control Plane. Salida: todo a internet (via NAT), 6443 al API Server, 443 a OCI Services |
| **Service LB** | Entrada: todo TCP desde internet. Salida: todo TCP a internet |

---

## 7. Base de Datos: Oracle ATP

No vive dentro de Kubernetes. Es un servicio **managed** separado que corre en la infraestructura de OCI.

```hcl
resource "oci_database_autonomous_database" "autonomous_database_atp" {
  admin_password           = random_password.database_admin_password.result
  compartment_id           = var.ociCompartmentOcid
  cpu_core_count           = "1"              # ← 1 OCPU
  data_storage_size_in_tbs = "1"              # ← 1 TB almacenamiento
  db_name                  = var.mtdrDbName
  is_free_tier             = true             # ← FREE TIER
  db_workload              = "OLTP"           # ← Optimizado para transacciones
  display_name             = "MTDRDB"
}
```

### ¿Cómo se conectan los Pods al ATP?

```
Pod (Worker Node, subred privada)
  │
  │  JDBC: jdbc:oracle:thin:@<MTDR_DB_NAME>_tp?TNS_ADMIN=/mtdrworkshop/creds
  │
  │  El wallet montado en /mtdrworkshop/creds tiene:
  │  ├── tnsnames.ora     → define los alias de conexión (ej. mtdrdb_tp)
  │  ├── cwallet.sso      → certificado SSL auto-login
  │  ├── sqlnet.ora        → configuración de red Oracle
  │  └── ojdbc.properties  → propiedades del driver JDBC
  │
  └──── Conexión TLS cifrada via Service Gateway ────► Oracle ATP
```

La conexión va por el **Service Gateway** (no por internet), lo que significa que el tráfico de BD nunca sale de la red de OCI. Esto es más rápido y seguro.

---

## 8. Flujo completo del Deploy

Cuando ejecutas `./build.sh` seguido de `./deploy.sh`:

```
PASO 1: build.sh
─────────────────
  mvn clean package spring-boot:repackage
  │  → Compila Java
  │  → Compila React (npm install + npm run build via Maven plugin)
  │  → Empaqueta todo en MyTodoList-0.0.1-SNAPSHOT.jar
  │
  docker build -f Dockerfile -t $IMAGE .
  │  → Crea imagen Docker con OpenJDK 22 + el .jar
  │
  docker push $IMAGE
  │  → Sube la imagen al OCIR: <region>.ocir.io/<namespace>/<run>/<key>/todolistapp-springboot:0.1

PASO 2: deploy.sh
──────────────────
  Copia todolistapp-springboot.yaml
  │
  sed -i "s|%DOCKER_REGISTRY%|...|g"    → Reemplaza con URL real del OCIR
  sed -i "s|%TODO_PDB_NAME%|...|g"      → Reemplaza con nombre real de la BD  
  sed -i "s|%OCI_REGION%|...|g"         → Reemplaza con región real
  sed -i "s|%UI_USERNAME%|...|g"        → Reemplaza con usuario de UI
  │
  kubectl apply -f todolistapp-springboot-<timestamp>.yaml -n mtdrworkshop
  │
  │  Kubernetes:
  │  ├── Crea/actualiza el Deployment (2 réplicas)
  │  │   ├── Descarga la imagen Docker del OCIR
  │  │   ├── Crea Pod 1 en Worker Node A
  │  │   ├── Crea Pod 2 en Worker Node B
  │  │   ├── Monta el wallet (db-wallet-secret) en /mtdrworkshop/creds
  │  │   └── Inyecta las variables de entorno (db_user, db_url, dbpassword, etc.)
  │  │
  │  ├── Crea/actualiza Service LoadBalancer
  │  │   └── OCI aprovisiona un Load Balancer público con IP pública
  │  │       → Enruta puerto 80 → pods puerto 8080
  │  │
  │  └── Crea/actualiza Service backend-router (ClusterIP interno)
  │
  └── La aplicación está accesible en: http://<IP_DEL_LOAD_BALANCER>/
```

---

## 9. Diagrama de Arquitectura Completo

```
                            ┌─── USUARIOS ──────────────────────────┐
                            │   Browser Web        Telegram App      │
                            └───┬───────────────────────┬────────────┘
                                │ HTTP                  │ HTTPS (Long Polling)
                                ▼                       │
┌─────────────── OCI Region ────┼───────────────────────┼────────────────────────┐
│                               │                       │                        │
│  ┌─── Compartment ────────────┼───────────────────────┼──────────────────────┐ │
│  │                            │                       │                      │ │
│  │  ┌── VCN 10.0.0.0/16 ─────┼───────────────────────┼────────────────────┐ │ │
│  │  │                         │                       │                    │ │ │
│  │  │  ╔══ Subred Pública ════╪═══╗                   │                    │ │ │
│  │  │  ║  Load Balancer (OCI) ◄───╝                   │                    │ │ │
│  │  │  ║  IP Pública :80      ║                       │                    │ │ │
│  │  │  ╚══════════╦═══════════╝                       │                    │ │ │
│  │  │             ║ port 8080                         │                    │ │ │
│  │  │  ╔══ Subred Privada ════════════════════════════╪══════════════════╗ │ │ │
│  │  │  ║                                              │                  ║ │ │ │
│  │  │  ║  ┌─ Worker Node 1 (FD1) ──────────────────┐ │                  ║ │ │ │
│  │  │  ║  │  ┌─ POD ─────────────────────────────┐  │ │                  ║ │ │ │
│  │  │  ║  │  │ Spring Boot + React + Telegram Bot│◄─┘                   ║ │ │ │
│  │  │  ║  │  │ Puerto 8080                       │                      ║ │ │ │
│  │  │  ║  │  │ Wallet: /mtdrworkshop/creds       │──┐                   ║ │ │ │
│  │  │  ║  │  └──────────────────────────────────┘  │                    ║ │ │ │
│  │  │  ║  └────────────────────────────────────────┘  │                 ║ │ │ │
│  │  │  ║                                              │                  ║ │ │ │
│  │  │  ║  ┌─ Worker Node 2 (FD2) ──────────────────┐ │                  ║ │ │ │
│  │  │  ║  │  ┌─ POD ─────────────────────────────┐  │ │                  ║ │ │ │
│  │  │  ║  │  │ Spring Boot + React + Telegram Bot│  │ │                  ║ │ │ │
│  │  │  ║  │  │ Puerto 8080                       │  │ │                  ║ │ │ │
│  │  │  ║  │  │ Wallet: /mtdrworkshop/creds       │──┤                   ║ │ │ │
│  │  │  ║  │  └──────────────────────────────────┘  │                    ║ │ │ │
│  │  │  ║  └────────────────────────────────────────┘  │                 ║ │ │ │
│  │  │  ║                                              │                  ║ │ │ │
│  │  │  ║  ┌─ Worker Node 3 (FD3) ──────────────────┐ │                  ║ │ │ │
│  │  │  ║  │  (sin pod asignado — backup)            │ │                  ║ │ │ │
│  │  │  ║  └────────────────────────────────────────┘  │                 ║ │ │ │
│  │  │  ║                                              │                  ║ │ │ │
│  │  │  ╚══════════════════════════════════════════════╪══════════════════╝ │ │ │
│  │  │                                                 │                    │ │ │
│  │  │             Service Gateway ◄───────────────────┘                    │ │ │
│  │  │                   │ (tráfico interno OCI)                            │ │ │
│  │  └───────────────────┼──────────────────────────────────────────────────┘ │ │
│  │                      │                                                    │ │
│  │  ┌───────────────────▼──────────────┐   ┌──────────────────────────────┐  │ │
│  │  │  Oracle ATP (Free Tier)          │   │  OCIR (Container Registry)   │  │ │
│  │  │  MTDRDB                          │   │  todolistapp-springboot:0.1  │  │ │
│  │  │  ├── TODOITEM                    │   └──────────────────────────────┘  │ │
│  │  │  └── USERS                       │                                     │ │
│  │  └──────────────────────────────────┘   ┌──────────────────────────────┐  │ │
│  │                                         │  Object Storage (Bucket)     │  │ │
│  │                                         │  wallet (cwallet.sso)        │  │ │
│  │                                         └──────────────────────────────┘  │ │
│  └───────────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## 10. Resumen de todos los recursos OCI creados por Terraform

| Recurso | Archivo Terraform | Tipo/Nombre | Specs |
|---|---|---|---|
| **VCN** | `core.tf` | `mtdrworkshop-<key>` | CIDR 10.0.0.0/16 |
| **Subred Endpoint** (pública) | `core.tf` | 10.0.0.0/28 | API K8s, con Internet GW |
| **Subred Node Pool** (privada) | `core.tf` | 10.0.10.0/24 | Worker Nodes, con NAT GW |
| **Subred Service LB** (pública) | `core.tf` | 10.0.20.0/24 | Load Balancer, con Internet GW |
| **Internet Gateway** | `core.tf` | `ClusterInternetGateway` | Entrada/salida de internet |
| **NAT Gateway** | `core.tf` | `ngw` | Salida a internet para nodos privados |
| **Service Gateway** | `core.tf` | `mtdr_sgw` | Acceso interno a servicios OCI (ej. ATP) |
| **Security List Endpoint** | `core.tf` | `endpoint` | Puerto 6443 (K8s API) |
| **Security List NodePool** | `core.tf` | `nodepool` | Pod-to-pod, SSH, Control Plane |
| **Security List SvcLB** | `core.tf` | `scvlb` | Todo TCP entrada/salida |
| **Route Table Pública** | `core.tf` | `public` | → Internet Gateway |
| **Route Table Privada** | `core.tf` | `private` | → NAT + Service Gateway |
| **OKE Cluster** | `containerengine.tf` | `mtdrworkshopcluster-<key>` | K8s v1.34.2, endpoint público |
| **Node Pool** | `containerengine.tf` | `Pool` | 3 nodos VM.Standard.E3.Flex (2 OCPU, 6GB) |
| **Oracle ATP** | `database.tf` | `MTDRDB` | Free Tier, 1 OCPU, 1TB, OLTP |
| **OCIR Repository** | `repositories.tf` | `<run>/<key>/todolistapp-springboot` | Público |
| **Object Storage Bucket** | `object_storage.tf` | `<run>-<key>` | Para wallet de la BD |
| **API Gateway** | `apigateway.tf` | **DESACTIVADO** (comentado) | No se crea |

### Recursos creados por scripts (NO Terraform)

| Recurso | Script | Tipo |
|---|---|---|
| K8s Namespace `mtdrworkshop` | `oke-setup.sh` | Kubernetes Namespace |
| K8s Secret `db-wallet-secret` | `db-setup.sh` | Secret con archivos del wallet |
| K8s Secret `dbuser` | `main-setup.sh` | Secret con contraseña de BD |
| K8s Secret `frontendadmin` | `main-setup.sh` | Secret con contraseña de UI |
| K8s Deployment (2 pods) | `deploy.sh` → `kubectl apply` | Deployment + Pods |
| K8s Service LoadBalancer | `deploy.sh` → `kubectl apply` | OCI Load Balancer |
| Usuario `TODOUSER` en ATP | `db-setup.sh` → `sqlplus` | Oracle DB User |
| Tabla `TODOITEM` | `db-setup.sh` → `sqlplus` | Oracle DB Table |
| Auth Token de OCI | `main-setup.sh` | IAM auth token para Docker |

---

*Documento generado el 11 de Marzo de 2026*
