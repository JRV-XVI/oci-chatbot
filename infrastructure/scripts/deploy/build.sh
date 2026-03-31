#!/bin/bash
#
# Script de build y publicacion de la imagen Spring Boot en OCIR.
# Valida DOCKER_REGISTRY, compila el proyecto, construye la imagen
# y realiza push al registry del entorno MTDR.
#
# Usage: ./build.sh
#
# Globals requeridos:
#   DOCKER_REGISTRY (si no existe, intenta resolverlo con state_get)
#
# Dependencias:
#   mvn, docker, funcion state_get disponible en el entorno.

export IMAGE_NAME=todolistapp-springboot
export IMAGE_VERSION=0.1


# Valida y/o recupera el registry desde el sistema de hitos.
if [ -z "$DOCKER_REGISTRY" ]; then
    export DOCKER_REGISTRY=$(state_get DOCKER_REGISTRY)
    echo "DOCKER_REGISTRY set."
fi
if [ -z "$DOCKER_REGISTRY" ]; then
    echo "Error: DOCKER_REGISTRY env variable needs to be set!"
    exit 1
fi

export IMAGE=${DOCKER_REGISTRY}/${IMAGE_NAME}:${IMAGE_VERSION}

# Fase de compilacion y empaquetado ejecutable de Spring Boot.
mvn clean package spring-boot:repackage

# Fase de build de imagen Docker usando el Dockerfile local.
docker build -f Dockerfile -t $IMAGE .

# Publica la imagen en OCIR.
docker push $IMAGE
if [  $? -eq 0 ]; then
    # Solo elimina imagen local cuando el push ya fue exitoso.
    docker rmi "$IMAGE" #local
fi

# TODO(devops@local): versionar IMAGE_VERSION desde CI/CD (tag git o build id)
# para evitar sobreescritura de imagenes en despliegues consecutivos.