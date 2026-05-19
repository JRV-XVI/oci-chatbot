import io
import json
import time
import os
import requests
import yaml
from fdk import response
from kubernetes import client


def _log(msg, run_id=None):
    ts = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    rid = run_id if run_id else "n/a"
    print(f"[OCI-FN] {ts} run={rid} {msg}", flush=True)


JOB_TEMPLATE = """
apiVersion: batch/v1
kind: Job
metadata:
  name: forgetask-e2e-__RUN_ID__
  namespace: mtdrworkshop
  labels:
    app: forgetask-e2e
    run-id: "__RUN_ID__"
spec:
  backoffLimit: 0
  ttlSecondsAfterFinished: 3600
  activeDeadlineSeconds: 1800
  template:
    spec:
      restartPolicy: Never
      containers:
        - name: pytest-runner
          image: __TEST_IMAGE__
          imagePullPolicy: Always
          env:
            - name: E2E_BROWSER
              value: "chrome"
            - name: E2E_HEADLESS
              value: "true"
            - name: E2E_TIMEOUT_SECONDS
              value: "25"
            - name: TARGET_NAMESPACE
              value: "__TARGET_NAMESPACE__"
            - name: E2E_BASE_URL
              value: "http://forgetask-frontend-service.__TARGET_NAMESPACE__.svc.cluster.local:3000"
            - name: E2E_API_BASE_URL
              value: "http://forgetask-service.__TARGET_NAMESPACE__.svc.cluster.local:8080"
            - name: E2E_SELENIUM_REMOTE_URL
              value: "http://selenium-hub.mtdrworkshop.svc.cluster.local:4444/wd/hub"
            - name: GITHUB_TOKEN
              value: "__GITHUB_TOKEN__"
            - name: GITHUB_OWNER
              value: "__GITHUB_OWNER__"
            - name: GITHUB_REPO
              value: "__GITHUB_REPO__"
            - name: GITHUB_PROJECT_ID
              value: "__GITHUB_PROJECT_ID__"
            - name: BUILDRUN_HASH
              value: "__IMAGE_TAG__"
            - name: E2E_LOGIN_EMAIL
              valueFrom:
                secretKeyRef:
                  name: forgetask-e2e-secrets
                  key: E2E_LOGIN_EMAIL
            - name: E2E_LOGIN_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: forgetask-e2e-secrets
                  key: E2E_LOGIN_PASSWORD
"""


def get_k8s_client():
    configuration = client.Configuration()
    configuration.host = os.environ["OKE_ENDPOINT"]
    configuration.verify_ssl = False
    configuration.api_key = {"authorization": "Bearer " + os.environ["OKE_SA_TOKEN"]}
    client.Configuration.set_default(configuration)
    return client.BatchV1Api(), client.CoreV1Api()


def handler(ctx, data: io.BytesIO = None):
    try:
        _log("Inicio handler")
        body = json.loads(data.getvalue().decode("utf-8")) if data else {}
        target_namespace = body.get("targetNamespace")
        image_tag = body.get("imageTag")

        if not target_namespace or not image_tag:
            _log("Request invalida: faltan targetNamespace o imageTag")
            return response.Response(
                ctx,
                response_data=json.dumps({"result": "FAILURE", "message": "Missing params"}),
                headers={"Content-Type": "application/json"},
            )

        run_id = str(int(time.time()))
        job_name = f"forgetask-e2e-{run_id}"
        ocir_ns = os.environ.get("OCIR_NAMESPACE", "axpqjhfdooxb")
        test_image = f"mx-queretaro-1.ocir.io/{ocir_ns}/forgetask/mjmnu/forgetask-e2e-tests:{image_tag}"

        _log(f"Namespace={target_namespace} Image={test_image}", run_id)

        # Renderizar Job YAML — inyectar credenciales de GitHub
        # para que el pod pueda crear issues directamente
        yaml_str = (
            JOB_TEMPLATE
            .replace("__RUN_ID__", run_id)
            .replace("__TEST_IMAGE__", test_image)
            .replace("__TARGET_NAMESPACE__", target_namespace)
            .replace("__IMAGE_TAG__", image_tag)
            .replace("__GITHUB_TOKEN__", os.environ.get("GITHUB_TOKEN", ""))
            .replace("__GITHUB_OWNER__", os.environ.get("GITHUB_OWNER", ""))
            .replace("__GITHUB_REPO__", os.environ.get("GITHUB_REPO", ""))
            .replace("__GITHUB_PROJECT_ID__", os.environ.get("GITHUB_PROJECT_ID", ""))
        )
        job_manifest = yaml.safe_load(yaml_str)

        batch_api, _ = get_k8s_client()

        # Crear Job y retornar inmediatamente
        _log(f"Creando Job {job_name}...", run_id)
        batch_api.create_namespaced_job(namespace="mtdrworkshop", body=job_manifest)
        _log(f"Job creado. Retornando SUCCESS al pipeline.", run_id)

        # Retornar SUCCESS — el Job corre en background
        # Si los tests fallan, el pod crea issues en GitHub
        # El equipo revisa los issues antes de aprobar el deployment
        return response.Response(
            ctx,
            response_data=json.dumps({
                "result": "SUCCESS",
                "message": f"E2E Job launched: {job_name}",
                "job": job_name,
                "namespace": target_namespace,
            }),
            headers={"Content-Type": "application/json"},
        )

    except Exception as e:
        _log(f"Excepcion en handler: {type(e).__name__}: {e}")
        return response.Response(
            ctx,
            response_data=json.dumps({"result": "FAILURE", "message": str(e)}),
            headers={"Content-Type": "application/json"},
        )