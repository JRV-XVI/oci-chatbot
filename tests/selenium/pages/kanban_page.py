from __future__ import annotations

import time

from selenium.common.exceptions import TimeoutException
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as ec
from selenium.webdriver.support.ui import Select, WebDriverWait

from tests.selenium.config import SeleniumSettings
from tests.selenium.pages.base_page import BasePage


class KanbanPage(BasePage):
    NEW_TASK_BUTTON = BasePage.by_test_id("btn-new-task")
    ADD_TASK_DIALOG = BasePage.by_test_id("dialog-add-task")
    SUBMIT_TASK_BUTTON = BasePage.by_test_id("btn-submit-task")
    SUBMIT_TASK_BUTTON_ALT = BasePage.by_test_id("btn-save-task")

    TASK_TITLE_INPUT = BasePage.by_test_id("input-task-title")
    TASK_DESCRIPTION_INPUT = BasePage.by_test_id("input-task-description")
    TASK_STATUS_SELECT = BasePage.by_test_id("select-task-status")
    TASK_PRIORITY_SELECT = BasePage.by_test_id("select-task-priority")
    TASK_SPRINT_SELECT = BasePage.by_test_id("select-task-sprint")          
    TASK_START_DATE_INPUT = BasePage.by_test_id("input-task-start-date")    
    TASK_END_DATE_INPUT = BasePage.by_test_id("input-task-end-date")        
    TASK_ESTIMATED_TIME_INPUT = BasePage.by_test_id("input-task-estimated-time")  
    TASK_ASSIGNED_TO_SELECT = BasePage.by_test_id("select-task-assigned-to")

    TASK_DETAILS_DIALOG = BasePage.by_test_id("dialog-task-details")
    EDIT_STATUS_SELECT = BasePage.by_test_id("select-edit-task-status")
    EDIT_REAL_TIME_INPUT = BasePage.by_test_id("input-edit-task-real-time")
    SAVE_TASK_BUTTON = BasePage.by_test_id("btn-save-task")

    CHECK_SPRINT_BUTTON = BasePage.by_test_id("btn-check-sprint")
    ADD_SPRINT_DIALOG = BasePage.by_test_id("dialog-add-sprint")
    SPRINT_TITLE_INPUT = BasePage.by_test_id("input-sprint-number")
    SPRINT_GOAL_INPUT = BasePage.by_test_id("input-sprint-goal")
    SPRINT_START_DATE_INPUT = BasePage.by_test_id("input-sprint-start-date")
    SPRINT_END_DATE_INPUT = BasePage.by_test_id("input-sprint-end-date")
    SPRINT_SUBMIT_BUTTON = BasePage.by_test_id("btn-submit-sprint")
    SPRINT_ERROR_TEXT = BasePage.by_test_id("text-sprint-error")
    SPRINT_SELECT = BasePage.by_test_id("select-existing-sprint")

    KPIS_BUTTON = BasePage.by_test_id("btn-kpis")

    BACKLOG_COLUMN = BasePage.by_test_id("kanban-column-backlog")

    SPRINT_CLOSE_BUTTON = (By.XPATH, "//div[@data-testid='dialog-add-sprint']//button[normalize-space()='Close']")

    def __init__(self, driver, settings: SeleniumSettings):
        super().__init__(driver, settings.base_url, settings.timeout_seconds)

    def open_board(self) -> None:
        self.open("/")
        self.wait_until_loaded()

    def wait_until_loaded(self) -> None:
        self.wait_visible(self.BACKLOG_COLUMN, timeout=max(20, self.timeout_seconds))
        self.wait_visible(self.NEW_TASK_BUTTON)
        self.wait_react_hydrated(self.NEW_TASK_BUTTON, timeout=4)
        self.wait_react_hydrated(self.KPIS_BUTTON, timeout=4)

    def open_add_task_dialog(self) -> None:
        for _ in range(4):
            self.click(self.NEW_TASK_BUTTON)
            try:
                self.wait_visible(self.ADD_TASK_DIALOG, timeout=4)
                return
            except TimeoutException:
                time.sleep(0.3)

        raise RuntimeError("New Task dialog did not open. UI may not be interactive yet.")

    def available_assignees(self) -> list[tuple[str, str]]:
        select_element = self.wait_visible(self.TASK_ASSIGNED_TO_SELECT)
        options = Select(select_element).options

        valid_options: list[tuple[str, str]] = []
        for option in options:
            value = option.get_attribute("value")
            text = option.text.strip()
            disabled_attr = option.get_attribute("disabled")
            if not value or disabled_attr:
                continue
            valid_options.append((value, text))

        return valid_options

    def create_task(
        self,
        title: str,
        description: str,
        status: str = "backlog",
        priority: str = "medium",
        sprint: str | None = None,
        estimated_hours: str | None = None,
        start_date: str | None = None,
        end_date: str | None = None,
        assigned_to: str | None = None,
    ) -> None:
        self.open_add_task_dialog()

        self.type_text(self.TASK_TITLE_INPUT, title)
        self.type_text(self.TASK_DESCRIPTION_INPUT, description)
        self.select_by_value(self.TASK_STATUS_SELECT, status)
        self.select_by_value(self.TASK_PRIORITY_SELECT, priority)

        if sprint is not None:
            self.select_by_value(self.TASK_SPRINT_SELECT, sprint)

        if start_date is not None:
            self.type_mui_date(self.TASK_START_DATE_INPUT, start_date)

        if end_date is not None:
            self.type_mui_date(self.TASK_END_DATE_INPUT, end_date)

        if estimated_hours is not None:
            self.type_text(self.TASK_ESTIMATED_TIME_INPUT, estimated_hours)

        assignees = self.available_assignees()
        if not assignees:
            raise RuntimeError("No assignees available to create a task.")

        if assigned_to is not None:
            self.select_by_value(self.TASK_ASSIGNED_TO_SELECT, assigned_to)
        else:
            self.select_by_value(self.TASK_ASSIGNED_TO_SELECT, assignees[0][0])

        try:
            self.click(self.SUBMIT_TASK_BUTTON)
        except TimeoutException:
            self.click(self.SUBMIT_TASK_BUTTON_ALT)
        self.wait_invisible(self.ADD_TASK_DIALOG)

    def wait_task_in_column(self, title: str, status: str, timeout: int = 20) -> None:
        locator = (
            By.XPATH,
            f"//div[@data-testid='kanban-column-{status}-tasks']//h3[normalize-space()='{title}']",
        )
        self.wait_visible(locator, timeout=timeout)

    def task_exists_in_column(self, title: str, status: str) -> bool:
        locator = (
            By.XPATH,
            f"//div[@data-testid='kanban-column-{status}-tasks']//h3[normalize-space()='{title}']",
        )
        return len(self.elements(locator)) > 0

    def open_task_details(self, title: str) -> None:
        task_title_locator = (By.XPATH, f"//h3[normalize-space()='{title}']")
        self.click(task_title_locator)
        self.wait_visible(self.TASK_DETAILS_DIALOG)

    def update_task_status(self, status: str, real_time_hours: str = "1") -> None:
        self.select_by_value(self.EDIT_STATUS_SELECT, status)
        self.type_text(self.EDIT_REAL_TIME_INPUT, real_time_hours)
        self.click(self.SAVE_TASK_BUTTON)
        self.wait_invisible(self.TASK_DETAILS_DIALOG)

    def delete_task(self, title: str) -> None:
        card_locator = (By.XPATH, f"//div[@data-task-title='{title}']")
        delete_button_locator = (
            By.XPATH,
            "//div[@data-task-title='{title}']"
            "//button[.//span[normalize-space()='Delete']]".format(title=title),
        )

        card = self.wait_visible(card_locator)
        ActionChains(self.driver).move_to_element(card).perform()
        self.click(delete_button_locator)

        try:
            WebDriverWait(self.driver, 4).until(ec.alert_is_present())
            self.driver.switch_to.alert.accept()
        except TimeoutException:
            pass

    def open_sprint_dialog(self) -> None:
        sprint_button = self.wait_visible(self.CHECK_SPRINT_BUTTON)
        for _ in range(16):
            if sprint_button.get_attribute("disabled") is None:
                break
            time.sleep(0.5)
            sprint_button = self.wait_visible(self.CHECK_SPRINT_BUTTON)
        else:
            raise RuntimeError("Check Sprint is disabled because project data is not loaded.")

        for _ in range(4):
            self.click(self.CHECK_SPRINT_BUTTON)
            try:
                self.wait_visible(self.ADD_SPRINT_DIALOG, timeout=4)
                return
            except TimeoutException:
                time.sleep(0.3)

        self.wait_visible(self.ADD_SPRINT_DIALOG, timeout=4)

    def create_sprint(self, sprint_title: str, goal: str, start_date: str, end_date: str) -> None:
        self.open_sprint_dialog()

        self.type_text(self.SPRINT_TITLE_INPUT, sprint_title)
        self.type_text(self.SPRINT_GOAL_INPUT, goal)
        self.type_mui_date(self.SPRINT_START_DATE_INPUT, start_date)
        self.type_mui_date(self.SPRINT_END_DATE_INPUT, end_date)

        self.driver.save_screenshot("/app/tests/selenium/artifacts/debug_before_submit.png")

        self.click(self.SPRINT_SUBMIT_BUTTON)
        time.sleep(2)

        self.driver.save_screenshot("/app/tests/selenium/artifacts/debug_after_submit.png")

        self.wait_invisible(self.ADD_SPRINT_DIALOG)

    def attempt_overlapping_sprint(self, sprint_title: str, goal: str, start_date: str, end_date: str) -> str:
        self.open_sprint_dialog()

        self.type_text(self.SPRINT_TITLE_INPUT, sprint_title)
        self.type_text(self.SPRINT_GOAL_INPUT, goal)
        self.type_mui_date(self.SPRINT_START_DATE_INPUT, start_date)
        self.type_mui_date(self.SPRINT_END_DATE_INPUT, end_date)

        self.driver.save_screenshot("/app/tests/selenium/artifacts/debug_before_submit.png")

        start_el = self.driver.find_element(*self.SPRINT_START_DATE_INPUT)
        end_el   = self.driver.find_element(*self.SPRINT_END_DATE_INPUT)
        print(f"\n[DEBUG] start input value: '{start_el.get_attribute('value')}'")
        print(f"[DEBUG] end   input value: '{end_el.get_attribute('value')}'")

        self.click(self.SPRINT_SUBMIT_BUTTON)

        import time as _time
        _time.sleep(1)
        self.driver.save_screenshot("/app/tests/selenium/artifacts/debug_after_submit.png")

        error_element = self.wait_visible(self.SPRINT_ERROR_TEXT)
        return error_element.text.strip()

    def close_sprint_dialog(self) -> None:
        try:
            self.click(self.SPRINT_CLOSE_BUTTON)
            self.wait_invisible(self.ADD_SPRINT_DIALOG)
        except TimeoutException:
            pass

    def sprint_options_text(self) -> list[str]:
        self.open_sprint_dialog()
        select_element = self.wait_visible(self.SPRINT_SELECT)
        options = Select(select_element).options
        texts = [option.text.strip() for option in options]
        self.close_sprint_dialog()
        return texts

    def go_to_kpis(self) -> None:
        for _ in range(5):
            try:
                self.click(self.KPIS_BUTTON, timeout=8)
            except TimeoutException:
                time.sleep(0.4)
                continue
            try:
                WebDriverWait(self.driver, 6).until(lambda d: "/kpis" in d.current_url)
                return
            except TimeoutException:
                time.sleep(0.3)

        self.open("/kpis")
        try:
            WebDriverWait(self.driver, 8).until(lambda d: "/kpis" in d.current_url)
            return
        except TimeoutException:
            pass

        raise RuntimeError("Navigation to /kpis did not happen after clicking KPIs.")

    def wait_task_removed_from_column(self, title: str, status: str, timeout: int = 20) -> None:
        locator = (
            By.XPATH,
            f"//div[@data-testid='kanban-column-{status}-tasks']//h3[normalize-space()='{title}']",
        )
        WebDriverWait(self.driver, timeout).until(ec.invisibility_of_element_located(locator))