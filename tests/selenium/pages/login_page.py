from __future__ import annotations

from selenium.common.exceptions import TimeoutException
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as ec
from selenium.webdriver.support.ui import WebDriverWait

from tests.selenium.config import SeleniumSettings
from tests.selenium.pages.base_page import BasePage


class LoginPage(BasePage):
    EMAIL_INPUT = (By.ID, "email")
    PASSWORD_INPUT = (By.ID, "password")
    SUBMIT_BUTTON = (By.XPATH, "//button[@type='submit']")

    def __init__(self, driver, settings: SeleniumSettings):
        super().__init__(driver, settings.base_url, settings.timeout_seconds)

    def open_login(self) -> None:
        self.open("/login")
        try:
            self.wait_visible(self.EMAIL_INPUT, timeout=30)    # visible implica presente
            self.wait_visible(self.PASSWORD_INPUT, timeout=10) # ya hidratado en este punto
        except TimeoutException:
            if "/login" not in self.driver.current_url:
                return
            raise

    def login(self, email: str, password: str) -> None:
        if "/login" not in self.driver.current_url:
            return

        self.type_text(self.EMAIL_INPUT, email)
        self.type_text(self.PASSWORD_INPUT, password)
        self.click(self.SUBMIT_BUTTON)
        WebDriverWait(self.driver, self.timeout_seconds).until(
            lambda d: "/login" not in d.current_url
        )
