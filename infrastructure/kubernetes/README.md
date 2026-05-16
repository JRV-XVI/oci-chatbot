# Kubernetes

Este directorio contiene los manifests que describen como se despliega Forgetask en OKE.

La carpeta define el estado deseado de backend y frontend, mientras que la ejecucion del despliegue se realiza desde los scripts en [../scripts/deploy](../scripts/deploy).

## Alcance de esta documentacion

Incluye:

- Todos los archivos en [templates](templates) y [generated](generated).
- Relacion operativa con [../scripts/deploy/deploy.sh](../scripts/deploy/deploy.sh).
- Relacion de imagenes con [../../forgetask/Dockerfile](../../forgetask/Dockerfile) y [../../forgetask-frontend/Dockerfile](../../forgetask-frontend/Dockerfile).

## Estructura real actual

```text
kubernetes/
├── templates/
│   ├── forgetask.yaml
│   └── forgetask-frontend.yaml
├── generated/
│   └── .gitignore
└── README.md
```

## Que hace cada archivo

### [templates/forgetask.yaml](templates/forgetask.yaml)

Define los recursos del backend:

- Service tipo LoadBalancer:
  - nombre: forgetask-service
  - puerto externo: 8080
  - targetPort: 8080
- Deployment:
  - nombre: forgetask-deployment
  - replicas: 1
  - imagen: %DOCKER_REGISTRY%/forgetask:%IMAGE_VERSION%
  - imagePullPolicy: Always
  - puerto de contenedor: 8080
  - monta wallet en /app/wallet desde secret db-wallet-secret
  - lee secretos de forgetask-app-secrets para DB_USER, DB_PASSWORD y Telegram
  - incluye topologySpreadConstraints por hostname

Dependencias de secretos para este manifest:

- db-wallet-secret
- forgetask-app-secrets

### [templates/forgetask-frontend.yaml](templates/forgetask-frontend.yaml)

Define los recursos del frontend:

- Service tipo LoadBalancer:
  - nombre: forgetask-frontend-service
  - puerto externo: 80
  - targetPort: 3000
  - externalTrafficPolicy: Local
  - annotation OCI: oci.oraclecloud.com/loadbalancer-policy = IP_HASH
- Deployment:
  - nombre: forgetask-frontend-deployment
  - replicas: 1
  - imagen: %DOCKER_REGISTRY%/forgetask-frontend:%IMAGE_VERSION%
  - imagePullPolicy: Always
  - puerto de contenedor: 3000
  - variable NEXT_PUBLIC_API_URL apuntando a http://forgetask-service:8080
  - incluye topologySpreadConstraints por hostname

### [generated/.gitignore](generated/.gitignore)

Archivo de control para mantener fuera de git los YAML renderizados durante deploy.

Resumen:

- Los YAML finales se generan en [generated](generated) con timestamp.
- Son artefactos temporales por entorno y no deben versionarse.

### [README.md](README.md)

Este documento.

## Placeholders y renderizado

El renderizado lo hace [../scripts/deploy/deploy.sh](../scripts/deploy/deploy.sh).

Placeholders realmente usados en templates actuales:

- %DOCKER_REGISTRY%
- %IMAGE_VERSION%

Placeholders que el script intenta reemplazar pero no aparecen en estos templates:

- %OCI_REGION%
- %UI_USERNAME%

Placeholder legacy no usado actualmente:

- %TODO_PDB_NAME% (logica comentada en deploy.sh)

Salida generada por deploy:

- [generated/forgetask-YYYY-MM-DD_HH:MM:SS.yaml](generated)
- [generated/forgetask-frontend-YYYY-MM-DD_HH:MM:SS.yaml](generated)

## Relacion con Dockerfiles

Las imagenes referenciadas en templates se construyen desde:

### [../../forgetask/Dockerfile](../../forgetask/Dockerfile)

Backend Spring Boot (multi-stage):

- Build stage con maven:3.9.9-eclipse-temurin-21
- Runtime con eclipse-temurin:21-jre-alpine
- Ejecuta como usuario no root
- Expone 8080
- Arranca app.jar con JAVA_OPTS

Mapeo con Kubernetes:

- Imagen esperada en manifest: forgetask
- Puerto esperado por manifest: 8080

### [../../forgetask-frontend/Dockerfile](../../forgetask-frontend/Dockerfile)

Frontend Next.js (multi-stage):

- deps stage con node:20-alpine y npm ci
- build stage con npm run build
- runtime stage con salida standalone
- ejecuta como usuario no root
- expone 3000

Mapeo con Kubernetes:

- Imagen esperada en manifest: forgetask-frontend
- Puerto esperado por manifest: 3000
- Service publica 80 y enruta a 3000

## Flujo de despliegue real

1. Se resuelve DOCKER_REGISTRY e IMAGE_VERSION en deploy.sh.
2. Se renderizan templates backend/frontend hacia [generated](generated).
3. Se aplica kubectl apply en namespace mtdrworkshop.
4. OKE crea load balancers para ambos servicios tipo LoadBalancer.

Script ejecutor:

- [../scripts/deploy/deploy.sh](../scripts/deploy/deploy.sh)

## Dependencias operativas

Antes de aplicar estos manifests deben existir:

- Namespace mtdrworkshop creado por [../scripts/utils/oke-setup.sh](../scripts/utils/oke-setup.sh)
- Acceso kubectl configurado al cluster
- Secret ocir-secret (si la politica de pull lo requiere)
- Secret db-wallet-secret
- Secret forgetask-app-secrets

## Verificacion post deploy

```bash
kubectl get deployments -n mtdrworkshop
kubectl get pods -n mtdrworkshop
kubectl get services -n mtdrworkshop
```

## Limpieza y costos

Ambos servicios son tipo LoadBalancer, por lo que OKE aprovisiona recursos de LB en OCI.

Durante teardown, esos LBs se limpian con [../scripts/utils/lb-destroy.sh](../scripts/utils/lb-destroy.sh) antes o durante destroy global.

## Notas importantes para developers

1. Esta carpeta ya no usa el manifest unico legacy todolistapp-springboot.yaml.
2. El despliegue actual es dual: backend y frontend por separado.
3. En estado actual, build.sh publica backend; frontend puede quedar desactualizado si no se publica su imagen por otro flujo.
4. Cualquier cambio de nombre de imagen o puerto debe mantenerse consistente entre templates y Dockerfiles.