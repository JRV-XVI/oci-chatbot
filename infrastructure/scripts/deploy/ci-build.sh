#!/bin/bash
set -euo pipefail

export DOCKER_BUILDKIT=1

: "${BUILDRUN_HASH:?BUILDRUN_HASH not set}"
DOCKER_REGISTRY="${OCIR_REGION}.ocir.io/${OCIR_NAMESPACE}/forgetask/mjmnu"
BASE_REGISTRY="${OCIR_REGION}.ocir.io/${OCIR_NAMESPACE}/forgetask/base"
VERSION="${BUILDRUN_HASH}"

echo "[+] Login en OCIR..."
echo "${OCIR_TOKEN}" | docker login "${OCIR_REGION}.ocir.io" \
  --username "${OCIR_USERNAME}" \
  --password-stdin

# ─── Mirror de imágenes base en OCIR (evita Docker Hub rate limit) ────────────
mirror_base_image() {
  local SOURCE_IMAGE="$1"
  local TARGET_IMAGE="$2"

  if docker manifest inspect "${TARGET_IMAGE}" >/dev/null 2>&1; then
    echo "  [mirror] Ya existe en OCIR: ${TARGET_IMAGE}, saltando pull."
    return 0
  fi

  echo "  [mirror] Pulling ${SOURCE_IMAGE} y pushing a OCIR..."
  docker pull "${SOURCE_IMAGE}"
  docker tag "${SOURCE_IMAGE}" "${TARGET_IMAGE}"
  docker push "${TARGET_IMAGE}"
  echo "  [mirror] OK: ${TARGET_IMAGE}"
}

echo "[+] Verificando imágenes base en OCIR..."
mirror_base_image "maven:3.9.9-eclipse-temurin-21"   "${BASE_REGISTRY}/maven:3.9.9-eclipse-temurin-21"
mirror_base_image "eclipse-temurin:21-jre-alpine"    "${BASE_REGISTRY}/eclipse-temurin:21-jre-alpine"
mirror_base_image "node:20-alpine"                   "${BASE_REGISTRY}/node:20-alpine"
mirror_base_image "python:3.13-slim"                 "${BASE_REGISTRY}/python:3.13-slim"

# ─── Builds secuenciales ──────────────────────────────────────────────────────
echo "[+] Iniciando builds de forma secuencial..."

echo "[1/3] Construyendo Backend..."
docker build \
  --build-arg BUILDKIT_INLINE_CACHE=1 \
  -t "${DOCKER_REGISTRY}/forgetask:${VERSION}" \
  -t "${DOCKER_REGISTRY}/forgetask:latest" \
  "${OCI_PRIMARY_SOURCE_DIR}/forgetask"
docker push "${DOCKER_REGISTRY}/forgetask:${VERSION}"
docker push "${DOCKER_REGISTRY}/forgetask:latest"

echo "[2/3] Construyendo Frontend..."
docker build \
  --build-arg NEXT_PUBLIC_USE_PROXY=true \
  --no-cache \
  -t "${DOCKER_REGISTRY}/forgetask-frontend:${VERSION}" \
  -t "${DOCKER_REGISTRY}/forgetask-frontend:latest" \
  "${OCI_PRIMARY_SOURCE_DIR}/forgetask-frontend"
docker push "${DOCKER_REGISTRY}/forgetask-frontend:${VERSION}"
docker push "${DOCKER_REGISTRY}/forgetask-frontend:latest"

echo "[3/3] Construyendo Tests..."
docker build \
  --build-arg BUILDKIT_INLINE_CACHE=1 \
  -f "${OCI_PRIMARY_SOURCE_DIR}/Dockerfile.tests" \
  -t "${DOCKER_REGISTRY}/forgetask-e2e-tests:${VERSION}" \
  -t "${DOCKER_REGISTRY}/forgetask-e2e-tests:latest" \
  "${OCI_PRIMARY_SOURCE_DIR}"
docker push "${DOCKER_REGISTRY}/forgetask-e2e-tests:${VERSION}"
docker push "${DOCKER_REGISTRY}/forgetask-e2e-tests:latest"

echo "[+] Build completo. Version: ${VERSION}"