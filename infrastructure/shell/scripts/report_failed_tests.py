import json
import os
import sys
import urllib.request

log_path = "/tmp/e2e-logs.txt"
with open(log_path, "r", encoding="utf-8", errors="ignore") as fh:
    logs = fh.read()

idx = logs.rfind('{"created":')
if idx == -1:
    print("No se encontro JSON de pytest en los logs.")
    sys.exit(0)

report = json.loads(logs[idx:])

def _post_json(url, payload, headers):
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers=headers, method="POST")
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.read().decode("utf-8"), resp.getcode()

def create_issue(test_nodeid, error_msg, target_namespace, image_tag):
    gh_token = os.environ.get("GITHUB_TOKEN")
    owner = os.environ.get("GITHUB_OWNER")
    repo = os.environ.get("GITHUB_REPO")
    project_id = os.environ.get("GITHUB_PROJECT_ID")
    
    if not gh_token or not owner or not repo:
        print(" Variables de entorno de GitHub faltantes. Abortando creación de issue.")
        return

    headers = {
        "Authorization": f"Bearer {gh_token}",
        "Accept": "application/vnd.github+json",
        "Content-Type": "application/json",
    }

    title = f"[E2E Fallido] {test_nodeid.split('::')[-1]} en {target_namespace}"
    body = (
        f"**Namespace:** {target_namespace}\n"
        f"**Imagen:** `{image_tag}`\n\n"
        f"**Error:**\n```python\n{error_msg[:3000]}\n```"
    )

    res_body, status = _post_json(
        f"https://api.github.com/repos/{owner}/{repo}/issues",
        {"title": title, "body": body, "labels": ["bug"]},
        headers,
    )
    if status != 201:
        print(f"Fallo al crear Issue: status={status} body={res_body[:500]}")
        return

    issue_node_id = json.loads(res_body)["node_id"]

    query = """
    mutation($projectId: ID!, $contentId: ID!) {
      addProjectV2ItemById(input: {projectId: $projectId, contentId: $contentId}) { item { id } }
    }
    """
    gql_body, gql_status = _post_json(
        "https://api.github.com/graphql",
        {"query": query, "variables": {"projectId": project_id, "contentId": issue_node_id}},
        headers,
    )
    print(f"GraphQL addProjectV2ItemById status={gql_status}")

    gql_data = json.loads(gql_body) if gql_body else {}
    project_item_id = (
        gql_data.get("data", {})
        .get("addProjectV2ItemById", {})
        .get("item", {})
        .get("id")
    )
    if not project_item_id:
        print("No se pudo obtener item id del Project V2 para setear status.")
        return

    fields_query = """
    query($projectId: ID!) {
      node(id: $projectId) {
        ... on ProjectV2 {
          fields(first: 50) {
            nodes {
              ... on ProjectV2SingleSelectField {
                id
                name
                options { id name }
              }
            }
          }
        }
      }
    }
    """
    fields_body, _ = _post_json(
        "https://api.github.com/graphql",
        {"query": fields_query, "variables": {"projectId": project_id}},
        headers,
    )
    fields_data = json.loads(fields_body) if fields_body else {}
    nodes = (
        fields_data.get("data", {})
        .get("node", {})
        .get("fields", {})
        .get("nodes", [])
    )
    status_field = next((n for n in nodes if n and n.get("name") == "status"), None)
    if not status_field:
        print("No se encontro el field 'status' en Project V2.")
        return

    backlog_option = next(
        (o for o in (status_field.get("options") or []) if o and o.get("name") == "Backlog"),
        None,
    )
    if not backlog_option:
        print("No se encontro la opcion 'Backlog' en el field 'status'.")
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
      ) { projectV2Item { id } }
    }
    """
    update_body, update_status = _post_json(
        "https://api.github.com/graphql",
        {
            "query": update_mutation,
            "variables": {
                "projectId": project_id,
                "itemId": project_item_id,
                "fieldId": status_field.get("id"),
                "optionId": backlog_option.get("id"),
            },
        },
        headers,
    )
    print(f"GraphQL status update status={update_status} body={update_body[:200]}")

target_namespace = os.environ.get("TARGET_NAMESPACE", "n/a")
image_tag = os.environ.get("BUILDRUN_HASH", "latest")

for test in report.get("tests", []):
    if test.get("outcome") in ("failed", "error"):
        error_msg = test.get("call", {}).get("crash", {}).get("message", "Error desconocido")
        create_issue(test.get("nodeid"), error_msg, target_namespace, image_tag)
