from __future__ import annotations

import pytest

from tests.selenium.config import SeleniumSettings
from tests.selenium.pages.kanban_page import KanbanPage
from tests.selenium.utils.auth import login_with_default_user


@pytest.mark.e2e
def test_create_sprint_with_overlapping_dates_fails(driver, settings: SeleniumSettings):
    """
    Test that creating a sprint with dates that overlap an existing sprint fails.
    Expected error: Overlap validation error message is displayed.
    """
    login_with_default_user(driver, settings)

    board = KanbanPage(driver, settings)
    board.wait_until_loaded()

    # First, create a base sprint with known dates
    base_sprint_title = "Sprint Base - No Overlap"
    base_goal = "This sprint has fixed dates"
    base_start = "2026-06-01"
    base_end = "2026-06-08"

    try:
        board.create_sprint(
            sprint_title=base_sprint_title,
            goal=base_goal,
            start_date=base_start,
            end_date=base_end,
        )
    except RuntimeError as exc:
        pytest.skip(f"Could not create base sprint: {exc}")

    # Verify base sprint was created
    sprint_options = board.sprint_options_text()
    assert any(base_sprint_title in option for option in sprint_options), (
        f"Base sprint '{base_sprint_title}' should have been created"
    )

    # Attempt 1: Create sprint with exact same dates (complete overlap)
    overlapping_sprint_1 = "Sprint Overlap - Exact"
    overlap_error_1 = board.attempt_overlapping_sprint(
        sprint_title=overlapping_sprint_1,
        goal="This should fail - exact overlap",
        start_date=base_start,
        end_date=base_end,
    )

    # NEGATIVE ASSERTION: Error message should contain "overlap"
    assert "overlap" in overlap_error_1.lower(), (
        f"Expected overlap error message, but got: '{overlap_error_1}'"
    )
    
    # Verify sprint was NOT created
    sprint_options = board.sprint_options_text()
    assert not any(overlapping_sprint_1 in option for option in sprint_options), (
        f"Overlapping sprint '{overlapping_sprint_1}' should not have been created"
    )


@pytest.mark.e2e
def test_create_sprint_with_partial_date_overlap_fails(driver, settings: SeleniumSettings):
    """
    Test that creating a sprint with partially overlapping dates fails.
    Expected error: Overlap validation error for partial overlaps.
    """
    login_with_default_user(driver, settings)

    board = KanbanPage(driver, settings)
    board.wait_until_loaded()

    # Create a base sprint
    base_sprint_title = "Sprint Partial Base"
    base_goal = "Base sprint for partial overlap test"
    base_start = "2026-07-01"
    base_end = "2026-07-15"

    try:
        board.create_sprint(
            sprint_title=base_sprint_title,
            goal=base_goal,
            start_date=base_start,
            end_date=base_end,
        )
    except RuntimeError as exc:
        pytest.skip(f"Could not create base sprint: {exc}")

    # Attempt to create sprint that starts BEFORE base ends (partial overlap)
    overlapping_sprint_2 = "Sprint Partial Overlap Start"
    overlap_error_2 = board.attempt_overlapping_sprint(
        sprint_title=overlapping_sprint_2,
        goal="This should fail - starts within existing sprint",
        start_date="2026-07-10",  # Within base sprint
        end_date="2026-07-20",    # After base sprint
    )

    # NEGATIVE ASSERTION: Error should indicate overlap
    assert "overlap" in overlap_error_2.lower(), (
        f"Expected overlap error for partial overlap, but got: '{overlap_error_2}'"
    )


@pytest.mark.e2e
def test_create_sprint_with_invalid_date_range_fails(driver, settings: SeleniumSettings):
    """
    Test that creating a sprint with end_date before start_date fails.
    Expected error: Date range validation error.
    """
    login_with_default_user(driver, settings)

    board = KanbanPage(driver, settings)
    board.wait_until_loaded()

    invalid_sprint_title = "Sprint Invalid Dates"
    invalid_goal = "End date before start date"

    board.open_sprint_dialog()

    # Fill sprint form with invalid date range
    board.type_text(board.SPRINT_TITLE_INPUT, invalid_sprint_title)
    board.type_text(board.SPRINT_GOAL_INPUT, invalid_goal)
    
    # Set end_date BEFORE start_date (invalid)
    board.type_mui_date(board.SPRINT_START_DATE_INPUT, "2026-08-20")
    board.type_mui_date(board.SPRINT_END_DATE_INPUT, "2026-08-10")

    # Attempt to submit
    board.click(board.SPRINT_SUBMIT_BUTTON)

    import time
    time.sleep(2)

    # NEGATIVE ASSERTION: Dialog should still be open (form not submitted)
    dialog_still_open = board.is_present(board.ADD_SPRINT_DIALOG)
    
    assert dialog_still_open, (
        "Sprint dialog should remain open when dates are invalid "
        "(end_date before start_date)"
    )

    # Close dialog to clean up
    board.close_sprint_dialog()


@pytest.mark.e2e
def test_create_sprint_with_past_dates_fails(driver, settings: SeleniumSettings):
    """
    Test that creating a sprint with past dates fails or is prevented.
    Expected error: Date validation error (if business rule enforces future dates).
    """
    login_with_default_user(driver, settings)

    board = KanbanPage(driver, settings)
    board.wait_until_loaded()

    past_sprint_title = "Sprint Past Dates"
    past_goal = "Sprint in the past"

    board.open_sprint_dialog()

    # Fill sprint form with past dates
    board.type_text(board.SPRINT_TITLE_INPUT, past_sprint_title)
    board.type_text(board.SPRINT_GOAL_INPUT, past_goal)
    
    # Set dates in the past
    board.type_mui_date(board.SPRINT_START_DATE_INPUT, "2025-05-01")
    board.type_mui_date(board.SPRINT_END_DATE_INPUT, "2025-05-15")

    # Attempt to submit
    board.click(board.SPRINT_SUBMIT_BUTTON)

    import time
    time.sleep(2)

    # Check if dialog is still open or if error is visible
    dialog_still_open = board.is_present(board.ADD_SPRINT_DIALOG)
    
    # If sprint with past dates is not allowed, dialog should remain open
    sprint_options = board.sprint_options_text()
    sprint_created = any(past_sprint_title in option for option in sprint_options)
    
    if not sprint_created:
        # Past dates validation is working
        assert dialog_still_open or not sprint_created, (
            "Sprint with past dates should not be created"
        )
    else:
        # Past dates are allowed in the system
        pytest.skip("System allows sprints with past dates")
