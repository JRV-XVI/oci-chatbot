# 🛠️ Scripts de Orquestación — MTDR Workshop

Este directorio contiene todos los scripts Bash y Python que automatizan el
**ciclo de vida completo** del entorno MTDR sobre Oracle Cloud Infrastructure
(OCI): desde el aprovisionamiento inicial hasta el desmontaje total de recursos.

La filosofía del sistema es **reanudable e idempotente**: si un proceso se
interrumpe por cualquier motivo (timeout de Cloud Shell, error de red, cuota
de OCI), puede retomarse exactamente desde el último punto completado con solo
volver a ejecutar el mismo comando.

> 📖 Para entender la infraestructura que estos scripts crean, ver
> [`../terraform/README.md`](../terraform/README.md)

---

## 📁 Estructura de Archivos
```
infraestructura/scripts/
│
├── env.sh ← (1) EJECUTAR PRIMERO — carga el entorno
├── setup.sh ← (2) Aprovisiona toda la infraestructura
├── destroy.sh ← (3) Destruye toda la infraestructura
│── deploy/
│   │
│   │── build.sh
│   └── deploy.sh
│
└── utils/
    │
    ├── state-functions.sh ← Motor de hitos reanudables (núcleo del sistema)
    │
    ├── main-setup.sh ← Orquestador del aprovisionamiento
    ├── terraform.sh ← Wrapper de Terraform (background)
    ├── java-builds.sh ← Compila Spring Boot y construye Docker (background)
    ├── oke-setup.sh ← Configura kubectl y namespace OKE (background)
    ├── db-setup.sh ← Configura Oracle Autonomous DB (background)
    ├── kube_token_cache.sh ← Refresca el token de autenticación de kubectl
    │
    ├── main-destroy.sh ← Orquestador del teardown
    ├── os-destroy.sh ← Limpia Object Storage (background)
    ├── repo-destroy.sh ← Limpia Container Registry (background)
    ├── lb-destroy.sh ← Elimina el Load Balancer (background)
    │
    └── python/
        ├── generate-unique-key.py ← Genera el ID único del entorno
        └── process-cluster-ocid-json.py ← Extrae el OCID del clúster OKE
```
---

## 🏗️ Arquitectura del Flujo Completo
```
Usuario
│
├── source env.sh
│ └── Carga variables, aliases y state-functions.sh en el shell actual
│
├── source setup.sh
│ └── utils/main-setup.sh (orquestador con hitos reanudables)
│ ├── [secuencial] Recolecta identidad del usuario OCI
│ ├── [background] utils/terraform.sh → crea VCN, OKE, ATP, registry
│ ├── [background] utils/java-builds.sh → compila JAR + imagen Docker
│ ├── [background] utils/oke-setup.sh → configura kubectl + namespace
│ ├── [background] utils/db-setup.sh → configura Autonomous DB
│ └── [secuencial] Crea Kubernetes Secrets y verifica setup
│
└── source destroy.sh
└── utils/main-destroy.sh (orquestador del teardown)
├── [background] utils/os-destroy.sh → vacía y elimina bucket
├── [background] utils/repo-destroy.sh → elimina imágenes Docker
├── [background] utils/lb-destroy.sh → elimina Load Balancer
└── [sincrónico] terraform destroy → destruye toda la infraestructura
```

---

## 📄 Descripción Detallada: Scripts Raíz

---

### [`env.sh`](./env.sh)

**Propósito:** Inicializar el entorno de trabajo. Es el **primer script que debe
ejecutarse** en cualquier sesión de Cloud Shell, y también se carga
automáticamente al abrir Cloud Shell si se agregó a `~/.bashrc` durante la
configuración inicial.

**¿Qué hace paso a paso?**

1. **Detecta el sistema operativo** (Linux vs macOS) para configurar `JAVA_HOME`
   apuntando a GraalVM 22:
   ```bash
   # Linux (Cloud Shell de OCI)
   export JAVA_HOME=/usr/lib64/graalvm/graalvm22-ee-java17
   # macOS (desarrollo local)
   export JAVA_HOME=/Library/Java/JavaVirtualMachines/graalvm-ee-java17-22.x.x/Contents/Home
   ```

