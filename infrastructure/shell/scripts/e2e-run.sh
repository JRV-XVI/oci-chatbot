#!/bin/bash
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORK_DIR="$(dirname "$DIR")"

BLUE_NS="${BLUE_NAMESPACE:-ns-blue}"
GREEN_NS="${GREEN_NAMESPACE:-ns-green}"

INGRESS_NAME="${INGRESS_NAME:-forgetask-bg-ingress}"

TARGET_NAMESPACE=""
ACTIVE_NAMESPACE=""

BACKEND_DEPLOYMENT_NAME="${BACKEND_DEPLOYMENT_NAME:-forgetask-deployment}"
FRONTEND_DEPLOYMENT_NAME="${FRONTEND_DEPLOYMENT_NAME:-forgetask-frontend-deployment}"
BACKEND_SERVICE_NAME="${BACKEND_SERVICE_NAME:-forgetask-service}"
FRONTEND_SERVICE_NAME="${FRONTEND_SERVICE_NAME:-forgetask-frontend-service}"

echo ">> DEBUG: Variables de entorno actuales:"
env | grep -E "OCIR|GITHUB|OKE|JOB|INGRESS|BLUE|GREEN|NAMESPACE|DEPLOYMENT|SERVICE" | sort || true
echo ">> Fin DEBUG"

echo ">> Inspeccionando Ingress ${INGRESS_NAME} en Blue/Green namespaces para determinar el entorno..."

CANARY_BLUE=$(kubectl get ingress "${INGRESS_NAME}" -n "${BLUE_NS}" -o jsonpath='{.metadata.annotations.nginx\.ingress\.kubernetes\.io/canary}' 2>/dev/null || echo "false")
CANARY_GREEN=$(kubectl get ingress "${INGRESS_NAME}" -n "${GREEN_NS}" -o jsonpath='{.metadata.annotations.nginx\.ingress\.kubernetes\.io/canary}' 2>/dev/null || echo "false")

echo "Target Canary Annotation en Blue (${BLUE_NS}): ${CANARY_BLUE}"
echo "Target Canary Annotation en Green (${GREEN_NS}): ${CANARY_GREEN}"

if [ "${CANARY_BLUE}" = "true" ] && [ "${CANARY_GREEN}" != "true" ]; then
  TARGET_NAMESPACE="${BLUE_NS}"
  ACTIVE_NAMESPACE="${GREEN_NS}"
elif [ "${CANARY_GREEN}" = "true" ] && [ "${CANARY_BLUE}" != "true" ]; then
  TARGET_NAMESPACE="${GREEN_NS}"
  ACTIVE_NAMESPACE="${BLUE_NS}"
else
  echo "ERROR: Configuración anómala de Ingress de OCI. Ninguno o ambos están marcados como Canary."
  exit 1
fi

export TARGET_NAMESPACE

echo "Namespace activo (Producción) detectado: ${ACTIVE_NAMESPACE}"
echo "Namespace target (Idle/Nuevo) detectado: ${TARGET_NAMESPACE}"

kubectl get namespace "${TARGET_NAMESPACE}"
kubectl rollout status deployment/"${BACKEND_DEPLOYMENT_NAME}" -n "${TARGET_NAMESPACE}" --timeout=300s
kubectl rollout status deployment/"${FRONTEND_DEPLOYMENT_NAME}" -n "${TARGET_NAMESPACE}" --timeout=300s
kubectl get svc "${BACKEND_SERVICE_NAME}" -n "${TARGET_NAMESPACE}"
kubectl get svc "${FRONTEND_SERVICE_NAME}" -n "${TARGET_NAMESPACE}"

RUN_ID="$(date +%s)"
JOB_NAME="forgetask-e2e-${RUN_ID}"
TEST_IMAGE="${OCIR_REGION}.ocir.io/${OCIR_NAMESPACE}/forgetask/mjmnu/forgetask-e2e-tests:${BUILDRUN_HASH:-latest}"

echo "Namespace Target detectado: ${TARGET_NAMESPACE}"
echo "Job: ${JOB_NAME}"
echo "Namespace Job: ${JOB_NAMESPACE}"
echo "Image: ${TEST_IMAGE}"

export JOB_NAME
export TEST_IMAGE

if command -v envsubst >/dev/null 2>&1; then
    envsubst < "${WORK_DIR}/templates/e2e-job.yaml.tpl" | kubectl apply -n "${JOB_NAMESPACE}" -f -
else
    eval "cat <<EOF
$(cat "${WORK_DIR}/templates/e2e-job.yaml.tpl")
EOF
" | kubectl apply -n "${JOB_NAMESPACE}" -f -
fi

echo "Job creado. Esperando resultado..."

TIMEOUT=${E2E_TIMEOUT_SECONDS:-2700}
ELAPSED=0
INTERVAL=${INTERVAL:-15}

while [ "${ELAPSED}" -lt "${TIMEOUT}" ]; do
  SUCCEEDED="$(kubectl get job "${JOB_NAME}" -n "${JOB_NAMESPACE}" -o jsonpath='{.status.succeeded}' 2>/dev/null || echo "0")"
  FAILED="$(kubectl get job "${JOB_NAME}" -n "${JOB_NAMESPACE}" -o jsonpath='{.status.failed}' 2>/dev/null || echo "0")"

  echo "[${ELAPSED}s] succeeded=${SUCCEEDED} failed=${FAILED}"

  if [ "${SUCCEEDED}" = "1" ]; then
    echo "OK: tests pasaron."
    exit 0
  fi

  if [ "${FAILED}" = "1" ]; then
    echo "========================================================="
    echo " FAIL: los tests de Integración Continua (E2E) fallaron."
    echo "========================================================="
    
    POD_NAME="$(kubectl get pods -n "${JOB_NAMESPACE}" -l job-name="${JOB_NAME}" -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || true)"
    if [ -n "${POD_NAME}" ]; then
      echo " Extrayendo logs del pod fallido: ${POD_NAME}..."
      kubectl logs "${POD_NAME}" -n "${JOB_NAMESPACE}" > /tmp/e2e-logs.txt || true
      
      echo " Últimas 200 líneas del log del Pod:"
      tail -n 200 /tmp/e2e-logs.txt || true
    else
      echo " No se pudo encontrar un Pod asociado al Job ${JOB_NAME}."
      echo "Describiendo el Job para mayor contexto del fallo:"
      kubectl describe job "${JOB_NAME}" -n "${JOB_NAMESPACE}" || true
    fi

    if [ -s /tmp/e2e-logs.txt ]; then
      echo " Ejecutando script de parseo y reporte (report_failed_tests.py)..."
      python3 "${WORK_DIR}/scripts/report_failed_tests.py" || python "${WORK_DIR}/scripts/report_failed_tests.py" || echo "⚠️ Falló la ejecución de report_failed_tests.py"
    else
      echo " El archivo de logs está vacío o no se generó. No se procesará el reporte a GitHub."
    fi

    exit 1
  fi

  sleep "${INTERVAL}"
  ELAPSED=$((ELAPSED + INTERVAL))
done

echo "Timeout esperando el Job."
exit 1