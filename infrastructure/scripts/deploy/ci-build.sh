#!/bin/bash
# ci-build.sh - Para OCI DevOps Build Runner (optimizado)
set -euo pipefail

: "${BUILDRUN_HASH:?BUILDRUN_HASH not set}"
DOCKER_REGISTRY="${OCIR_REGION}.ocir.io/${OCIR_NAMESPACE}/forgetask/mjmnu"
VERSION="${BUILDRUN_HASH}"

echo "[+] Login en OCIR..."
echo "${OCIR_TOKEN}" | docker login "${OCIR_REGION}.ocir.io" \
  --username "${OCIR_USERNAME}" \
  --password-stdin

# ─── Pull cache (ignorar si no existe aún) ───────────────────
echo "[+] Pulling cache layers..."
docker pull "${DOCKER_REGISTRY}/forgetask:latest"                    || true
docker pull "${DOCKER_REGISTRY}/forgetask-frontend:latest"           || true
docker pull "${DOCKER_REGISTRY}/forgetask-e2e-tests:latest"          || true
docker pull "${DOCKER_REGISTRY}/forgetask-e2e-orchestrator-fn:latest" || true

# ─── Builds en paralelo ──────────────────────────────────────
echo "[+] Iniciando builds en paralelo..."

docker build \
  --cache-from "${DOCKER_REGISTRY}/forgetask:latest" \
  -t "${DOCKER_REGISTRY}/forgetask:${VERSION}" \
  -t "${DOCKER_REGISTRY}/forgetask:latest" \
  "${OCI_PRIMARY_SOURCE_DIR}/forgetask" &
PID_BACKEND=$!

docker build \
  --cache-from "${DOCKER_REGISTRY}/forgetask-frontend:latest" \
  --build-arg NEXT_PUBLIC_USE_PROXY=true \
  -t "${DOCKER_REGISTRY}/forgetask-frontend:${VERSION}" \
  -t "${DOCKER_REGISTRY}/forgetask-frontend:latest" \
  "${OCI_PRIMARY_SOURCE_DIR}/forgetask-frontend" &
PID_FRONTEND=$!

docker build \
  --cache-from "${DOCKER_REGISTRY}/forgetask-e2e-tests:latest" \
  -f "${OCI_PRIMARY_SOURCE_DIR}/Dockerfile.tests" \
  -t "${DOCKER_REGISTRY}/forgetask-e2e-tests:${VERSION}" \
  -t "${DOCKER_REGISTRY}/forgetask-e2e-tests:latest" \
  "${OCI_PRIMARY_SOURCE_DIR}" &
PID_TESTS=$!

docker build \
  --cache-from "${DOCKER_REGISTRY}/forgetask-e2e-orchestrator-fn:latest" \
  -f "${OCI_PRIMARY_SOURCE_DIR}/infrastructure/oci-e2e-function/Dockerfile" \
  -t "${DOCKER_REGISTRY}/forgetask-e2e-orchestrator-fn:${VERSION}" \
  -t "${DOCKER_REGISTRY}/forgetask-e2e-orchestrator-fn:latest" \
  "${OCI_PRIMARY_SOURCE_DIR}/infrastructure/oci-e2e-function" &
PID_FN=$!

# ─── Esperar builds ──────────────────────────────────────────
echo "[+] Esperando builds..."
FAILED=0
wait $PID_BACKEND  || { echo "[x] Backend build falló";   FAILED=1; }
wait $PID_FRONTEND || { echo "[x] Frontend build falló";  FAILED=1; }
wait $PID_TESTS    || { echo "[x] Tests build falló";     FAILED=1; }
wait $PID_FN       || { echo "[x] Function build falló";  FAILED=1; }

if [ $FAILED -eq 1 ]; then
  echo "[x] Uno o más builds fallaron. Abortando."
  exit 1
fi

echo "[+] Todos los builds completados."

# ─── Push en paralelo ────────────────────────────────────────
echo "[+] Iniciando push en paralelo..."

(docker push "${DOCKER_REGISTRY}/forgetask:${VERSION}" && \
 docker push "${DOCKER_REGISTRY}/forgetask:latest") &
PID_PUSH_BACKEND=$!

(docker push "${DOCKER_REGISTRY}/forgetask-frontend:${VERSION}" && \
 docker push "${DOCKER_REGISTRY}/forgetask-frontend:latest") &
PID_PUSH_FRONTEND=$!

(docker push "${DOCKER_REGISTRY}/forgetask-e2e-tests:${VERSION}" && \
 docker push "${DOCKER_REGISTRY}/forgetask-e2e-tests:latest") &
PID_PUSH_TESTS=$!

(docker push "${DOCKER_REGISTRY}/forgetask-e2e-orchestrator-fn:${VERSION}" && \
 docker push "${DOCKER_REGISTRY}/forgetask-e2e-orchestrator-fn:latest") &
PID_PUSH_FN=$!

# ─── Esperar push ────────────────────────────────────────────
echo "[+] Esperando push..."
FAILED=0
wait $PID_PUSH_BACKEND  || { echo "[x] Push backend falló";   FAILED=1; }
wait $PID_PUSH_FRONTEND || { echo "[x] Push frontend falló";  FAILED=1; }
wait $PID_PUSH_TESTS    || { echo "[x] Push tests falló";     FAILED=1; }
wait $PID_PUSH_FN       || { echo "[x] Push function falló";  FAILED=1; }

if [ $FAILED -eq 1 ]; then
  echo "[x] Uno o más push fallaron."
  exit 1
fi

echo "[+] Build completo. Version: ${VERSION}"