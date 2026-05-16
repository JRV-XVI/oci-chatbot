#!/bin/bash
#
# Script de despliegue de microservicios en Kubernetes (OKE).
# Renderiza plantillas YAML reemplazando placeholders con valores
# del entorno/hitos y aplica ambos manifiestos via kubectl.
#
# Usage: ./deploy.sh [istio]
# - Sin argumento: aplica manifiestos directamente.
# - Con argumento 'istio': inyecta sidecar via istioctl.
#
# Globals requeridos:
#   DOCKER_REGISTRY, TODO_PDB_NAME, OCI_REGION, UI_USERNAME
#   MTDRWORKSHOP_LOCATION (raíz del repositorio, seteado por env.sh)
#
# Dependencias:
#   kubectl, sed, funcion state_get disponible en el entorno.

set -e

#Colours
greenColour="\e[0;32m\033[1m"
endColour="\033[0m\e[0m"
redColour="\e[0;31m\033[1m"
blueColour="\e[0;34m\033[1m"
yellowColour="\e[0;33m\033[1m"
purpleColour="\e[0;35m\033[1m"
grayColour="\e[0;37m\033[1m"

SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
REPO_ROOT="$(cd "${MTDRWORKSHOP_LOCATION}/../.." && pwd)"
TEMPLATES_DIR=${REPO_ROOT}/infrastructure/kubernetes/templates
GENERATED_DIR=${REPO_ROOT}/infrastructure/kubernetes/generated

mkdir -p "$GENERATED_DIR"
mkdir -p "$TEMPLATES_DIR"

export IMAGE_NAME_BACKEND=forgetask
export IMAGE_NAME_FRONTEND=forgetask-frontend
read -r -p "[deploy.sh][INPUT] Image version: " IMAGE_VERSION
export IMAGE_VERSION
echo "Image version set to: ${IMAGE_VERSION}"

# Validaciones de variables necesarias para renderizar el manifiesto.
if [ -z "$DOCKER_REGISTRY" ]; then
    export DOCKER_REGISTRY=$(state_get DOCKER_REGISTRY)
    echo -e "${greenColour}[deploy.sh][+]${endColour} DOCKER_REGISTRY set."
fi
if [ -z "$DOCKER_REGISTRY" ]; then
    echo -e "${redColour}[deploy.sh][x]${endColour} DOCKER_REGISTRY env variable needs to be set!"
    exit 1
fi

#if [ -z "$TODO_PDB_NAME" ]; then
#    export TODO_PDB_NAME=$(state_get MTDR_DB_NAME)
#    echo -e "${greenColour}[deploy.sh][+]${endColour} TODO_PDB_NAME set."
#fi
#if [ -z "$TODO_PDB_NAME" ]; then
#    echo -e "${redColour}[deploy.sh][x]${endColour} TODO_PDB_NAME env variable needs to be set!"
#    exit 1
#fi

if [ -z "$OCI_REGION" ]; then
    echo -e "${yellowColour}[deploy.sh][!]${endColour} OCI_REGION not set. Will get it with state_get"
    export OCI_REGION=$(state_get REGION)
fi
if [ -z "$OCI_REGION" ]; then
    echo -e "${redColour}[deploy.sh][x]${endColour} OCI_REGION env variable needs to be set!"
    exit 1
fi

if [ -z "$UI_USERNAME" ]; then
    echo -e "${yellowColour}[deploy.sh][!]${endColour} UI_USERNAME not set. Will get it with state_get"
    export UI_USERNAME=$(state_get UI_USERNAME)
fi
if [ -z "$UI_USERNAME" ]; then
    echo -e "${redColour}[deploy.sh][x]${endColour} UI_USERNAME env variable needs to be set!"
    exit 1
fi

deploy_manifest() {
    local SERVICE_NAME=$1
    local SERVICE_TYPE=$2
    local CURRENTTIME=$(date '+%F_%H:%M:%S')
    local TEMPLATE=${TEMPLATES_DIR}/${SERVICE_NAME}.yaml
    local OUTPUT=${GENERATED_DIR}/${SERVICE_NAME}-${CURRENTTIME}.yaml

    echo -e "${yellowColour}[deploy.sh][+]${endColour} Rendering manifest for ${SERVICE_NAME}..."

    if [ ! -f "$TEMPLATE" ]; then
        echo -e "${redColour}[deploy.sh][x]${endColour} Template not found: ${TEMPLATE}"
        exit 1
    fi

    # Reemplaza placeholders comunes a ambos servicios
    sed -e "s|%DOCKER_REGISTRY%|${DOCKER_REGISTRY}|g" \
        -e "s|%IMAGE_VERSION%|${IMAGE_VERSION}|g" \
        -e "s|%OCI_REGION%|${OCI_REGION}|g" \
        -e "s|%UI_USERNAME%|${UI_USERNAME}|g" \
        "$TEMPLATE" > "$OUTPUT"

    # Solo el backend necesita el nombre de la PDB de Oracle
#    if [ "$SERVICE_TYPE" = "backend" ]; then
#        sed -i "s|%TODO_PDB_NAME%|${TODO_PDB_NAME}|g" "$OUTPUT"
#    fi

    echo -e "${greenColour}[deploy.sh][+]${endColour} Manifest generated: ${OUTPUT}"

    # Aplica el manifiesto — con o sin sidecar Istio
    if [ "$DEPLOY_MODE" != "istio" ]; then
        kubectl apply -f "$OUTPUT" -n mtdrworkshop
    else
        kubectl apply -f <(istioctl kube-inject -f "$OUTPUT") -n mtdrworkshop
    fi

    echo -e "${greenColour}[deploy.sh][+]${endColour} ${SERVICE_NAME} deployed."
}

echo -e "\n${yellowColour}[deploy.sh][+]${endColour} Starting deployment — $(date '+%F %H:%M:%S')"

deploy_manifest "$IMAGE_NAME_BACKEND"  "backend"
deploy_manifest "$IMAGE_NAME_FRONTEND" "frontend"

echo -e "\n${greenColour}[deploy.sh][+]${endColour} All services deployed to namespace: mtdrworkshop"

# TODO(devops@local): unificar estrategia de reemplazo de placeholders
# (sed -i y /tmp) para evitar duplicidad y reducir riesgo de inconsistencias.
