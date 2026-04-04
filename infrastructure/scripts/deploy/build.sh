
#!/bin/bash
#
# Script de build y publicacion de la imagen Spring Boot en OCIR.
# Valida DOCKER_REGISTRY, compila el proyecto, construye la imagen
# y realiza push al registry del entorno MTDR.
#
# Usage: ./build.sh
#
# Globals requeridos:
#   MTDRWORKSHOP_LOCATION (raiz del proyecto, donde se encuentran los Dockerfiles)
#   DOCKER_REGISTRY (si no existe, intenta resolverlo con state_get)
#
# Dependencias:
#   mvn, docker, funcion state_get disponible en el entorno.

#-----Colours-----#
greenColour="\e[0;32m\033[1m"
redColour="\e[0;31m\033[1m"
yellowColour="\e[0;33m\033[1m"
endColour="\033[0m\e[0m"

set -e

export IMAGE_NAME_BACKEND=forgetask
export IMAGE_NAME_FRONTEND=forgetask-frontend
export IMAGE_VERSION=0.1

# Valida y/o recupera el registry desde el sistema de hitos.
if [ -z "$DOCKER_REGISTRY" ]; then
    export DOCKER_REGISTRY=$(state_get DOCKER_REGISTRY)
    echo "${greenColour}[+]${endColour} DOCKER_REGISTRY set."
fi
if [ -z "$DOCKER_REGISTRY" ]; then
    echo -e "${redColour}[Error]${endColour} DOCKER_REGISTRY env variable needs to be set!"
    exit 1
fi

export IMAGE_BACKEND=${DOCKER_REGISTRY}/${IMAGE_NAME_BACKEND}:${IMAGE_VERSION}
export IMAGE_FRONTEND=${DOCKER_REGISTRY}/${IMAGE_NAME_FRONTEND}:${IMAGE_VERSION}

echo -e "${greenColour}==> [1/2]${endColour} Building backend image..."
docker build -t ${IMAGE_BACKEND} ${MTDRWORKSHOP_LOCATION}/forgetask

# Publica la imagen en OCIR.
docker push ${IMAGE_BACKEND}
if [  $? -eq 0 ]; then
    # Solo elimina imagen local cuando el push ya fue exitoso.
    docker rmi ${IMAGE_BACKEND} #local
fi

echo -e "${greenColour}==> [2/2]${endColour} Building frontend image..."
docker build -t ${IMAGE_FRONTEND} ${MTDRWORKSHOP_LOCATION}/forgetask-frontend

docker push ${IMAGE_FRONTEND}
if [  $? -eq 0 ]; then
    docker rmi ${IMAGE_FRONTEND}
fi

echo -e "${greenColour}[+]${endColour} Images built and pushed successfully to ${DOCKER_REGISTRY}."
# TODO(devops@local): versionar IMAGE_VERSION desde CI/CD (tag git o build id)
# para evitar sobreescritura de imagenes en despliegues consecutivos.