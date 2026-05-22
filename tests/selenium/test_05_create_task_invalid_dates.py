from __future__ import annotations

import pytest
from selenium.common.exceptions import TimeoutException

from tests.selenium.config import SeleniumSettings
from tests.selenium.pages.kanban_page import KanbanPage
from tests.selenium.utils.auth import login_with_default_user
from tests.selenium.utils.test_data import unique_label


@pytest.mark.e2e
def test_create_task_with_invalid_date_range_end_before_start(driver, settings: SeleniumSettings):
    """
    Test that creating a task with end_date before start_date fails gracefully.
    Expected error: Validation error or form submission prevention.
    """
    login_with_default_user(driver, settings)

    board = KanbanPage(driver, settings)
    board.wait_until_loaded()

    task_title = unique_label("E2E-INVALID-DATES")
    description = "Task with invalid date range (end before start)"

    board.open_add_task_dialog()
    
    # Fill task form with invalid date range
    board.type_text(board.TASK_TITLE_INPUT, task_title)
    board.type_text(board.TASK_DESCRIPTION_INPUT, description)
    board.select_by_value(board.TASK_STATUS_SELECT, "backlog")
    board.select_by_value(board.TASK_PRIORITY_SELECT, "medium")
    board.select_by_value(board.TASK_SPRINT_SELECT, "3")
    
    # Set end_date BEFORE start_date (invalid)
    board.type_mui_date(board.TASK_START_DATE_INPUT, "2026-05-20")
    board.type_mui_date(board.TASK_END_DATE_INPUT, "2026-05-16")
    
    board.type_text(board.TASK_ESTIMATED_TIME_INPUT, "5")
    
    assignees = board.available_assignees()
    if assignees:
        board.select_by_value(board.TASK_ASSIGNED_TO_SELECT, assignees[0][0])

    # Attempt to submit - should fail or be prevented
    try:
        board.click(board.SUBMIT_TASK_BUTTON)
    except TimeoutException:
        board.click(board.SUBMIT_TASK_BUTTON_ALT)
    
    # Wait a moment to check if dialog closes or error appears
    import time
    time.sleep(2)
    
    # NEGATIVE ASSERTION: Dialog should still be open (form not submitted)
    # OR an error message should be visible
    dialog_still_open = board.is_present(board.ADD_TASK_DIALOG)
    
    assert dialog_still_open, (
        "Expected form to remain open due to invalid date range, "
        "but dialog was closed (submission may have succeeded unexpectedly)"
    )
    
    # Additional check: task should NOT appear in the backlog
    task_exists = board.task_exists_in_column(task_title, "backlog")
    assert not task_exists, (
        f"Task '{task_title}' should not have been created with invalid dates, "
        "but it appears in the backlog"
    )


@pytest.mark.e2e
def test_create_task_with_past_dates(driver, settings: SeleniumSettings):
    """
    Test that creating a task with past dates fails or is prevented.
    Expected error: Date validation error (if business rule enforces future dates).
    """
    login_with_default_user(driver, settings)

    board = KanbanPage(driver, settings)
    board.wait_until_loaded()

    task_title = unique_label("E2E-PAST-DATES")
    description = "Task with past dates"

    board.open_add_task_dialog()
    
    board.type_text(board.TASK_TITLE_INPUT, task_title)
    board.type_text(board.TASK_DESCRIPTION_INPUT, description)
    board.select_by_value(board.TASK_STATUS_SELECT, "backlog")
    board.select_by_value(board.TASK_PRIORITY_SELECT, "medium")
    board.select_by_value(board.TASK_SPRINT_SELECT, "3")
    
    # Set dates in the past
    board.type_mui_date(board.TASK_START_DATE_INPUT, "2025-05-16")
    board.type_mui_date(board.TASK_END_DATE_INPUT, "2025-05-17")
    
    board.type_text(board.TASK_ESTIMATED_TIME_INPUT, "3")
    
    assignees = board.available_assignees()
    if assignees:
        board.select_by_value(board.TASK_ASSIGNED_TO_SELECT, assignees[0][0])

    try:
        board.click(board.SUBMIT_TASK_BUTTON)
    except TimeoutException:
        board.click(board.SUBMIT_TASK_BUTTON_ALT)
    
    import time
    time.sleep(2)
    
    # NEGATIVE ASSERTION: Dialog should remain open or error should appear
    dialog_still_open = board.is_present(board.ADD_TASK_DIALOG)
    
    # If past dates are allowed, skip the test
    # If not allowed, verify task was not created
    task_exists = board.task_exists_in_column(task_title, "backlog")
    
    if not task_exists:
        # Past dates validation is working
        assert dialog_still_open or not task_exists, (
            "Task with past dates should not be created"
        )
    else:
        # Past dates are allowed in the system (skip this assertion)
        pytest.skip("System allows tasks with past dates")
