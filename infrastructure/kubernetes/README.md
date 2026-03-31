# Kubernetes

Este directorio contiene los **manifests de Kubernetes** que definen cómo se
despliega la aplicación MTDR en Oracle Container Engine for Kubernetes (OKE).

La filosofía es separar claramente la **definición del despliegue** (qué debe
correr y cómo) de la **ejecución del despliegue** (los scripts que lo aplican).
Los templates viven aquí; los scripts que los usan viven en `../scripts/deploy/`.

> 📖 Para entender el contexto completo del proyecto:
> - Infraestructura raíz: [`../README.md`](../README.md)
> - Scripts de despliegue: [`../scripts/deploy/README.md`](../scripts/deploy/README.md)
> - Scripts de operación del entorno: [`../scripts/README.md`](../scripts/README.md)
> - Infraestructura Terraform (clúster OKE): [`../terraform/README.md`](../terraform/README.md)

---

## Estructura

```text
kubernetes/
├── templates/
│   └── todolistapp-springboot.yaml   ← Manifest plantilla con placeholders
├── generated/
│   └── .gitignore                    ← Los YAMLs generados no entran al repo
└── README.md
```

### `templates/`

Contiene los manifests **base** de la aplicación. Estos archivos usan
placeholders del formato `%NOMBRE%` en lugar de valores reales porque los
valores (URL del registry, región, nombre de BD) dependen del entorno y
cambian por ejecución.

Nunca deben contener credenciales ni valores hardcodeados de entornos reales.

### `generated/`

Aquí aterrizan los YAML procesados que genera `../scripts/deploy/deploy.sh`
cada vez que se hace un despliegue. Cada archivo tiene un timestamp en el
nombre para facilitar el debugging:
```
todolistapp-springboot-2026-03-31_11:30:00.yaml
```

Esta carpeta está en `.gitignore` — los archivos generados son efímeros,
específicos de cada entorno y no deben versionarse.

---

## Manifest: `templates/todolistapp-springboot.yaml`

Este es el único manifest del proyecto. Define los dos recursos Kubernetes
necesarios para que la aplicación esté accesible desde internet:

| Recurso Kubernetes | Tipo | Propósito |
|---|---|---|
| `Deployment` | `apps/v1` | Define cuántas réplicas del pod corren y qué imagen usan |
| `Service` | `v1` (LoadBalancer) | Expone el Deployment al exterior con una IP pública |

### Namespace

Todos los recursos se crean dentro del namespace:
```
mtdrworkshop
```

Este namespace es creado durante el setup por
[`../scripts/utils/oke-setup.sh`](../scripts/utils/oke-setup.sh).

### Placeholders

El manifest usa 4 placeholders que `../scripts/deploy/deploy.sh` sustituye
con `sed` antes de ejecutar `kubectl apply`:

| Placeholder | Variable de entorno | Descripción |
|---|---|---|
| `%DOCKER_REGISTRY%` | `DOCKER_REGISTRY` | URL base del Container Registry en OCIR |
| `%TODO_PDB_NAME%` | `TODO_PDB_NAME` | Nombre de la Pluggable Database en Oracle ATP |
| `%OCI_REGION%` | `OCI_REGION` | Región de OCI donde corre el entorno |
| `%UI_USERNAME%` | `UI_USERNAME` | Usuario configurado para la interfaz web |

Ejemplo de cómo luce el placeholder antes de ser procesado:

```yaml
image: %DOCKER_REGISTRY%/todolistapp-springboot:0.1
```

Y así queda después del procesamiento por `deploy.sh`:

```yaml
image: sa-saopaulo-1.ocir.io/axyz123/mtdrworkshop/todolistapp-springboot:0.1
```

Los valores reales de estas variables son recuperados por `deploy.sh` desde
el sistema de hitos persistido por
[`../scripts/utils/state-functions.sh`](../scripts/utils/state-functions.sh).

---

## Flujo completo de un despliegue

