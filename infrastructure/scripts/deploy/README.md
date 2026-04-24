# Deploy de Aplicacion

Esta carpeta contiene scripts para construir y desplegar Forgetask cuando la infraestructura OCI ya existe.

Su objetivo es el ciclo diario de desarrollo: build de imagenes y redeploy en Kubernetes, sin volver a ejecutar todo el setup de infraestructura.

## Contexto

- Infraestructura raiz: [../../README.md](../../README.md)
- Scripts de entorno: [../README.md](../README.md)
- Terraform: [../../terraform/README.md](../../terraform/README.md)
- Kubernetes templates/generated: [../../kubernetes/README.md](../../kubernetes/README.md)

## Contenido de la carpeta

```text
infrastructure/scripts/deploy/
├── build.sh
├── deploy.sh
└── README.md
```

## Estado actual del flujo

- [build.sh](build.sh) actualmente construye y publica solo la imagen backend.
- [deploy.sh](deploy.sh) despliega backend y frontend usando templates separados.
- La parte Oracle DB en deploy esta comentada y no participa en el render.
- El modo Istio depende de la variable de entorno DEPLOY_MODE; no se activa automaticamente por argumento CLI en el estado actual del script.

## Prerrequisitos

1. Cargar entorno en la shell actual.

```bash
source ../env.sh
```

2. Haber ejecutado setup del entorno al menos una vez.

```bash
source ../setup.sh
```

3. Herramientas disponibles: docker, kubectl, oci cli y acceso al cluster/registry.
4. Variables de estado accesibles mediante state_get desde [../utils/state-functions.sh](../utils/state-functions.sh).

## Uso rapido

```bash
cd infrastructure/scripts/deploy

source ../env.sh
./build.sh
./deploy.sh
```

Opcional para inyeccion Istio en el estado actual:

```bash
export DEPLOY_MODE=istio
./deploy.sh
```

## Que hace cada archivo

### [build.sh](build.sh)

Responsabilidad:

- Resolver el registry destino y construir la imagen de backend.
- Publicar la imagen en OCIR.

Comportamiento real paso a paso:

1. Define variables de imagen:
   - IMAGE_NAME_BACKEND=forgetask
   - IMAGE_NAME_FRONTEND=forgetask-frontend
   - IMAGE_VERSION=0.1
2. Calcula REPO_ROOT desde MTDRWORKSHOP_LOCATION.
3. Resuelve DOCKER_REGISTRY desde entorno o con state_get DOCKER_REGISTRY.
4. Construye la imagen backend desde [../../../forgetask](../../../forgetask):

```bash
docker build -t ${DOCKER_REGISTRY}/forgetask:0.1 ${REPO_ROOT}/forgetask
```

5. Hace push de backend al registry.
6. Si el push termina bien, elimina la imagen local backend.
7. El bloque de build/push de frontend existe pero esta comentado.

Notas importantes:

- No ejecuta Maven ni empaquetado Java en este script.
- El tag es fijo en 0.1.

### [deploy.sh](deploy.sh)

Responsabilidad:

- Renderizar YAMLs desde templates.
- Aplicar manifests en el namespace mtdrworkshop.

Comportamiento real paso a paso:

1. Calcula rutas:
   - TEMPLATES_DIR = [../../kubernetes/templates](../../kubernetes/templates)
   - GENERATED_DIR = [../../kubernetes/generated](../../kubernetes/generated)
2. Crea directorios templates/generated si no existen.
3. Define nombres y version:
   - IMAGE_NAME_BACKEND=forgetask
   - IMAGE_NAME_FRONTEND=forgetask-frontend
   - IMAGE_VERSION=0.1
4. Resuelve variables requeridas:
   - DOCKER_REGISTRY (entorno o state_get DOCKER_REGISTRY)
   - OCI_REGION (entorno o state_get REGION)
   - UI_USERNAME (entorno o state_get UI_USERNAME)
5. Ejecuta deploy_manifest dos veces:
   - forgetask (backend)
   - forgetask-frontend (frontend)
6. Por cada servicio:
   - Lee template [../../kubernetes/templates/forgetask.yaml](../../kubernetes/templates/forgetask.yaml) o [../../kubernetes/templates/forgetask-frontend.yaml](../../kubernetes/templates/forgetask-frontend.yaml)
   - Genera archivo timestamp en [../../kubernetes/generated](../../kubernetes/generated) con formato nombre-YYYY-MM-DD_HH:MM:SS.yaml
   - Reemplaza placeholders via sed:
     - %DOCKER_REGISTRY%
     - %IMAGE_VERSION%
     - %OCI_REGION%
     - %UI_USERNAME%
   - Aplica con kubectl en namespace mtdrworkshop

Modo Istio en estado actual:

- El script decide entre kubectl apply directo o istioctl kube-inject segun DEPLOY_MODE.
- Aunque el encabezado menciona argumento istio, no hay asignacion DEPLOY_MODE="$1" en el script.
- Resultado: pasar ./deploy.sh istio no cambia nada salvo que DEPLOY_MODE ya este exportada como istio.

Bloques no activos:

- TODO_PDB_NAME y su reemplazo para backend estan comentados.
- SCRIPT_DIR y SERVICE_TYPE no afectan el resultado final actual.

## Variables usadas por los scripts

| Variable | build.sh | deploy.sh | Estado actual |
| --- | --- | --- | --- |
| DOCKER_REGISTRY | Si | Si | Obligatoria (puede venir de state_get) |
| IMAGE_VERSION | Si | Si | Fijada a 0.1 |
| OCI_REGION | No | Si | Obligatoria en deploy |
| UI_USERNAME | No | Si | Obligatoria en deploy |
| TODO_PDB_NAME | No | No | Comentada/no usada |
| DEPLOY_MODE | No | Si | Opcional (istio si se exporta) |

## Artefactos generados

- Imagen backend publicada: DOCKER_REGISTRY/forgetask:0.1
- YAMLs renderizados con timestamp en [../../kubernetes/generated](../../kubernetes/generated)
- Recursos aplicados en namespace mtdrworkshop

## Verificacion post deploy

```bash
kubectl get deployments -n mtdrworkshop
kubectl get pods -n mtdrworkshop
kubectl get services -n mtdrworkshop
```

## Troubleshooting rapido

- Error de registry no definido: verificar DOCKER_REGISTRY o estado con state_get.
- Error template not found: revisar archivos en [../../kubernetes/templates](../../kubernetes/templates).
- No aplica modo istio: exportar DEPLOY_MODE=istio antes de ejecutar [deploy.sh](deploy.sh).
- Imagen frontend desactualizada: hoy build.sh no publica frontend porque ese bloque esta comentado.
