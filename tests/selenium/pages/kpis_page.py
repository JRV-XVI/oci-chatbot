from __future__ import annotations

from tests.selenium.config import SeleniumSettings
from tests.selenium.pages.base_page import BasePage


class KpisPage(BasePage):
    PAGE_TITLE = ("xpath", "//h2[contains(normalize-space(), 'Key indicators')]")
    BACK_TO_KANBAN_BUTTON = BasePage.by_test_id("btn-back-to-kanban")
    BACKLOG_COLUMN = BasePage.by_test_id("kanban-column-backlog")

    def __init__(self, driver, settings: SeleniumSettings):
        super().__init__(driver, settings.base_url, settings.timeout_seconds)

    def wait_until_loaded(self) -> None:
        self.wait_visible(self.PAGE_TITLE, timeout=max(20, self.timeout_seconds))
        self.wait_visible(self.BACK_TO_KANBAN_BUTTON)

    def go_back_to_kanban(self) -> None:
        self.click(self.BACK_TO_KANBAN_BUTTON)
        self.wait_visible(self.BACKLOG_COLUMN)
