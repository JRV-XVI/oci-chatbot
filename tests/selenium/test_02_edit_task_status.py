from __future__ import annotations

import pytest

from tests.selenium.config import SeleniumSettings
from tests.selenium.pages.kanban_page import KanbanPage
from tests.selenium.utils.test_data import unique_label


@pytest.mark.e2e
def test_edit_task_changes_column_status(driver, settings: SeleniumSettings):
    board = KanbanPage(driver, settings)
    board.open_board()

    task_title = unique_label("E2E-EDIT")

    try:
        board.create_task(
            title=task_title,
            description="Task to validate status edition from dialog",
            status="backlog",
            priority="high",
            sprint="4",
            estimated_hours="4",
            start_date="2026-06-01",
            end_date="2026-06-12",
            assigned_to="MarioFengW",   
        )
    except RuntimeError as exc:
        pytest.skip(str(exc))

    board.wait_task_in_column(task_title, "backlog")

    board.open_task_details(task_title)
    board.update_task_status("done", real_time_hours="4")

    board.wait_task_in_column(task_title, "done")
    board.wait_task_removed_from_column(task_title, "backlog")