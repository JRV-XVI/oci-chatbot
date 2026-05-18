import io
import json
import time
import os
import logging
import requests
import yaml
from fdk import response
from kubernetes import client, config

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger()

# Embebemos la plantilla aquí porque la función no clona tu repositorio git
JOB_TEMPLATE = """
apiVersion: batch/v1
kind: Job
metadata:
  name: forgetask-e2e-__RUN_ID__
  namespace: mtdrworkshop
spec:
  backoffLimit: 0
  ttlSecondsAfterFinished: 1800
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
            - name: E2E_BASE_URL
              value: "http://forgetask-frontend-service.__TARGET_NAMESPACE__.svc.cluster.local:3000"
            - name: E2E_API_BASE_URL
              value: "http://forgetask-service.__TARGET_NAMESPACE__.svc.cluster.local:8080"
            - name: E2E_SELENIUM_REMOTE_URL
              value: "http://selenium-hub.mtdrworkshop.svc.cluster.local:4444/wd/hub"
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
    """Configura el cliente de K8s usando variables de entorno (ServiceAccount Token)."""
    configuration = client.Configuration()
    configuration.host = os.environ["OKE_ENDPOINT"]
    configuration.verify_ssl = False # En producción, usa el CA del cluster
    configuration.api_key = {"authorization": "Bearer " + os.environ["OKE_SA_TOKEN"]}
    client.Configuration.set_default(configuration)
    return client.BatchV1Api(), client.CoreV1Api()

def create_github_issue(test_nodeid, error_msg, target_namespace, image_tag):
    """Crea el issue vía REST y lo asigna al Project V2 vía GraphQL."""
    gh_token = os.environ["GITHUB_TOKEN"]
    owner = os.environ["GITHUB_OWNER"]
    repo = os.environ["GITHUB_REPO"]
    project_id = os.environ["GITHUB_PROJECT_ID"]
    
    headers = {
        "Authorization": f"Bearer {gh_token}",
        "Accept": "application/vnd.github+json"
    }
    
    # 1. Crear Issue (REST)
    title = f"🔴 [E2E Fallido] {test_nodeid.split('::')[-1]} en {target_namespace}"
    body = f"**Namespace:** {target_namespace}\n**Imagen:** `{image_tag}`\n\n**Error:**\n```python\n{error_msg[:3000]}\n```"
    
    res = requests.post(f"https://api.github.com/repos/{owner}/{repo}/issues", headers=headers, json={"title": title, "body": body})
    if res.status_code != 201:
        logger.error(f"Fallo al crear Issue: {res.text}")
        return
        
    issue_node_id = res.json()["node_id"]
    
    # 2. Agregar al Project V2 (GraphQL)
    query = """
    mutation($projectId: ID!, $contentId: ID!) {
      addProjectV2ItemById(input: {projectId: $projectId, contentId: $contentId}) { item { id } }
    }
    """
    gql_res = requests.post(
        "https://api.github.com/graphql", 
        headers=headers, 
        json={"query": query, "variables": {"projectId": project_id, "contentId": issue_node_id}}
    )
    logger.info(f"GraphQL Response: {gql_res.text}")

def parse_logs_and_create_issues(logs, target_namespace, image_tag):
    """Busca el JSON impreso al final del log de pytest."""
    try:
        # Extraer solo la parte JSON (ignorar prints anteriores del bash/python)
        json_str = logs[logs.rfind('{"created":'):] 
        report = json.loads(json_str)
        
        for test in report.get("tests", []):
            if test.get("outcome") == "failed":
                error_msg = test.get("call", {}).get("crash", {}).get("message", "Error desconocido")
                create_github_issue(test.get("nodeid"), error_msg, target_namespace, image_tag)
    except Exception as e:
        logger.error(f"No se pudo parsear el reporte JSON: {str(e)}")

def handler(ctx, data: io.BytesIO = None):
    try:
        body = json.loads(data.getvalue().decode("utf-8")) if data else {}
        target_namespace = body.get("targetNamespace")
        image_tag = body.get("imageTag")
        
        if not target_namespace or not image_tag:
            return response.RawResponse(ctx, response_data="false", status_code=200)

        run_id = str(int(time.time()))
        job_name = f"forgetask-e2e-{run_id}"
        test_image = f"mx-queretaro-1.ocir.io/{os.environ['OCIR_NAMESPACE']}/forgetask/mjmnu/forgetask-e2e-tests:{image_tag}"

        # Renderizar Job YAML
        yaml_str = JOB_TEMPLATE.replace("__RUN_ID__", run_id)\
                               .replace("__TEST_IMAGE__", test_image)\
                               .replace("__TARGET_NAMESPACE__", target_namespace)
        job_manifest = yaml.safe_load(yaml_str)

        batch_api, core_api = get_k8s_client()
        
        # Lanzar Job
        logger.info(f"Creando Job {job_name}...")
        batch_api.create_namespaced_job(namespace="mtdrworkshop", body=job_manifest)

        # Esperar resultado
        while True:
            time.sleep(10)
            job = batch_api.read_namespaced_job_status(name=job_name, namespace="mtdrworkshop")
            if job.status.succeeded:
                logger.info("Tests exitosos.")
                return response.RawResponse(ctx, response_data="true", headers={"Content-Type": "text/plain"}, status_code=200)
            
            if job.status.failed:
                logger.warning("Tests fallidos. Recuperando logs...")
                pods = core_api.list_namespaced_pod(namespace="mtdrworkshop", label_selector=f"job-name={job_name}")
                if pods.items:
                    pod_name = pods.items[0].metadata.name
                    logs = core_api.read_namespaced_pod_log(name=pod_name, namespace="mtdrworkshop")
                    parse_logs_and_create_issues(logs, target_namespace, image_tag)
                
                return response.RawResponse(ctx, response_data="false", headers={"Content-Type": "text/plain"}, status_code=200)

    except Exception as e:
        logger.exception("Fallo en la ejecución de la función.")
        return response.RawResponse(ctx, response_data="false", headers={"Content-Type": "text/plain"}, status_code=200)