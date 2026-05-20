#!/bin/bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORK_DIR="$(dirname "$DIR")"

BLUE_NS="ns-blue"
GREEN_NS="ns-green"
IMAGE_TAG="${BUILDRUN_HASH:-latest}"

# Se quitaron los '|| echo ""' para forzar que el pipeline se caiga y nos imprima si hay error "Forbidden" (RBAC)
BLUE_FRONT_IMAGE="$(kubectl get deploy forgetask-frontend-deployment -n "${BLUE_NS}" -o jsonpath='{.spec.template.spec.containers[0].image}')"
GREEN_FRONT_IMAGE="$(kubectl get deploy forgetask-frontend-deployment -n "${GREEN_NS}" -o jsonpath='{.spec.template.spec.containers[0].image}')"
BLUE_BACK_IMAGE="$(kubectl get deploy forgetask-deployment -n "${BLUE_NS}" -o jsonpath='{.spec.template.spec.containers[0].image}')"
GREEN_BACK_IMAGE="$(kubectl get deploy forgetask-deployment -n "${GREEN_NS}" -o jsonpath='{.spec.template.spec.containers[0].image}')"

echo "BUILDRUN_HASH esperado: ${IMAGE_TAG}"
echo "BLUE frontend image:  ${BLUE_FRONT_IMAGE}"
echo "GREEN frontend image: ${GREEN_FRONT_IMAGE}"
echo "BLUE backend image:   ${BLUE_BACK_IMAGE}"
echo "GREEN backend image:  ${GREEN_BACK_IMAGE}"

BLUE_MATCH="false"
GREEN_MATCH="false"

if echo "${BLUE_FRONT_IMAGE}" | grep -q ":${IMAGE_TAG}$" && \
   echo "${BLUE_BACK_IMAGE}"  | grep -q ":${IMAGE_TAG}$"; then
  BLUE_MATCH="true"
fi

if echo "${GREEN_FRONT_IMAGE}" | grep -q ":${IMAGE_TAG}$" && \
   echo "${GREEN_BACK_IMAGE}"  | grep -q ":${IMAGE_TAG}$"; then
  GREEN_MATCH="true"
fi

if [ "${BLUE_MATCH}" = "true" ] && [ "${GREEN_MATCH}" = "false" ]; then
  TARGET_NAMESPACE="${BLUE_NS}"
elif [ "${BLUE_MATCH}" = "false" ] && [ "${GREEN_MATCH}" = "true" ]; then
  TARGET_NAMESPACE="${GREEN_NS}"
elif [ "${BLUE_MATCH}" = "true" ] && [ "${GREEN_MATCH}" = "true" ]; then
  echo "Ambiguo: ambos namespaces tienen la imagen ${IMAGE_TAG}."
  exit 1
else
  echo "No pude inferir el namespace objetivo por imagen desplegada."
  echo "Verifica que el Blue/Green stage ya haya desplegado backend y frontend con el tag ${IMAGE_TAG}."
  exit 1
fi

export TARGET_NAMESPACE

kubectl get namespace "${TARGET_NAMESPACE}"
kubectl rollout status deployment/forgetask-deployment -n "${TARGET_NAMESPACE}" --timeout=300s
kubectl rollout status deployment/forgetask-frontend-deployment -n "${TARGET_NAMESPACE}" --timeout=300s
kubectl get svc forgetask-service -n "${TARGET_NAMESPACE}"
kubectl get svc forgetask-frontend-service -n "${TARGET_NAMESPACE}"

RUN_ID="$(date +%s)"
JOB_NAME="forgetask-e2e-${RUN_ID}"
TEST_IMAGE="${OCIR_REGION}.ocir.io/${OCIR_NAMESPACE}/forgetask/mjmnu/forgetask-e2e-tests:${IMAGE_TAG}"

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