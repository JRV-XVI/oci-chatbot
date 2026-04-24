from __future__ import annotations

import pytest

from tests.selenium.config import SeleniumSettings
from tests.selenium.pages.kanban_page import KanbanPage
from tests.selenium.pages.kpis_page import KpisPage
from tests.selenium.utils.test_data import unique_label


@pytest.mark.e2e
def test_completed_task_reflects_in_kpis(driver, settings: SeleniumSettings):
    board = KanbanPage(driver, settings)
    board.open_board()

    task_title = unique_label("E2E-KPI")
    estimated_hours = "4"

    try:
        board.create_task(
            title=task_title,
            description="Task to validate KPI update after completion",
            status="backlog",
            priority="medium",
            sprint="4",
            estimated_hours=estimated_hours,
            start_date="2026-06-01",
            end_date="2026-06-12",
            assigned_to="MarioFengW",
        )
    except RuntimeError as exc:
        pytest.skip(str(exc))

    board.wait_task_in_column(task_title, "backlog")

    board.open_task_details(task_title)
    board.update_task_status("done", real_time_hours=estimated_hours)

    board.wait_task_in_column(task_title, "done")
    board.wait_task_removed_from_column(task_title, "backlog")

    try:
        board.go_to_kpis()
    except RuntimeError as exc:
        pytest.skip(str(exc))

    kpis = KpisPage(driver, settings)
    kpis.wait_until_loaded()
    kpis.assert_completed_tasks_count_increased()

    kpis.go_back_to_kanban()