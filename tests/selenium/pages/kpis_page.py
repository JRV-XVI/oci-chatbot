from __future__ import annotations

import re
import time

from selenium.webdriver.common.by import By

from tests.selenium.config import SeleniumSettings
from tests.selenium.pages.base_page import BasePage


class KpisPage(BasePage):
    PAGE_TITLE = (By.XPATH, "//h2[contains(normalize-space(), 'Key indicators')]")
    BACK_TO_KANBAN_BUTTON = BasePage.by_test_id("btn-back-to-kanban")
    BACKLOG_COLUMN = BasePage.by_test_id("kanban-column-backlog")
    COMPLETED_TASKS_VALUE = (
        By.XPATH,
        "//p[normalize-space()='Task distribution by status']"
        "/ancestor::div[contains(@class,'p-6')][1]"
        "//li[.//span[normalize-space()='Completed']]"
        "//span[contains(@class,'font-semibold')][1]",
    )

    def __init__(self, driver, settings: SeleniumSettings):
        super().__init__(driver, settings.base_url, settings.timeout_seconds)

    def wait_until_loaded(self) -> None:
        from selenium.webdriver.support.ui import WebDriverWait
        WebDriverWait(self.driver, 10).until(lambda d: "/kpis" in d.current_url)
        time.sleep(0.1) 
        self.wait_visible(self.PAGE_TITLE, timeout=max(20, self.timeout_seconds))
        self.wait_visible(self.BACK_TO_KANBAN_BUTTON)

    def go_back_to_kanban(self) -> None:
        self.click(self.BACK_TO_KANBAN_BUTTON)
        self.wait_visible(self.BACKLOG_COLUMN)

    def completed_tasks_count(self) -> int:
        value_text = self.wait_visible(self.COMPLETED_TASKS_VALUE).text.strip()
        match = re.search(r"\d+", value_text)
        if match is None:
            raise AssertionError(f"Could not parse completed tasks count from KPI value: '{value_text}'")
        return int(match.group(0))

    def assert_completed_tasks_count_increased(self) -> None:
        completed_count = self.completed_tasks_count()
        if completed_count < 1:
            raise AssertionError(
                f"Expected completed tasks KPI to be at least 1 after completing a task, got {completed_count}."
            )