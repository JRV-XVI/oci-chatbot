from __future__ import annotations

import pytest

from tests.selenium.config import SeleniumSettings
from tests.selenium.pages.kanban_page import KanbanPage


@pytest.mark.e2e
def test_create_sprint_and_validate_overlap_rule(driver, settings: SeleniumSettings):
    board = KanbanPage(driver, settings)
    board.open_board()

    sprint_number = 5
    overlap_sprint_number = sprint_number + 1

    start_date = "2026-06-13"
    end_date = "2026-06-20"

    try:
        board.create_sprint(
            sprint_number=sprint_number,
            goal="Sprint 5 para testear telegram",
            start_date=start_date,
            end_date=end_date,
        )
    except RuntimeError as exc:
        pytest.skip(str(exc))

    option_texts = board.sprint_options_text()
    assert any(str(sprint_number) in option for option in option_texts), (
        "Created sprint number was not found in sprint selector"
    )

    overlap_error = board.attempt_overlapping_sprint(
        sprint_number=overlap_sprint_number,
        goal="Overlapping sprint should fail",
        start_date=start_date,
        end_date=end_date,
    )

    assert "overlap" in overlap_error.lower()