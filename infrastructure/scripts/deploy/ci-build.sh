#!/bin/bash
# ci-build.sh - Para OCI DevOps Build Runner (builds paralelos + cache buildx OCIR)
set -euo pipefail

: "${BUILDRUN_HASH:?BUILDRUN_HASH not set}"
DOCKER_REGISTRY="${OCIR_REGION}.ocir.io/${OCIR_NAMESPACE}/forgetask/mjmnu"
VERSION="${BUILDRUN_HASH}"

echo "[+] Login en OCIR..."
echo "${OCIR_TOKEN}" | docker login "${OCIR_REGION}.ocir.io" \
  --username "${OCIR_USERNAME}" \
  --password-stdin

# ─── Setup Buildx ────────────────────────────────────────────
echo "[+] Configurando Docker Buildx..."
docker buildx rm oci-builder >/dev/null 2>&1 || true
docker buildx create --use --name oci-builder --driver docker-container
docker buildx inspect --bootstrap

# ─── Builds secuenciales (Recomendado para 2 OCPU / 8GB RAM) ──────────────────
echo "[+] Iniciando builds de forma secuencial..."

echo "[1/4] Construyendo Backend..."
docker buildx build \
  --push \
  --platform linux/amd64 \
  --provenance=false \
  --pull \
  --cache-from type=registry,ref="${DOCKER_REGISTRY}/forgetask:buildcache" \
  --cache-to type=registry,ref="${DOCKER_REGISTRY}/forgetask:buildcache,mode=max" \
  -t "${DOCKER_REGISTRY}/forgetask:${VERSION}" \
  -t "${DOCKER_REGISTRY}/forgetask:latest" \
  "${OCI_PRIMARY_SOURCE_DIR}/forgetask"

echo "[2/4] Construyendo Frontend..."
docker buildx build \
  --push \
  --platform linux/amd64 \
  --provenance=false \
  --pull \
  --build-arg NEXT_PUBLIC_USE_PROXY=true \
  --cache-from type=registry,ref="${DOCKER_REGISTRY}/forgetask-frontend:buildcache" \
  --cache-to type=registry,ref="${DOCKER_REGISTRY}/forgetask-frontend:buildcache,mode=max" \
  -t "${DOCKER_REGISTRY}/forgetask-frontend:${VERSION}" \
  -t "${DOCKER_REGISTRY}/forgetask-frontend:latest" \
  "${OCI_PRIMARY_SOURCE_DIR}/forgetask-frontend"

echo "[3/4] Construyendo Tests..."
docker buildx build \
  --push \
  --platform linux/amd64 \
  --provenance=false \
  --pull \
  --cache-from type=registry,ref="${DOCKER_REGISTRY}/forgetask-e2e-tests:buildcache" \
  --cache-to type=registry,ref="${DOCKER_REGISTRY}/forgetask-e2e-tests:buildcache,mode=max" \
  -f "${OCI_PRIMARY_SOURCE_DIR}/Dockerfile.tests" \
  -t "${DOCKER_REGISTRY}/forgetask-e2e-tests:${VERSION}" \
  -t "${DOCKER_REGISTRY}/forgetask-e2e-tests:latest" \
  "${OCI_PRIMARY_SOURCE_DIR}"

echo "[4/4] Construyendo Function..."
docker buildx build \
  --push \
  --platform linux/amd64 \
  --provenance=false \
  --pull \
  --cache-from type=registry,ref="${DOCKER_REGISTRY}/forgetask-e2e-orchestrator-fn:buildcache" \
  --cache-to type=registry,ref="${DOCKER_REGISTRY}/forgetask-e2e-orchestrator-fn:buildcache,mode=max" \
  -f "${OCI_PRIMARY_SOURCE_DIR}/infrastructure/oci-e2e-function/Dockerfile" \
  -t "${DOCKER_REGISTRY}/forgetask-e2e-orchestrator-fn:${VERSION}" \
  -t "${DOCKER_REGISTRY}/forgetask-e2e-orchestrator-fn:latest" \
  "${OCI_PRIMARY_SOURCE_DIR}/infrastructure/oci-e2e-function"

echo "[+] Build completo. Version: ${VERSION}"