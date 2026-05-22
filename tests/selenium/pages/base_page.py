from __future__ import annotations

import time

from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.common.exceptions import WebDriverException
from selenium.common.exceptions import TimeoutException
from selenium.webdriver.remote.webdriver import WebDriver
from selenium.webdriver.remote.webelement import WebElement
from selenium.webdriver.support import expected_conditions as ec
from selenium.webdriver.support.ui import Select, WebDriverWait


class BasePage:
    def __init__(self, driver: WebDriver, base_url: str, timeout_seconds: int = 20):
        self.driver = driver
        self.base_url = base_url.rstrip("/")
        self.timeout_seconds = timeout_seconds

    @staticmethod
    def by_test_id(test_id: str) -> tuple[str, str]:
        return By.CSS_SELECTOR, f"[data-testid='{test_id}']"

    def open(self, path: str = "/") -> None:
        if not path.startswith("/"):
            path = f"/{path}"
        self.driver.get(f"{self.base_url}{path}")

    def wait_visible(self, locator: tuple[str, str], timeout: int | None = None) -> WebElement:
        wait = WebDriverWait(self.driver, timeout or self.timeout_seconds)
        return wait.until(ec.visibility_of_element_located(locator))

    def wait_clickable(self, locator: tuple[str, str], timeout: int | None = None) -> WebElement:
        wait = WebDriverWait(self.driver, timeout or self.timeout_seconds)
        return wait.until(ec.element_to_be_clickable(locator))

    def wait_invisible(self, locator: tuple[str, str], timeout: int | None = None) -> bool:
        wait = WebDriverWait(self.driver, timeout or self.timeout_seconds)
        return wait.until(ec.invisibility_of_element_located(locator))

    def wait_present(self, locator: tuple[str, str], timeout: int | None = None) -> WebElement:
        wait = WebDriverWait(self.driver, timeout or self.timeout_seconds)
        return wait.until(ec.presence_of_element_located(locator))

    def wait_react_hydrated(self, locator: tuple[str, str], timeout: int | None = None) -> bool:
        element = self.wait_visible(locator, timeout)
        wait = WebDriverWait(self.driver, timeout or self.timeout_seconds)

        def _has_react_props(_driver: WebDriver) -> bool:
            return bool(
                _driver.execute_script(
                    """
                    const el = arguments[0];
                    if (!el) return false;
                    const keys = Object.keys(el);
                    return keys.some(k => k.startsWith('__reactProps$') || k.startsWith('__reactFiber$'));
                    """,
                    element,
                )
            )

        try:
            wait.until(_has_react_props)
            return True
        except TimeoutException:
            return False

    def elements(self, locator: tuple[str, str]) -> list[WebElement]:
        return self.driver.find_elements(*locator)

    def is_present(self, locator: tuple[str, str], timeout: float = 0.5) -> bool:
        """Check if an element is present in the DOM without waiting long."""
        try:
            WebDriverWait(self.driver, timeout).until(ec.presence_of_element_located(locator))
            return True
        except TimeoutException:
            return False

    def click(self, locator: tuple[str, str], timeout: int | None = None) -> None:
        try:
            self.wait_react_hydrated(locator, timeout=4)
        except TimeoutException:
            pass
        element = self.wait_clickable(locator, timeout)
        self.driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", element)
        try:
            element.click()
        except WebDriverException:
            self.driver.execute_script("arguments[0].click();", element)

    def type_text(self, locator: tuple[str, str], value: str, timeout: int | None = None) -> None:
        element = self.wait_visible(locator, timeout)
        self.driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", element)

        try:
            element.click()
        except WebDriverException:
            self.driver.execute_script("arguments[0].focus();", element)

        used_js_fallback = False
        try:
            element.send_keys(Keys.CONTROL, "a")
            element.send_keys(Keys.BACKSPACE)
            element.send_keys(value)
        except WebDriverException:
            used_js_fallback = True

        current_value = (element.get_attribute("value") or "").strip()
        if used_js_fallback or current_value != value:
            self.driver.execute_script(
                """
                const el = arguments[0];
                const val = arguments[1];
                el.focus();
                const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
                setter.call(el, val);
                el.dispatchEvent(new Event('input', { bubbles: true }));
                el.dispatchEvent(new Event('change', { bubbles: true }));
                el.dispatchEvent(new Event('blur', { bubbles: true }));
                """,
                element,
                value,
            )

    def select_by_value(self, locator: tuple[str, str], value: str, timeout: int | None = None) -> None:
        element = self.wait_visible(locator, timeout)
        Select(element).select_by_value(value)

    def select_by_visible_text(self, locator: tuple[str, str], text: str, timeout: int | None = None) -> None:
        element = self.wait_visible(locator, timeout)
        Select(element).select_by_visible_text(text)

    def text_is_present(self, text: str) -> bool:
        return text in self.driver.page_source

    def type_mui_date(self, locator: tuple[str, str], date_value: str, timeout: int | None = None) -> None:
        from selenium.webdriver.common.action_chains import ActionChains

        input_el = self.wait_present(locator, timeout)
        self.driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", input_el)

        container = self.driver.execute_script(
            "return arguments[0].closest('.MuiPickersInputBase-root')", input_el
        )

        year, month, day = date_value.split("-")
        container.click()
        time.sleep(0.3)

        actions = ActionChains(self.driver)
        actions.send_keys(year)
        actions.pause(0.1)
        actions.send_keys(month)
        actions.pause(0.1)
        actions.send_keys(day)
        actions.pause(0.1)
        actions.send_keys(Keys.TAB)
        actions.perform()
        time.sleep(0.2)