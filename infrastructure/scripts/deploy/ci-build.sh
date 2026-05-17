#!/bin/bash
# ci-build.sh - Para OCI DevOps Build Runner
set -euo pipefail

# Variables inyectadas desde build_spec.yaml (vault + exportedVariables)
DOCKER_REGISTRY="${OCIR_REGION}.ocir.io/${OCIR_NAMESPACE}"
VERSION="${BUILDRUN_HASH}"

echo "[+] Login en OCIR..."
echo "${OCIR_TOKEN}" | docker login "${OCIR_REGION}.ocir.io" \
  --username "${OCIR_NAMESPACE}/${OCIR_USERNAME}" \
  --password-stdin

echo "[+] Build backend (${VERSION})..."
docker build \
  -t "${DOCKER_REGISTRY}/forgetask:${VERSION}" \
  -t "${DOCKER_REGISTRY}/forgetask:latest" \
  "${OCI_PRIMARY_SOURCE_DIR}/forgetask"

echo "[+] Build frontend (${VERSION})..."
docker build \
  --build-arg NEXT_PUBLIC_USE_PROXY=true \
  -t "${DOCKER_REGISTRY}/forgetask-frontend:${VERSION}" \
  -t "${DOCKER_REGISTRY}/forgetask-frontend:latest" \
  "${OCI_PRIMARY_SOURCE_DIR}/forgetask-frontend"

echo "[+] Push backend..."
docker push "${DOCKER_REGISTRY}/forgetask:${VERSION}"
docker push "${DOCKER_REGISTRY}/forgetask:latest"

echo "[+] Push frontend..."
docker push "${DOCKER_REGISTRY}/forgetask-frontend:${VERSION}"
docker push "${DOCKER_REGISTRY}/forgetask-frontend:latest"

echo "[+] Build completo. Version: ${VERSION}"