#!/bin/bash
# local-build.sh - Build y push de imágenes a OCIR desde tu máquina local
set -e

GREEN="\033[0;32m"; RED="\033[0;31m"; YELLOW="\033[0;33m"; RESET="\033[0m"

DOCKER_REGISTRY="${DOCKER_REGISTRY}"
OCIR_REGION="${OCIR_REGION}"
OCIR_NAMESPACE="${OCIR_NAMESPACE}"
OCIR_USERNAME="${OCIR_USERNAME}"
OCIR_TOKEN="${OCIR_TOKEN}"
REPO_ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"

# Versión: usa git commit corto si está disponible, sino "latest"
VERSION=$(git rev-parse --short HEAD 2>/dev/null || echo "latest")

if [ -z "$OCIR_TOKEN" ]; then
  echo -e "${RED}[x]${RESET} OCIR_TOKEN está vacío."
  echo -e "${YELLOW}[!]${RESET} Crea un Auth Token en OCI Console → My Profile → Auth Tokens"
  echo -e "${YELLOW}[!]${RESET} Luego corre: export OCIR_TOKEN='tu-token-aqui'"
  exit 1
fi

if ! docker info > /dev/null 2>&1; then
  echo -e "${RED}[x]${RESET} Docker no está corriendo. Ábrelo e intenta de nuevo."
  exit 1
fi

echo -e "${YELLOW}[+]${RESET} Iniciando sesión en OCIR (${OCIR_REGION}.ocir.io)..."
echo "$OCIR_TOKEN" | docker login "${OCIR_REGION}.ocir.io" \
  --username "${OCIR_USERNAME}" \
  --password-stdin
echo -e "${GREEN}[+]${RESET} Login exitoso."

echo -e "\n${YELLOW}[+]${RESET} Construyendo backend... (versión: ${VERSION})"
docker build -t "${DOCKER_REGISTRY}/forgetask:${VERSION}" \
             -t "${DOCKER_REGISTRY}/forgetask:latest" \
             "${REPO_ROOT}/forgetask"
echo -e "${GREEN}[+]${RESET} Backend listo."

echo -e "\n${YELLOW}[+]${RESET} Construyendo frontend... (versión: ${VERSION})"
docker build --build-arg NEXT_PUBLIC_USE_PROXY=true \
             -t "${DOCKER_REGISTRY}/forgetask-frontend:${VERSION}" \
             -t "${DOCKER_REGISTRY}/forgetask-frontend:latest" \
             "${REPO_ROOT}/forgetask-frontend"
echo -e "${GREEN}[+]${RESET} Frontend listo."

echo -e "\n${YELLOW}[+]${RESET} Subiendo imágenes a OCIR..."
docker push "${DOCKER_REGISTRY}/forgetask:${VERSION}"
docker push "${DOCKER_REGISTRY}/forgetask:latest"
docker push "${DOCKER_REGISTRY}/forgetask-frontend:${VERSION}"
docker push "${DOCKER_REGISTRY}/forgetask-frontend:latest"

echo -e "\n${GREEN}[+]${RESET} ¡Build completo! Versión: ${VERSION}"
echo -e "${YELLOW}[!]${RESET} Ahora en OCI Cloud Shell corre:"
echo -e "    ${GREEN}./deploy.sh${RESET}"