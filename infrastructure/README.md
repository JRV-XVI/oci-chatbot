# Infrastructure - Documentacion General

Este README funciona como punto de entrada de la documentacion de infraestructura.

Aqui se explica el contexto general y se mapea donde vive el detalle tecnico de cada area.

## Objetivo

La carpeta infrastructure contiene todo lo necesario para:

- Aprovisionar recursos en OCI.
- Configurar y operar el entorno.
- Desplegar backend y frontend en OKE.
- Mantener y destruir el entorno de forma controlada.

## Mapa de documentacion

Usa este indice para ir directo al nivel de detalle que necesitas:

| Area | Que cubre | Documentacion |
| --- | --- | --- |
| Terraform | Recursos OCI, variables, outputs, estado actual del modulo | [terraform/README.md](terraform/README.md) |
| Scripts (vision completa) | Flujo setup/destroy, hitos, orquestadores, utilidades | [scripts/README.md](scripts/README.md) |
| Deploy de aplicacion | Build de imagenes y deploy de manifests a Kubernetes | [scripts/deploy/README.md](scripts/deploy/README.md) |
| Kubernetes | Templates, placeholders, generated, relacion con Dockerfiles | [kubernetes/README.md](kubernetes/README.md) |
| Arquitectura global | Vista funcional y de despliegue del proyecto | [../ARQUITECTURA_DEPLOY_OCI.md](../ARQUITECTURA_DEPLOY_OCI.md) |

## Estructura de carpetas

```text
infrastructure/
├── README.md
├── terraform/
├── scripts/
└── kubernetes/
```

## Flujo recomendado (alto nivel)

1. Inicializar entorno de shell y estado:

```bash
source infrastructure/scripts/env.sh
```

2. Aprovisionar infraestructura base:

```bash
source infrastructure/scripts/setup.sh
```

3. Construir y desplegar aplicacion:

```bash
cd infrastructure/scripts/deploy
./build.sh
./deploy.sh
```

4. Destruir entorno cuando ya no se use:

```bash
cd infrastructure/scripts
source destroy.sh
```

## Cuando leer cada README

- Si vas a tocar red, OKE, OCIR u Object Storage: ve a [terraform/README.md](terraform/README.md).
- Si vas a depurar setup/destroy o hitos: ve a [scripts/README.md](scripts/README.md).
- Si vas a iterar backend/frontend en el dia a dia: ve a [scripts/deploy/README.md](scripts/deploy/README.md).
- Si vas a cambiar manifests o placeholders: ve a [kubernetes/README.md](kubernetes/README.md).

## Nota

Este archivo se mantiene intencionalmente corto. El detalle operativo y tecnico vive en los README de cada subcarpeta para evitar duplicacion y desactualizacion.