2. **Establece `MTDRWORKSHOP_LOCATION`** como la ruta raíz del proyecto usando
   `BASH_SOURCE[0]` — la ruta es dinámica, no hardcodeada, por lo que funciona
   sin importar dónde esté clonado el repositorio.

3. **Configura el directorio de estado** (`MTDRWORKSHOP_STATE_HOME`):
   - Si existe `~/mtdrworkshop-state`, lo usa (entornos LiveLabs pre-configurados)
   - Si no, crea el directorio de estado dentro del proyecto

4. **Crea el directorio de logs** en `$MTDRWORKSHOP_STATE_HOME/log`

5. **Carga `utils/state-functions.sh`** — el motor de hitos que hace todo el
   sistema reanudable

6. **Registra aliases de productividad** para `kubectl`:

   | Alias | Equivale a | Uso |
   |---|---|---|
   | `k` | `kubectl` | Shorthand general |
   | `pods` | `kubectl get po --all-namespaces` | Ver todos los pods |
   | `services` | `kubectl get services --all-namespaces` | Ver todos los servicios e IPs |
   | `deployments` | `kubectl get deployments --all-namespaces` | Ver deployments |
   | `secrets` | `kubectl get secrets --all-namespaces` | Ver secrets de Kubernetes |
   | `mtdrworkshop` | Snapshot completo del namespace | Estado general de la app |

**Variables que exporta al entorno:**
```bash
MTDRWORKSHOP_LOCATION    # Ruta raíz del proyecto (absoluta)
MTDRWORKSHOP_STATE_HOME  # Directorio de persistencia de hitos y estado
MTDRWORKSHOP_LOG         # Directorio donde se escriben todos los logs
JAVA_HOME                # Ruta a la instalación de GraalVM 22
```

**Ejemplo de uso:**
```bash
source infraestructura/scripts/env.sh
echo $MTDRWORKSHOP_LOCATION  # /home/user/reacttodo/oci_devops_project
pods                          # Lista todos los pods del clúster
```

---

### [`setup.sh`](./setup.sh)