```text
templates/todolistapp-springboot.yaml
          │
          │  (1) deploy.sh copia el template
          ▼
generated/todolistapp-springboot-<timestamp>.yaml
          │
          │  (2) deploy.sh sustituye los 4 placeholders con sed
          │      %DOCKER_REGISTRY%  →  URL real del OCIR
          │      %TODO_PDB_NAME%    →  Nombre real de la BD
          │      %OCI_REGION%       →  Región real de OCI
          │      %UI_USERNAME%      →  Usuario real de la UI
          │
          │  (3) kubectl apply -f <yaml-generado> -n mtdrworkshop
          ▼
Pods corriendo en OKE (namespace: mtdrworkshop)
          │
          │  (4) OKE aprovisiona un Load Balancer automáticamente
          ▼
IP pública del Load Balancer  →  accesible desde internet
```

El script que ejecuta este flujo es:
[`../scripts/deploy/deploy.sh`](../scripts/deploy/deploy.sh)

---

## Uso rápido

Para aplicar el manifest manualmente (sin pasar por `deploy.sh`), primero
debes sustituir los placeholders tú mismo o usar el script:

```bash
# Opción A — usando deploy.sh (recomendado)
source ../scripts/env.sh
cd ../scripts/deploy
./deploy.sh

# Opción B — aplicar directamente un YAML ya procesado
kubectl apply -f generated/todolistapp-springboot-<timestamp>.yaml -n mtdrworkshop
```

Para verificar el estado después del despliegue:

```bash
kubectl get pods -n mtdrworkshop
kubectl get services -n mtdrworkshop
kubectl get deployments -n mtdrworkshop
```

Si cargaste `../scripts/env.sh`, también puedes usar los aliases:

```bash
pods          # kubectl get po --all-namespaces
services      # kubectl get services --all-namespaces
deployments   # kubectl get deployments --all-namespaces
mtdrworkshop  # snapshot completo del namespace
```

---

## Recursos creados en OCI por Kubernetes

Cuando `kubectl apply` crea un `Service` de tipo `LoadBalancer`, OKE
aprovisiona automáticamente un **Load Balancer en OCI** fuera del estado
de Terraform.

Esto tiene una consecuencia importante durante el teardown: Terraform no
sabe que ese Load Balancer existe, por lo que **no lo elimina** en el
`terraform destroy`.

Para eso existe el script:
[`../scripts/utils/lb-destroy.sh`](../scripts/utils/lb-destroy.sh)

Ese script identifica y elimina el Load Balancer explícitamente antes de
que Terraform intente destruir el compartment.

> ⚠️ Si ejecutas `terraform destroy` directamente sin pasar por
> [`../scripts/destroy.sh`](../scripts/destroy.sh), el Load Balancer puede
> quedar activo en OCI generando costos.

---

## Relación con Terraform

El clúster OKE donde se aplican estos manifests es creado por:
[`../terraform/containerengine.tf`](../terraform/containerengine.tf)

El Container Registry (OCIR) donde viven las imágenes referenciadas en
el manifest es creado por:
[`../terraform/repositories.tf`](../terraform/repositories.tf)

La configuración de `kubectl` apuntando a ese clúster es realizada por:
[`../scripts/utils/oke-setup.sh`](../scripts/utils/oke-setup.sh)

En resumen:
```
terraform/containerengine.tf → Crea el clúster OKE
scripts/utils/oke-setup.sh → Configura kubectl
kubernetes/templates/*.yaml → Define qué corre en el clúster
scripts/deploy/deploy.sh → Aplica los manifests al clúster
```

---

## Convención de archivos en esta carpeta

### Qué debe ir en `templates/`

- Manifests YAML con placeholders `%NOMBRE%`
- Un archivo por componente lógico de la aplicación
- Sin credenciales ni valores reales de entorno
- Versionados en git

### Qué debe ir en `generated/`

- YAMLs procesados con valores reales (generados por `deploy.sh`)
- Ignorados por git via `.gitignore`
- Útiles para debugging post-despliegue

### Qué NO debe ir aquí

- Scripts Bash o Python (van en `../scripts/`)
- Archivos de Terraform (van en `../terraform/`)
- Configuración de la aplicación Spring Boot (va en `backend/src/main/resources/`)
- Secrets de Kubernetes con valores reales

---