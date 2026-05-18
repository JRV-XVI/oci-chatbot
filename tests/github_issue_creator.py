#!/usr/bin/env python3
"""
Lee el reporte JSON de pytest y crea issues en GitHub
por cada test fallido durante el Deployment Validation.

Uso:
    python tests/github_issue_creator.py /tmp/test-report.json

Variables de entorno requeridas:
    GITHUB_TOKEN      — Personal Access Token con permisos repo
    GITHUB_REPO       — Formato: "org/repo" (ej. "CloudForge/oci-chatbot")

Variables opcionales:
    TARGET_NAMESPACE  — ns-green o ns-blue (para contexto en el issue)
    BUILDRUN_HASH     — Hash del build run (para trazabilidad)
"""
from __future__ import annotations

import json
import os
import sys
from datetime import datetime, timezone

import requests


def _github_headers(token: str) -> dict:
    return {
        "Authorization": f"token {token}",
        "Accept": "application/vnd.github.v3+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }


def create_issue(token: str, repo: str, test: dict, context: dict) -> None:
    test_name = test["nodeid"]
    test_file = test_name.split("::")[0]
    test_func = test_name.split("::")[-1]
    error_detail = (
        test.get("call", {}).get("longrepr", "Sin detalles del error")
    )
    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")

    body = f"""## 🔴 Test falló en Deployment Validation

| Campo | Valor |
|---|---|
| **Test** | `{test_func}` |
| **Archivo** | `{test_file}` |
| **Namespace** | `{context.get('namespace', 'desconocido')}` |
| **Build Hash** | `{context.get('buildrun_hash', 'desconocido')}` |
| **Timestamp** | {timestamp} |
| **Ambiente** | OCI DevOps Blue-Green Pipeline |

### Error

```
{error_detail}
```

### Cómo reproducir localmente

```bash
# Configurar variables
export E2E_BASE_URL="http://160.34.212.184"
export E2E_BROWSER="edge"

# Correr el test específico
pytest {test_name} -v
```

---
*Issue creado automáticamente por el pipeline de CI/CD de ForgeTask*
"""

    payload = {
        "title": f"[CI Failure] {test_func}",
        "body": body,
        "labels": ["bug", "ci-failure", "automated-test"],
    }

    resp = requests.post(
        f"https://api.github.com/repos/{repo}/issues",
        headers=_github_headers(token),
        json=payload,
        timeout=15,
    )

    if resp.status_code == 201:
        print(f"  [+] Issue creado: {resp.json()['html_url']}")
    elif resp.status_code == 422:
        print(f"  [!] Issue duplicado o labels inválidos: {resp.json().get('message')}")
    else:
        print(f"  [x] Error {resp.status_code}: {resp.text[:200]}")


def main() -> None:
    report_path = sys.argv[1] if len(sys.argv) > 1 else "/tmp/test-report.json"

    token = os.environ.get("GITHUB_TOKEN")
    repo = os.environ.get("GITHUB_REPO")
    namespace = os.environ.get("TARGET_NAMESPACE", "desconocido")
    buildrun_hash = os.environ.get("BUILDRUN_HASH", "desconocido")

    context = {
        "namespace": namespace,
        "buildrun_hash": buildrun_hash,
    }

    # Leer reporte
    try:
        with open(report_path) as f:
            report = json.load(f)
    except FileNotFoundError:
        print(f"[x] Reporte no encontrado: {report_path}")
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"[x] Reporte JSON inválido: {e}")
        sys.exit(1)

    tests = report.get("tests", [])
    failed = [t for t in tests if t["outcome"] == "failed"]
    passed = [t for t in tests if t["outcome"] == "passed"]
    skipped = [t for t in tests if t["outcome"] == "skipped"]

    print("\n" + "=" * 50)
    print(f"  Resultados — namespace: {namespace}")
    print("=" * 50)
    print(f"  ✅ Pasaron : {len(passed)}")
    print(f"  ❌ Fallaron: {len(failed)}")
    print(f"  ⏭  Saltados: {len(skipped)}")
    print("=" * 50)

    if not failed:
        print("\n✅ Todos los tests pasaron. Procediendo con el deploy.")
        sys.exit(0)

    # Hay fallos
    print(f"\n[!] {len(failed)} test(s) fallaron:")
    for t in failed:
        print(f"    - {t['nodeid']}")

    if not token or not repo:
        print("\n[!] GITHUB_TOKEN o GITHUB_REPO no configurados.")
        print("    Saltando creación de issues en GitHub.")
        sys.exit(1)

    print(f"\n[+] Creando issues en GitHub ({repo})...")
    for test in failed:
        create_issue(token, repo, test, context)

    sys.exit(1)  # Falla el pipeline


if __name__ == "__main__":
    main()
