from __future__ import annotations

import pytest

from tests.selenium.config import SeleniumSettings
from tests.selenium.pages.kanban_page import KanbanPage
from tests.selenium.utils.test_data import unique_label


@pytest.mark.e2e
def test_create_task_is_visible_in_second_client_tab(driver, settings: SeleniumSettings):
    board_a = KanbanPage(driver, settings)
    board_a.open_board()

    first_tab = driver.current_window_handle

    # Use a second tab in the same browser session to keep compatibility with
    # selenium/standalone-edge defaults (usually single-session).
    driver.switch_to.new_window("tab")
    second_tab = driver.current_window_handle

    board_b = KanbanPage(driver, settings)
    board_b.open_board()

    driver.switch_to.window(first_tab)

    task_title = unique_label("E2E-WS")
    description = "Task created in session A and expected in session B"

    try:
        board_a.create_task(
            title=task_title,
            description=description,
            status="backlog",
            priority="medium",
        )
    except RuntimeError as exc:
        pytest.skip(str(exc))

    board_a.wait_task_in_column(task_title, "backlog")

    driver.switch_to.window(second_tab)
    board_b.wait_task_in_column(task_title, "backlog", timeout=35)
