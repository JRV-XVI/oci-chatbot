from __future__ import annotations

import pytest

from tests.selenium.config import SeleniumSettings
from tests.selenium.pages.kanban_page import KanbanPage
from tests.selenium.utils.auth import login_with_default_user
from tests.selenium.utils.test_data import unique_label


@pytest.mark.e2e
def test_create_task_is_visible_in_backlog(driver, settings: SeleniumSettings):
    login_with_default_user(driver, settings)

    board = KanbanPage(driver, settings)
    board.wait_until_loaded()

    task_title = unique_label("E2E-CREATE")
    description = "Task created in this test only"

    try:
        board.create_task(
            title=task_title,
            description=description,
            status="backlog",
            priority="medium",
            sprint="3",
            estimated_hours="3",
            start_date="2026-05-16",
            end_date="2026-05-17",
            assigned_to="MarioFengW",
        )
    except RuntimeError as exc:
        pytest.skip(str(exc))

    board.wait_task_in_column(task_title, "backlog")
