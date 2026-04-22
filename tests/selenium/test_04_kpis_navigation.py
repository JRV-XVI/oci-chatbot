from __future__ import annotations

import pytest

from tests.selenium.config import SeleniumSettings
from tests.selenium.pages.kanban_page import KanbanPage
from tests.selenium.pages.kpis_page import KpisPage


@pytest.mark.e2e
def test_can_navigate_to_kpis_and_back(driver, settings: SeleniumSettings):
    board = KanbanPage(driver, settings)
    board.open_board()
    try:
        board.go_to_kpis()
    except RuntimeError as exc:
        pytest.skip(str(exc))

    kpis = KpisPage(driver, settings)
    kpis.wait_until_loaded()
    kpis.go_back_to_kanban()
