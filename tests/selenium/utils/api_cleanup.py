from __future__ import annotations

import json
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


class CleanupApiClient:
    def __init__(self, api_base_url: str, timeout_seconds: int = 20) -> None:
        self.api_base_url = api_base_url.rstrip("/")
        self.timeout_seconds = timeout_seconds

    def _request_json(self, method: str, path: str) -> object | None:
        request = Request(url=f"{self.api_base_url}{path}", method=method)
        with urlopen(request, timeout=self.timeout_seconds) as response:
            body = response.read().decode("utf-8").strip()

        if not body:
            return None

        try:
            return json.loads(body)
        except json.JSONDecodeError:
            return None

    def list_task_ids(self) -> set[str] | None:
        try:
            payload = self._request_json("GET", "/api/tasks")
        except (HTTPError, URLError, OSError, TimeoutError):
            return None

        if not isinstance(payload, list):
            return None

        ids: set[str] = set()
        for item in payload:
            if not isinstance(item, dict):
                continue
            task_id = item.get("id")
            if task_id is None:
                continue
            ids.add(str(task_id))

        return ids

    def list_sprint_ids(self) -> set[int] | None:
        try:
            payload = self._request_json("GET", "/api/sprints")
        except (HTTPError, URLError, OSError, TimeoutError):
            return None

        if not isinstance(payload, list):
            return None

        ids: set[int] = set()
        for item in payload:
            if not isinstance(item, dict):
                continue
            sprint_id = item.get("idSprint", item.get("id"))
            try:
                ids.add(int(sprint_id))
            except (TypeError, ValueError):
                continue

        return ids

    def delete_task(self, task_id: str) -> bool:
        try:
            self._request_json("DELETE", f"/api/tasks/{task_id}")
            return True
        except HTTPError as exc:
            # Already deleted is acceptable for cleanup idempotency.
            return exc.code == 404
        except (URLError, OSError, TimeoutError):
            return False

    def delete_sprint(self, sprint_id: int) -> bool:
        try:
            self._request_json("DELETE", f"/api/sprints/{sprint_id}")
            return True
        except HTTPError as exc:
            # Already deleted is acceptable for cleanup idempotency.
            return exc.code == 404
        except (URLError, OSError, TimeoutError):
            return False