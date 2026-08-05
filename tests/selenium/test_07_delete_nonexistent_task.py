from __future__ import annotations

import pytest
from selenium.common.exceptions import TimeoutException

from tests.selenium.config import SeleniumSettings
from tests.selenium.pages.kanban_page import KanbanPage
from tests.selenium.utils.auth import login_with_default_user


@pytest.mark.e2e
def test_delete_nonexistent_task_fails_gracefully(driver, settings: SeleniumSettings):
    """
    Test that attempting to delete a task that doesn't exist fails gracefully.
    Expected error: Task element not found, no action is taken.
    """
    login_with_default_user(driver, settings)

    board = KanbanPage(driver, settings)
    board.wait_until_loaded()

    # Use a task title that definitely doesn't exist
    nonexistent_task_title = "NONEXISTENT_TASK_DELETE_12345_XYZ"

    # NEGATIVE ASSERTION: Attempting to delete a non-existent task should fail
    try:
        board.delete_task(nonexistent_task_title)
        
        # If we reach here without exception, the delete was attempted
        # This is generally acceptable if no errors occur
        raise AssertionError(
            f"Delete operation for nonexistent task '{nonexistent_task_title}' "
            "should have failed, but it completed without error"
        )
    except TimeoutException:
        # EXPECTED: TimeoutException because task card element doesn't exist
        # This is the expected behavior
        assert True, "Correctly failed to find nonexistent task for deletion"


@pytest.mark.e2e
def test_delete_task_then_verify_removal(driver, settings: SeleniumSettings):
    """
    Test that deleting a task removes it from the board and prevents re-deletion.
    Expected behavior: Task is deleted, subsequent delete attempt fails.
    """
    login_with_default_user(driver, settings)

    board = KanbanPage(driver, settings)
    board.wait_until_loaded()

    from tests.selenium.utils.test_data import unique_label
    
    task_title = unique_label("E2E-DEL-VERIFY")
    description = "Task to test deletion verification"

    # Create a task
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

    # Verify task exists
    board.wait_task_in_column(task_title, "backlog")
    assert board.task_exists_in_column(task_title, "backlog"), (
        f"Task '{task_title}' should exist in backlog"
    )

    # Delete the task
    board.delete_task(task_title)
    
    # Verify task is removed
    board.wait_task_removed_from_column(task_title, "backlog", timeout=15)
    assert not board.task_exists_in_column(task_title, "backlog"), (
        f"Task '{task_title}' should be removed from backlog after deletion"
    )

    # NEGATIVE ASSERTION: Attempt to delete the same task again (should fail)
    try:
        board.delete_task(task_title)
        
        # If we reach here, the second delete was attempted
        raise AssertionError(
            f"Second delete attempt for already-deleted task '{task_title}' "
            "should have failed, but completed without error"
        )
    except TimeoutException:
        # EXPECTED: TimeoutException because task card no longer exists
        assert True, "Correctly failed to delete already-deleted task"