**Propósito:** Punto de entrada del aprovisionamiento. Script delgado ("thin
wrapper") que actúa como guardián: verifica precondiciones antes de delegar
todo el trabajo a `utils/main-setup.sh`.

**¿Qué hace?**

1. **Verifica si el setup ya fue completado** con `state_done SETUP_VERIFIED`.
   Si ya completó, lo informa y sale sin relanzar nada.

2. **Detecta si `main-setup.sh` ya está corriendo** consultando los procesos
   activos, para evitar ejecuciones paralelas accidentales.

3. **Configura redirección de logs**: usa `tee` para enviar todo el output
   simultáneamente al terminal *y* al archivo `log/main-setup.log`.

4. **Delega a `utils/main-setup.sh`** toda la lógica real.

**¿Por qué existe separado de `main-setup.sh`?**
Separar el "guardián de entrada" de la "lógica de negocio" sigue el principio de
responsabilidad única. `setup.sh` solo se preocupa de si debe arrancar o no;
`main-setup.sh` se preocupa de cómo hacerlo.

---

### [`destroy.sh`](./destroy.sh)

**Propósito:** Punto de entrada del teardown. Destruye toda la infraestructura
en OCI y archiva el estado del entorno.

**¿Qué hace?**

1. **Invoca `utils/main-destroy.sh`** de forma sincrónica (espera a que termine).

2. **Archiva el estado** en un directorio con timestamp una vez completado el
   destroy:
```
toDelete_YYYYMMDD_HHMMSS/
├── state/ # Todos los hitos completados
├── tls/ # Certificados TLS generados
├── wallet/ # Wallet de conexión a Oracle ATP
└── log/ # Todos los logs de la ejecución completa
```

3. **Muestra una checklist de verificación manual** con los recursos de OCI que
requieren confirmación visual en la consola web para asegurar que no quedó
nada corriendo y generando costos.

**Nota importante:** El directorio `toDelete_*` puede eliminarse manualmente
una vez verificado que todos los recursos en la consola de OCI han desaparecido.

---

## 📄 Descripción Detallada: `utils/`

---

### [`utils/state-functions.sh`](./utils/state-functions.sh)

**Propósito:** El **núcleo del sistema**. Define el motor de hitos que hace
posible que todo el proceso de setup sea reanudable e idempotente.

Los hitos se persisten como **archivos en el directorio `state/`**. La
existencia de un archivo indica que ese paso fue completado exitosamente. Si
Cloud Shell se cierra o el proceso se interrumpe, al retomar el setup, cada
paso verifica si su hito ya existe y lo omite si ya fue completado.

**Funciones que define:**

| Función | Firma | Descripción |
|---|---|---|
| `state_done` | `state_done HITO` | Retorna `0` (true) si el archivo `state/HITO` existe |
| `state_set` | `state_set HITO valor` | Escribe el valor en `state/HITO` (crea el archivo) |
| `state_set_done` | `state_set_done HITO` | Crea el archivo `state/HITO` sin contenido (marca completado) |
| `state_get` | `state_get HITO` | Lee y devuelve el contenido de `state/HITO` |

**Patrón reanudable que usa todo el sistema:**
```bash
# Si el hito ya existe de una ejecución anterior, este bloque se salta completamente
while ! state_done USER_OCID; do
 read -p "Ingresa tu OCI User OCID: " USER_OCID
 # validar con oci iam user get...
 if [ validación exitosa ]; then
     state_set USER_OCID "$USER_OCID"  # Marca como completado y guarda el valor
 fi
done
# En ejecuciones futuras, USER_OCID ya existe → el while no entra nunca
```

**Para ver el estado actual del proceso:**
```bash
ls $MTDRWORKSHOP_STATE_HOME/state/
```

**Para reiniciar un hito específico (avanzado):**
```bash
rm $MTDRWORKSHOP_STATE_HOME/state/NOMBRE_HITO
source infraestructura/scripts/setup.sh  # Retoma desde ese hito
```

---

### [`utils/main-setup.sh`](./utils/main-setup.sh)

**Propósito:** El orquestador principal del aprovisionamiento. Es el script más
complejo del sistema — implementa un pipeline secuencial con 5 fases usando el
motor de hitos.

#### Fase 1 — Detección del Tipo de Entorno

Antes de cualquier acción, detecta en qué entorno está corriendo para
adaptar el flujo:

| Tipo de entorno | Condición de detección | Comportamiento |
|---|---|---|
| **Green Button** (LiveLabs) | `$HOME` coincide con `/home/ll[0-9]+_us` | Salta PROVISIONING y K8S — ya están pre-creados por Oracle |
| **Self-hosted** (por defecto) | Ninguna condición especial | Flujo completo: crea compartment, OKE, ATP |
| **BYO K8s** | Variable `$BYO_K8S` definida | Salta la creación de OKE y la VCN; solo crea ATP y registry |

#### Fase 2 — Recolección de Identidad (Secuencial, Interactivo)

Solicita y valida los datos de identidad del usuario antes de crear cualquier
recurso. Cada dato se persiste como hito para no volver a pedirlo:

| Hito | Interacción | Validación |
|---|---|---|
| `USER_OCID` | Solicita el OCID del usuario OCI | `oci iam user get` verifica que esté en estado `ACTIVE` |
| `USER_NAME` | Obtiene el nombre desde el OCID via OCI CLI | Automático, no interactivo |
| `MTDR_KEY` | Genera un ID único via Python | Ejecuta `python/generate-unique-key.py` |
| `RUN_NAME` | Deriva del nombre del directorio padre del proyecto | Regex: `^[a-zA-Z][a-zA-Z0-9]{0,12}$` |
| `TENANCY_OCID` | Lee `$OCI_TENANCY` (disponible en Cloud Shell) | Automático |
| `REGION` | Lee `$OCI_REGION` | Automático |
| `COMPARTMENT_OCID` | Pide uno existente o crea uno nuevo en OCI | Polling cada 60 segundos hasta estado `ACTIVE` |

#### Fase 3 — Lanzamiento en Background (Paralelo)

Una vez recolectados los datos de identidad, lanza cuatro procesos en
background para maximizar el paralelismo y reducir el tiempo total:

```bash
nohup utils/java-builds.sh  &>> log/java-builds.log  &
nohup utils/terraform.sh    &>> log/terraform.log     &  # espera 3 min antes de iniciar
nohup utils/oke-setup.sh    &>> log/oke-setup.log     &
nohup utils/db-setup.sh     &>> log/db-setup.log      &
```

`terraform.sh` espera 3 minutos antes de ejecutar `terraform apply` para
dar tiempo a que el compartment recién creado quede completamente activo en OCI.

#### Fase 4 — Interacción con el Usuario (Mientras el Background Trabaja)

Mientras los cuatro procesos en background trabajan, el script mantiene al
usuario productivo solicitando los datos que no pueden obtenerse automáticamente:

- **Docker login al OCIR**: con reintentos automáticos (hasta 30 intentos,
pausa de 5 segundos entre cada uno) hasta que el registry esté listo
- **DB_PASSWORD**: contraseña para la Autonomous Database
- Requisitos: 12-30 caracteres, ≥1 mayúscula, ≥1 minúscula, ≥1 número
- No puede contener `"admin"` ni comillas dobles
- **UI_USERNAME**: nombre de usuario para la interfaz web de la app
- **UI_PASSWORD**: contraseña para la interfaz web

#### Fase 5 — Sincronización y Finalización

Espera el resultado del proceso de Terraform (con visualización en tiempo real
de la última línea del log), luego:
1. Crea los **Kubernetes Secrets** para las credenciales de BD y UI
2. Actualiza la contraseña del usuario ADMIN en la ATP via OCI CLI
3. Marca el hito `SETUP_VERIFIED` → muestra el mensaje de éxito

---

### [`utils/terraform.sh`](./utils/terraform.sh)

**Propósito:** Wrapper que traduce el sistema de hitos del proyecto al formato
de variables de entorno que Terraform espera.

**¿Qué hace?**

1. **Exporta variables `TF_VAR_*`** leyendo el estado guardado:
```bash
export TF_VAR_ociTenancyOcid=$(state_get TENANCY_OCID)
export TF_VAR_ociUserOcid=$(state_get USER_OCID)
export TF_VAR_ociCompartmentOcid=$(state_get COMPARTMENT_OCID)
export TF_VAR_ociRegionIdentifier=$(state_get REGION)
export TF_VAR_runName=$(state_get RUN_NAME)
export TF_VAR_mtdrDbName=$(state_get MTDR_DB_NAME)
export TF_VAR_mtdrKey=$(state_get MTDR_KEY)
```

2. **En modo BYO K8s**: elimina físicamente `containerengine.tf` y `core.tf`
del directorio de Terraform para que no intente crear el clúster ni la VCN.

3. **Genera `~/.terraformrc`** con una ruta de caché de plugins local,
evitando re-descargar el provider de OCI en cada ejecución (el provider
pesa ~200 MB).

4. **Ejecuta `terraform init`** seguido de **`terraform apply -auto-approve`**

5. Al terminar exitosamente: marca el hito `PROVISIONING` como completado.

---

### [`utils/java-builds.sh`](./utils/java-builds.sh)

**Propósito:** Compilar el proyecto Spring Boot y construir + publicar la imagen
Docker al Container Registry de OCI (OCIR). Se ejecuta en background en
paralelo con Terraform.

**¿Qué hace?**

1. Espera a que `state_done DOCKER_REGISTRY` esté completado (el login a Docker
debe haberse realizado antes de intentar hacer push)
2. Navega al directorio `backend/`
3. Ejecuta `mvn package -DskipTests` para compilar el JAR de Spring Boot
4. Construye la imagen Docker:
```bash
docker build -t ${REGION}.ocir.io/${NAMESPACE}/${RUN_NAME}/${MTDR_KEY}/todolistapp-springboot:latest .
```
5. Hace `docker push` de la imagen al repositorio OCIR creado por Terraform
6. Marca el hito `JAVA_BUILDS` como completado

**Dependencia arquitectónica:** El build de Maven compila el frontend React
**dentro** del JAR de Spring Boot usando el plugin `frontend-maven-plugin`.
El resultado final es un único JAR autocontenido con el backend y el frontend.

---

### [`utils/oke-setup.sh`](./utils/oke-setup.sh)

**Propósito:** Configurar el acceso local a Kubernetes (`kubectl`) apuntando
al clúster OKE recién creado. Se ejecuta en background.

**¿Qué hace?**

1. Espera a que `state_done PROVISIONING` esté completado (OKE debe existir
antes de poder configurar el acceso)
2. Obtiene el OCID del clúster desde los outputs de Terraform
3. Genera el archivo `kubeconfig` local:
```bash
oci ce cluster create-kubeconfig \
  --cluster-id $(state_get OKE_CLUSTER_ID) \
  --region $(state_get REGION) \
  --token-version 2.0.0 \
  --kube-endpoint PUBLIC_ENDPOINT
```
4. Crea el namespace `mtdrworkshop` en el clúster
5. Establece `mtdrworkshop` como el namespace por defecto de `kubectl`
6. Marca el hito `OKE_SETUP` como completado

**Relación con `kube_token_cache.sh`:** El token de autenticación de `kubectl`
expira periódicamente. `kube_token_cache.sh` es invocado automáticamente para
refrescar el token sin requerir una nueva autenticación completa.

---

### [`utils/db-setup.sh`](./utils/db-setup.sh)

**Propósito:** Configurar la Autonomous Database ATP recién creada por Terraform
para ser utilizada por la aplicación Spring Boot. Se ejecuta en background.

**¿Qué hace?**

1. Espera a que `state_done PROVISIONING` esté completado
2. Obtiene el OCID de la base de datos desde los outputs de Terraform
3. Descarga el **wallet de conexión** (certificados TLS para JDBC seguro):
```bash
oci db autonomous-database generate-wallet \
  --autonomous-database-id $(state_get MTDR_DB_OCID) \
  --password $(state_get WALLET_PASSWORD) \
  --file wallet.zip
```
4. Descomprime el wallet en el directorio esperado por Spring Boot
5. Espera a que `state_done DB_PASSWORD` esté completado (el usuario debe
haber ingresado la contraseña interactivamente)
6. Crea el Kubernetes Secret con las credenciales de BD:
```bash
kubectl create secret generic my-secret \
  --from-literal=db_password=$(state_get DB_PASSWORD) \
  --namespace mtdrworkshop
```
7. Marca el hito `DB_SETUP` como completado

---

### [`utils/kube_token_cache.sh`](./utils/kube_token_cache.sh)

**Propósito:** Refrescar el token de autenticación efímero de kubectl/OKE
antes de que expire, sin necesidad de regenerar todo el kubeconfig.

**¿Qué hace?**
OCI Container Engine usa tokens de corta duración para autenticar a `kubectl`.
Este script:
1. Detecta si el token actual está próximo a expirar
2. Solicita un nuevo token al API de OCI
3. Actualiza el campo `token` en el kubeconfig local sin alterar ninguna
otra configuración

**¿Cuándo se ejecuta?**
Se invoca automáticamente como un exec credential plugin desde el archivo
`~/.kube/config`. No es necesario llamarlo manualmente.

---

### [`utils/main-destroy.sh`](./utils/main-destroy.sh)

**Propósito:** Orquestador del teardown. Implementa la destrucción de recursos
en el orden correcto (inverso al de creación).

**¿Qué hace?**

1. **Detecta si es entorno LiveLabs** (`RUN_TYPE=3`) y sale sin hacer nada
— en LiveLabs el entorno es temporal y se destruye automáticamente

2. **Lanza en background** (paralelo) los scripts de limpieza de recursos
que no son gestionados directamente por Terraform:
```bash
nohup utils/os-destroy.sh    &>> log/os-destroy.log    &
nohup utils/repo-destroy.sh  &>> log/repo-destroy.log  &
nohup utils/lb-destroy.sh    &>> log/lb-destroy.log    &
```

3. **Exporta las variables `TF_VAR_*`** necesarias para que Terraform pueda
identificar los recursos a destruir (las lee del estado guardado)

4. **Ejecuta `terraform destroy -auto-approve`** de forma **sincrónica**
(espera a que termine completamente)

5. En modo **BYO K8s**: ejecuta `kubectl delete ns mtdrworkshop` en lugar de
destruir la infraestructura de red

> ⚠️ **Condición de carrera conocida:** `os-destroy.sh`, `repo-destroy.sh` y
> `lb-destroy.sh` se lanzan en background pero `terraform destroy` comienza
> inmediatamente después. Si alguno de esos recursos no termina de limpiarse
> antes de que Terraform intente eliminar el compartment, Terraform puede fallar
> por dependencias pendientes. Solución: revisar `log/os-destroy.log`,
> `log/repo-destroy.log` y `log/lb-destroy.log`, y relanzar `destroy.sh`.

---

### [`utils/os-destroy.sh`](./utils/os-destroy.sh)

**Propósito:** Vaciar y eliminar el bucket de Object Storage antes de que
Terraform intente destruirlo.

**¿Por qué es necesario?**
Terraform no puede eliminar un bucket de OCI que contenga objetos. Este script
los elimina primero, dejando el bucket vacío para que `terraform destroy` lo
pueda borrar sin errores.

**¿Qué hace?**
1. Obtiene el nombre del bucket desde el estado
2. Lista todos los objetos del bucket via OCI CLI
3. Elimina cada objeto individualmente
4. Verifica que el bucket esté vacío antes de terminar

---

### [`utils/repo-destroy.sh`](./utils/repo-destroy.sh)

**Propósito:** Eliminar todas las imágenes Docker del repositorio en el
Container Registry (OCIR) antes de que Terraform intente eliminar el
repositorio.

**¿Por qué es necesario?**
Al igual que los buckets, OCI no permite eliminar un repositorio de Container
Registry que contenga imágenes. Este script las elimina primero.

**¿Qué hace?**
1. Obtiene el OCID del repositorio desde el estado
2. Lista todos los tags (versiones) de la imagen `todolistapp-springboot`
3. Elimina cada imagen via `oci artifacts container image delete`
4. Una vez vacío, Terraform puede eliminar el repositorio correctamente

---

### [`utils/lb-destroy.sh`](./utils/lb-destroy.sh)

**Propósito:** Eliminar el Load Balancer que Kubernetes creó automáticamente
al desplegar el servicio de tipo `LoadBalancer`.

**¿Por qué es necesario?**
Cuando se ejecuta `kubectl apply` con un `Service` de tipo `LoadBalancer`,
OKE aprovisiona automáticamente un Load Balancer en OCI **fuera del estado
de Terraform**. Terraform no sabe que existe, por lo que no lo elimina en el
`destroy`. Este script lo elimina explícitamente.

**¿Qué hace?**
1. Lista los Load Balancers del compartment via OCI CLI
2. Identifica el que corresponde al clúster OKE (por nombre o tags)
3. Lo elimina y espera a que el estado sea `DELETED`

---

## 📄 Descripción Detallada: `utils/python/`

---

### [`utils/python/generate-unique-key.py`](./utils/python/generate-unique-key.py)

**Propósito:** Generar un identificador único alfanumérico corto para diferenciar
los recursos de esta instancia del entorno de otras instancias en el mismo
tenancy.

**¿Por qué es necesario?**
Los nombres de recursos en OCI (buckets, repositorios, etc.) deben ser únicos
dentro del tenancy. Si dos equipos despliegan el mismo proyecto en el mismo
tenancy sin esta clave, sus recursos colisionarían.

**¿Qué hace?**
Genera un string aleatorio de ~6-8 caracteres alfanuméricos en minúsculas, lo
imprime por stdout, y `main-setup.sh` lo captura y guarda en el hito `MTDR_KEY`:
```bash
MTDR_KEY=$(python3 utils/python/generate-unique-key.py)
state_set MTDR_KEY "$MTDR_KEY"
```

El key resultante se usa como sufijo en todos los nombres de recursos:
- VCN: `mtdrworkshop-abc123`
- Bucket: `mtdrworkshop-abc123`
- Cluster: `mtdrworkshopcluster-abc123`

---

### [`utils/python/process-cluster-ocid-json.py`](./utils/python/process-cluster-ocid-json.py)

**Propósito:** Parsear el JSON que devuelve el CLI de OCI al crear el clúster
OKE y extraer el OCID del clúster para guardarlo en el sistema de hitos.

**¿Qué hace?**
Recibe por stdin (o como argumento) el JSON de respuesta de:
```bash
oci ce cluster list --compartment-id $COMPARTMENT_OCID
```
Y extrae el campo `id` del primer (y único) clúster que coincide con el nombre
esperado. El resultado se imprime por stdout para ser capturado:
```bash
CLUSTER_ID=$(oci ce cluster list ... | python3 utils/python/process-cluster-ocid-json.py)
state_set OKE_CLUSTER_ID "$CLUSTER_ID"
```

**¿Por qué Python y no `jq`?**
`jq` no está disponible por defecto en todas las versiones de Cloud Shell de
OCI, mientras que Python 3 sí está garantizado.

---