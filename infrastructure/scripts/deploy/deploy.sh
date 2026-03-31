#!/bin/bash
#
# Script de despliegue de la aplicacion Spring Boot en Kubernetes.
# Genera un manifiesto temporal a partir de una plantilla y reemplaza
# placeholders con valores del entorno/hitos para luego hacer kubectl apply.
#
# Usage: ./deploy.sh [istio]
# - Sin argumento: aplica manifiesto directo.
# - Con argumento: aplica manifiesto con inyeccion de sidecar via istioctl.
#
# Globals requeridos:
#   DOCKER_REGISTRY, TODO_PDB_NAME, OCI_REGION, UI_USERNAME
#   (si faltan, intenta recuperarlos con state_get)
#
# Dependencias:
#   kubectl, sed, mv, cp, funcion state_get disponible en el entorno.

SCRIPT_DIR=$(pwd)

# Validaciones de variables necesarias para renderizar el manifiesto.
if [ -z "$DOCKER_REGISTRY" ]; then
    export DOCKER_REGISTRY=$(state_get DOCKER_REGISTRY)
    echo "DOCKER_REGISTRY set."
fi
if [ -z "$DOCKER_REGISTRY" ]; then
    echo "Error: DOCKER_REGISTRY env variable needs to be set!"
    exit 1
fi

if [ -z "$TODO_PDB_NAME" ]; then
    export TODO_PDB_NAME=$(state_get MTDR_DB_NAME)
    echo "TODO_PDB_NAME set."
fi
if [ -z "$TODO_PDB_NAME" ]; then
    echo "Error: TODO_PDB_NAME env variable needs to be set!"
    exit 1
fi

if [ -z "$OCI_REGION" ]; then
    echo "OCI_REGION not set. Will get it with state_get"
    export OCI_REGION=$(state_get REGION)
fi
if [ -z "$OCI_REGION" ]; then
    echo "Error: OCI_REGION env variable needs to be set!"
    exit 1
fi

if [ -z "$UI_USERNAME" ]; then
    echo "UI_USERNAME not set. Will get it with state_get"
    export UI_USERNAME=$(state_get UI_USERNAME)
fi
if [ -z "$UI_USERNAME" ]; then
    echo "Error: UI_USERNAME env variable needs to be set!"
    exit 1
fi

# Crea un manifiesto versionado por timestamp para trazabilidad de deploys.
echo "Creating springboot deplyoment and service"
export CURRENTTIME=$( date '+%F_%H:%M:%S' )
echo CURRENTTIME is $CURRENTTIME  ...this will be appended to generated deployment yaml
cp src/main/resources/todolistapp-springboot.yaml todolistapp-springboot-$CURRENTTIME.yaml

# Reemplazo directo (GNU sed) conservado por compatibilidad del flujo original.
sed -i "s|%DOCKER_REGISTRY%|${DOCKER_REGISTRY}|g" todolistapp-springboot-$CURRENTTIME.yaml

# Reemplazos via archivo temporal para compatibilidad entre variantes de sed.
# Se mantiene el orden actual para no alterar el comportamiento existente.
sed -e "s|%DOCKER_REGISTRY%|${DOCKER_REGISTRY}|g" todolistapp-springboot-${CURRENTTIME}.yaml > /tmp/todolistapp-springboot-${CURRENTTIME}.yaml
mv -- /tmp/todolistapp-springboot-$CURRENTTIME.yaml todolistapp-springboot-$CURRENTTIME.yaml
sed -e "s|%TODO_PDB_NAME%|${TODO_PDB_NAME}|g" todolistapp-springboot-${CURRENTTIME}.yaml > /tmp/todolistapp-springboot-${CURRENTTIME}.yaml
mv -- /tmp/todolistapp-springboot-$CURRENTTIME.yaml todolistapp-springboot-$CURRENTTIME.yaml
sed -e "s|%OCI_REGION%|${OCI_REGION}|g" todolistapp-springboot-${CURRENTTIME}.yaml > /tmp/todolistapp-springboot-$CURRENTTIME.yaml
mv -- /tmp/todolistapp-springboot-$CURRENTTIME.yaml todolistapp-springboot-$CURRENTTIME.yaml
sed -e "s|%UI_USERNAME%|${UI_USERNAME}|g" todolistapp-springboot-${CURRENTTIME}.yaml > /tmp/todolistapp-springboot-$CURRENTTIME.yaml
mv -- /tmp/todolistapp-springboot-$CURRENTTIME.yaml todolistapp-springboot-$CURRENTTIME.yaml

# Si se pasa argumento, inyecta sidecar Istio antes del apply.
if [ -z "$1" ]; then
    kubectl apply -f $SCRIPT_DIR/todolistapp-springboot-$CURRENTTIME.yaml -n mtdrworkshop
else
    kubectl apply -f <(istioctl kube-inject -f $SCRIPT_DIR/todolistapp-springboot-$CURRENTTIME.yaml) -n mtdrworkshop
fi

# TODO(devops@local): unificar estrategia de reemplazo de placeholders
# (sed -i y /tmp) para evitar duplicidad y reducir riesgo de inconsistencias.
