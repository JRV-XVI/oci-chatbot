from __future__ import annotations

from datetime import date, timedelta
from uuid import uuid4


def unique_label(prefix: str) -> str:
    suffix = uuid4().hex[:8]
    return f"{prefix}-{suffix}"


def date_plus(days: int) -> str:
    return (date.today() + timedelta(days=days)).isoformat()
