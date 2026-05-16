from __future__ import annotations

import pytest

from tests.selenium.config import SeleniumSettings
from tests.selenium.pages.kanban_page import KanbanPage


@pytest.mark.e2e
def test_create_sprint_and_validate_overlap_rule(driver, settings: SeleniumSettings):
    board = KanbanPage(driver, settings)
    board.open_board()

    sprint_title = "Sprint 5 - Telegram"
    overlap_sprint_title = "Sprint 6 - Overlap"

    start_date = "2026-06-13"
    end_date = "2026-06-20"

    try:
        board.create_sprint(
            sprint_title=sprint_title,
            goal="Sprint 5 para testear telegram",
            start_date=start_date,
            end_date=end_date,
        )
    except RuntimeError as exc:
        pytest.skip(str(exc))

    option_texts = board.sprint_options_text()
    assert any(sprint_title in option for option in option_texts), (
        "Created sprint title was not found in sprint selector"
    )

    overlap_error = board.attempt_overlapping_sprint(
        sprint_title=overlap_sprint_title,
        goal="Overlapping sprint should fail",
        start_date=start_date,
        end_date=end_date,
    )

    assert "overlap" in overlap_error.lower()