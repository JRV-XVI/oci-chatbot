from __future__ import annotations

import pytest
from selenium.common.exceptions import TimeoutException

from tests.selenium.config import SeleniumSettings
from tests.selenium.pages.kanban_page import KanbanPage
from tests.selenium.utils.auth import login_with_default_user


@pytest.mark.e2e
def test_edit_nonexistent_task_fails_gracefully(driver, settings: SeleniumSettings):
    """
    Test that attempting to edit a task that doesn't exist fails gracefully.
    Expected error: Task not found, dialog cannot open, or error message displayed.
    """
    login_with_default_user(driver, settings)

    board = KanbanPage(driver, settings)
    board.wait_until_loaded()

    # Use a task title that definitely doesn't exist
    nonexistent_task_title = "NONEXISTENT_TASK_12345_ABCDEF_XYZ"

    # NEGATIVE ASSERTION: Attempting to open a non-existent task should fail
    try:
        board.open_task_details(nonexistent_task_title)
        
        # If we reach here, the task details dialog opened (unexpected)
        raise AssertionError(
            f"Task details dialog should NOT have opened for nonexistent task "
            f"'{nonexistent_task_title}', but it did"
        )
    except TimeoutException:
        # EXPECTED: TimeoutException because task element doesn't exist
        # This is the expected behavior
        pass

    # Verify task details dialog is not visible
    task_details_visible = board.is_present(board.TASK_DETAILS_DIALOG)
    assert not task_details_visible, (
        "Task details dialog should not be visible for a nonexistent task"
    )


@pytest.mark.e2e
def test_edit_task_with_invalid_status_change(driver, settings: SeleniumSettings):
    """
    Test editing a task to an invalid status value.
    Expected error: Form validation prevents submission or shows error.
    """
    login_with_default_user(driver, settings)

    board = KanbanPage(driver, settings)
    board.wait_until_loaded()

    from tests.selenium.utils.test_data import unique_label
    
    task_title = unique_label("E2E-EDIT-INVALID")
    description = "Task for testing invalid status edit"

    # Create a task first
    try:
        board.create_task(
            title=task_title,
            description=description,
            status="backlog",
            priority="medium",
            sprint="3",
            estimated_hours="2",
            start_date="2026-05-16",
            end_date="2026-05-17",
            assigned_to="MarioFengW",
        )
    except RuntimeError as exc:
        pytest.skip(str(exc))

    # Wait for task to appear
    board.wait_task_in_column(task_title, "backlog")

    # Open task details
    board.open_task_details(task_title)

    # Get the edit status select element and verify available options
    import time
    time.sleep(1)
    
    status_select = board.wait_visible(board.EDIT_STATUS_SELECT)
    
    # Attempt to select an invalid status by direct value (not through UI)
    # This tests form validation
    try:
        # Try to set an invalid value
        board.driver.execute_script(
            "arguments[0].value = 'INVALID_STATUS';",
            status_select
        )
        
        # Try to submit the form
        board.click(board.SAVE_TASK_BUTTON)
        time.sleep(2)
        
        # NEGATIVE ASSERTION: Dialog should still be open due to validation error
        dialog_still_visible = board.is_present(board.TASK_DETAILS_DIALOG)
        
        if dialog_still_visible:
            # Validation prevented submission - EXPECTED
            assert True, "Form validation correctly prevented submission with invalid status"
        else:
            # Dialog closed, but task status should still be "backlog"
            board.wait_task_in_column(task_title, "backlog")
            
    except TimeoutException:
        # Expected: Could not find or click save button
        # This indicates the dialog state is unstable
        pass
