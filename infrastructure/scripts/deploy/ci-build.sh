#!/bin/bash
set -euo pipefail

export DOCKER_BUILDKIT=1

: "${BUILDRUN_HASH:?BUILDRUN_HASH not set}"
DOCKER_REGISTRY="${OCIR_REGION}.ocir.io/${OCIR_NAMESPACE}/forgetask/mjmnu"
VERSION="${BUILDRUN_HASH}"

echo "[+] Login en OCIR..."
echo "${OCIR_TOKEN}" | docker login "${OCIR_REGION}.ocir.io" \
  --username "${OCIR_USERNAME}" \
  --password-stdin

echo "[+] Login en Docker Hub (para bypass de rate limit)..."
echo "${DOCKERHUB_TOKEN}" | docker login docker.io \
  --username "${DOCKERHUB_USERNAME}" \
  --password-stdin

# ─── Builds secuenciales (Recomendado para 2 OCPU / 8GB RAM) ──────────────────
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