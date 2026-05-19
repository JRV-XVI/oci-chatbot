import io
import json
import time
import os
import requests
import yaml
from fdk import response
from kubernetes import client, config


def _log(msg, run_id=None):
    ts = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    rid = run_id if run_id else "n/a"
    print(f"[OCI-FN] {ts} run={rid} {msg}", flush=True)

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

def create_github_issue(test_nodeid, error_msg, target_namespace, image_tag, run_id=None):
    """Crea el issue vía REST y lo asigna al Project V2 vía GraphQL."""
    _log(f"Inicio create_github_issue: nodeid={test_nodeid} namespace={target_namespace} image={image_tag}", run_id)
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
    
    res = requests.post(
      f"https://api.github.com/repos/{owner}/{repo}/issues",
      headers=headers,
      json={"title": title, "body": body, "labels": ["bug"]},
    )
    if res.status_code != 201:
        _log(f"Fallo al crear Issue: {res.text}", run_id)
        _log(f"Error creando issue: status={res.status_code} body={res.text[:500]}", run_id)
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
    _log(f"GraphQL Response: {gql_res.text}", run_id)
    _log(f"GraphQL addProjectV2ItemById status={gql_res.status_code}", run_id)

    try:
        gql_data = gql_res.json()
        project_item_id = (
            gql_data.get("data", {})
            .get("addProjectV2ItemById", {})
            .get("item", {})
            .get("id")
        )
        if not project_item_id:
            _log("No se pudo obtener el item id del Project V2 para setear status.", run_id)
            return

        # 3. Setear status = Backlog en Project V2
        fields_query = """
        query($projectId: ID!) {
          node(id: $projectId) {
            ... on ProjectV2 {
              fields(first: 50) {
                nodes {
                  ... on ProjectV2SingleSelectField {
                    id
                    name
                    options {
                      id
                      name
                    }
                  }
                }
              }
            }
          }
        }
        """
        fields_res = requests.post(
            "https://api.github.com/graphql",
            headers=headers,
            json={"query": fields_query, "variables": {"projectId": project_id}},
        )
        _log(f"GraphQL fields status={fields_res.status_code}", run_id)
        fields_data = fields_res.json()

        nodes = (
            fields_data.get("data", {})
            .get("node", {})
            .get("fields", {})
            .get("nodes", [])
        )
        status_field = next((n for n in nodes if n and n.get("name") == "status"), None)
        if not status_field:
            _log("No se encontró el field 'status' en el Project V2.", run_id)
            return

        backlog_option = next(
            (o for o in (status_field.get("options") or []) if o and o.get("name") == "Backlog"),
            None,
        )
        if not backlog_option:
            _log("No se encontró la opción 'Backlog' en el field 'status'.", run_id)
            return

        update_mutation = """
        mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $optionId: String!) {
          updateProjectV2ItemFieldValue(
            input: {
              projectId: $projectId
              itemId: $itemId
              fieldId: $fieldId
              value: { singleSelectOptionId: $optionId }
            }
          ) {
            projectV2Item { id }
          }
        }
        """
        update_res = requests.post(
            "https://api.github.com/graphql",
            headers=headers,
            json={
                "query": update_mutation,
                "variables": {
                    "projectId": project_id,
                    "itemId": project_item_id,
                    "fieldId": status_field.get("id"),
                    "optionId": backlog_option.get("id"),
                },
            },
        )
        _log(f"GraphQL status Update Response: {update_res.text}", run_id)
    except Exception as e:
        _log(f"No se pudo setear status=Backlog en el Project V2: {str(e)}", run_id)

def parse_logs_and_create_issues(logs, target_namespace, image_tag, run_id=None):
    """Busca el JSON impreso al final del log de pytest."""
    try:
        # Extraer solo la parte JSON (ignorar prints anteriores del bash/python)
        json_str = logs[logs.rfind('{"created":'):] 
        report = json.loads(json_str)
        
        for test in report.get("tests", []):
            _log(f"Resultado test: nodeid={test.get('nodeid')} outcome={test.get('outcome')}", run_id)
            if test.get("outcome") == "failed":
                error_msg = test.get("call", {}).get("crash", {}).get("message", "Error desconocido")
                _log(f"Antes de crear issue: nodeid={test.get('nodeid')} namespace={target_namespace} image={image_tag}", run_id)
                create_github_issue(test.get("nodeid"), error_msg, target_namespace, image_tag, run_id)
    except Exception as e:
        _log(f"No se pudo parsear el reporte JSON: {str(e)}", run_id)
        _log(f"Excepcion parseando logs: {type(e).__name__}: {e}", run_id)

def handler(ctx, data: io.BytesIO = None):
    try:
        _log("Inicio handler")
        body = json.loads(data.getvalue().decode("utf-8")) if data else {}
        target_namespace = body.get("targetNamespace")
        image_tag = body.get("imageTag")

        _log(f"Namespace recibido: {target_namespace}")

        if not target_namespace or not image_tag:
            _log("Request invalida: faltan targetNamespace o imageTag")
            return response.RawResponse(ctx, response_data="false", status_code=200)

        run_id = str(int(time.time()))
        job_name = f"forgetask-e2e-{run_id}"
        test_image = f"mx-queretaro-1.ocir.io/{os.environ['OCIR_NAMESPACE']}/forgetask/mjmnu/forgetask-e2e-tests:{image_tag}"

        _log(f"URL objetivo: http://forgetask-frontend-service.{target_namespace}.svc.cluster.local:3000", run_id)
        _log("Antes de llamar a Selenium (lanzar Job con Grid remoto)", run_id)

        # Renderizar Job YAML
        yaml_str = JOB_TEMPLATE.replace("__RUN_ID__", run_id)\
                               .replace("__TEST_IMAGE__", test_image)\
                               .replace("__TARGET_NAMESPACE__", target_namespace)
        job_manifest = yaml.safe_load(yaml_str)

        batch_api, core_api = get_k8s_client()
        _log(f"K8s client inicializado. Job={job_name}", run_id)

        # Lanzar Job
        _log(f"Creando Job {job_name}...", run_id)
        batch_api.create_namespaced_job(namespace="mtdrworkshop", body=job_manifest)
        _log(f"Job creado: {job_name}", run_id)

        # Esperar resultado
        while True:
            time.sleep(10)
            job = batch_api.read_namespaced_job_status(name=job_name, namespace="mtdrworkshop")
            if job.status.succeeded:
                _log("Tests exitosos", run_id)
                return response.RawResponse(ctx, response_data="true", headers={"Content-Type": "text/plain"}, status_code=200)

            if job.status.failed:
                _log("Tests fallidos. Recuperando logs...", run_id)
                pods = core_api.list_namespaced_pod(namespace="mtdrworkshop", label_selector=f"job-name={job_name}")
                if pods.items:
                    pod_name = pods.items[0].metadata.name
                    _log(f"Pod encontrado: {pod_name}", run_id)
                    logs = core_api.read_namespaced_pod_log(name=pod_name, namespace="mtdrworkshop")
                    parse_logs_and_create_issues(logs, target_namespace, image_tag, run_id)
                else:
                    _log("No se encontraron pods para el Job", run_id)

                return response.RawResponse(ctx, response_data="false", headers={"Content-Type": "text/plain"}, status_code=200)

    except Exception as e:
        _log("Fallo en la ejecución de la función.")
        _log(f"Excepcion en handler: {type(e).__name__}: {e}")
        return response.RawResponse(ctx, response_data="false", headers={"Content-Type": "text/plain"}, status_code=200)