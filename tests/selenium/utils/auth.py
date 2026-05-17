from __future__ import annotations

import os

from selenium.webdriver.remote.webdriver import WebDriver

from tests.selenium.config import SeleniumSettings
from tests.selenium.pages.login_page import LoginPage

DEFAULT_LOGIN_EMAIL = os.getenv("E2E_LOGIN_EMAIL", "mario@oci-chatbot.com")
DEFAULT_LOGIN_PASSWORD = os.getenv("E2E_LOGIN_PASSWORD", "Project.taka195")


def login_with_default_user(driver: WebDriver, settings: SeleniumSettings) -> None:
    login_page = LoginPage(driver, settings)
    login_page.open_login()
    login_page.login(DEFAULT_LOGIN_EMAIL, DEFAULT_LOGIN_PASSWORD)
