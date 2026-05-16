## Resumen de la sesión

### 1. Análisis de la estructura original

Partimos de una estructura problemática donde todo vivía dentro de un wrapper innecesario `MtdrSpring/` y el frontend estaba **anidado dentro del backend** (`src/main/frontend/`), una convención de Maven que impedía una separación real de responsabilidades.

### 2. Decisión de restructura

Se evaluó la arquitectura de tres carpetas `/frontend`, `/backend`, `/infraestructura` y se determinó que era la decisión correcta dado que el proyecto ya corre en OKE con Kubernetes — lo que permite escalar cada pieza de forma independiente. Se identificaron los archivos que romperían con el cambio: `build_spec.yaml`, `API.js`, `pom.xml`, `CorsConfig.java`.

### 3. READMEs generados

Se produjeron **4 documentos completos** para la carpeta `infrastructure/`:

| README | Cobertura |
|---|---|
| [`infrastructure/README.md`](./README.md) | Guía raíz: arquitectura, prerrequisitos OCI, 7 pasos de despliegue, troubleshooting |
| [`kubernetes/README.md`](./kubernetes/README.md) | Manifests, placeholders, flujo `templates → generated → kubectl apply` |
| [`scripts/README.md`](./scripts/README.md) | `env.sh`, `setup.sh`, `destroy.sh`, motor de hitos reanudables, aliases |
| [`scripts/utils/README.md`](./scripts/utils/README.md) | 14 scripts internos documentados con tablas de variables y fases |

Todo basado en el análisis de los archivos `.tf`, `.sh`, `.py` reales del proyecto y la presentación `RetoOrcl_D2.pdf`.

***

## ⚠️ Lo que falta: actualizar rutas en todos los archivos

Este es el paso crítico que puede romper todo si se omite. Al mover los archivos a la nueva estructura, las rutas hardcodeadas quedaron apuntando a ubicaciones que ya no existen.

### Scripts que referencian rutas del proyecto

| Archivo | Rutas que debes actualizar |
|---|---|
| [`scripts/env.sh`](./scripts/env.sh) | `MTDRWORKSHOP_LOCATION` — ruta raíz del proyecto; cualquier `cd ../..` o paths relativos al backend |
| [`scripts/setup.sh`](./scripts/setup.sh) | Path al directorio de `utils/` y a `main-setup.sh` |
| [`scripts/destroy.sh`](./scripts/destroy.sh) | Path al directorio de `utils/` y a `main-destroy.sh` |
| [`scripts/utils/main-setup.sh`](./scripts/utils/main-setup.sh) | Todos los `cd $MTDRWORKSHOP_LOCATION/...` que apunten al backend, frontend o terraform |
| [`scripts/utils/main-destroy.sh`](./scripts/utils/main-destroy.sh) | Paths al directorio de terraform (`../terraform/`) |
| [`scripts/utils/terraform.sh`](./scripts/utils/terraform.sh) | Path al directorio `terraform/` — probablemente `$MTDRWORKSHOP_LOCATION/infrastructure/terraform` |
| [`scripts/utils/java-builds.sh`](./scripts/utils/java-builds.sh) | Path al backend para ejecutar `mvn package` |
| [`scripts/utils/oke-setup.sh`](./scripts/utils/oke-setup.sh) | Path a los manifests de kubernetes (`../kubernetes/`) |
| [`scripts/utils/db-setup.sh`](./scripts/utils/db-setup.sh) | Path al wallet y a los scripts SQL del backend |
| [`scripts/utils/state-functions.sh`](./scripts/utils/state-functions.sh) | Path al directorio de estado (`state/`) dentro de `scripts/` |
| [`scripts/utils/python/*.py`](./scripts/utils/python/) | Verificar si leen/escriben archivos con rutas relativas |
| [`scripts/deploy/build.sh`](./scripts/deploy/build.sh) | Path al `Dockerfile` y al directorio del backend |
| [`scripts/deploy/deploy.sh`](./scripts/deploy/deploy.sh) | Path a `kubernetes/templates/` y `kubernetes/generated/` |

### Archivos del backend y frontend

| Archivo | Qué actualizar |
|---|---|
| `backend/pom.xml` | Remover o actualizar el plugin `frontend-maven-plugin` que antes apuntaba a `src/main/frontend/` |
| `backend/src/main/resources/application.properties` | Verificar paths de certificados o wallets si estaban relativos al JAR |
| `frontend/src/API.js` | Cambiar de URL relativa (`/todolist`) a URL del Load Balancer de OKE, o configurar proxy |

### Pipeline CI/CD

| Archivo | Qué actualizar |
|---|---|
| `build_spec.yaml` (raíz del repo) | Todos los `cd MtdrSpring/backend` → `cd infrastructure/scripts`, los paths de build del frontend y backend por separado |

### Forma recomendada de verificar

Una vez actualizadas las rutas, ejecutar este comando desde la raíz del repo para buscar referencias a la estructura antigua que pudieran haber quedado:

```bash
# Buscar referencias a la carpeta vieja MtdrSpring
grep -r "MtdrSpring" . --include="*.sh" --include="*.tf" --include="*.yaml" --include="*.properties" --include="*.xml"

# Buscar paths que apunten a src/main/frontend (estructura antigua del frontend)
grep -r "src/main/frontend" . --include="*.sh" --include="*.xml" --include="*.yaml"

# Verificar que todos los scripts encuentran sus utils
grep -r "\.\./utils\|\.\/utils" infrastructure/scripts --include="*.sh"
```
