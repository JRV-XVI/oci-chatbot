from __future__ import annotations

import re
from datetime import datetime
from pathlib import Path
from typing import Callable, List

import pytest
from selenium.common.exceptions import InvalidSessionIdException, WebDriverException
from selenium.webdriver.remote.webdriver import WebDriver

from tests.selenium.config import DEFAULT_ARTIFACTS_DIR, SeleniumSettings, build_driver, load_settings
from tests.selenium.utils.api_cleanup import CleanupApiClient


def _sanitize_filename(name: str) -> str:
    return re.sub(r"[^A-Za-z0-9_.-]+", "_", name)


@pytest.fixture(scope="session")
def settings() -> SeleniumSettings:
    current = load_settings()
    current.artifacts_dir.mkdir(parents=True, exist_ok=True)
    return current


@pytest.fixture
def driver_factory(settings: SeleniumSettings) -> Callable[[], WebDriver]:
    created_drivers: List[WebDriver] = []

    def _factory() -> WebDriver:
        try:
            driver = build_driver(settings)
        except Exception as exc:
            remote = settings.selenium_remote_url or f"local {settings.browser} WebDriver"
            pytest.skip(f"WebDriver unavailable ({remote}): {exc}")
        created_drivers.append(driver)
        return driver

    yield _factory

    for driver in created_drivers:
        try:
            driver.quit()
        except (InvalidSessionIdException, WebDriverException):
            continue


@pytest.fixture
def driver(driver_factory: Callable[[], WebDriver]) -> WebDriver:
    return driver_factory()


@pytest.fixture(autouse=True)
def cleanup_created_entities(settings: SeleniumSettings):
    cleanup = CleanupApiClient(
        api_base_url=settings.api_base_url,
        timeout_seconds=max(10, settings.timeout_seconds),
    )

    baseline_task_ids = cleanup.list_task_ids()
    baseline_sprint_ids = cleanup.list_sprint_ids()

    yield

    if baseline_task_ids is None or baseline_sprint_ids is None:
        return

    current_task_ids = cleanup.list_task_ids()
    current_sprint_ids = cleanup.list_sprint_ids()

    if current_task_ids is None or current_sprint_ids is None:
        return

    created_task_ids = sorted(current_task_ids - baseline_task_ids)
    for task_id in created_task_ids:
        cleanup.delete_task(task_id)

    refreshed_sprint_ids = cleanup.list_sprint_ids() or current_sprint_ids
    created_sprint_ids = sorted(refreshed_sprint_ids - baseline_sprint_ids)
    for sprint_id in created_sprint_ids:
        cleanup.delete_sprint(sprint_id)


@pytest.hookimpl(hookwrapper=True)
def pytest_runtest_makereport(item: pytest.Item, call: pytest.CallInfo[None]):
    outcome = yield
    report = outcome.get_result()

    if report.when != "call" or report.passed:
        return

    driver = item.funcargs.get("driver")
    if not driver:
        return

    settings = item.funcargs.get("settings")
    artifacts_dir = settings.artifacts_dir if settings else DEFAULT_ARTIFACTS_DIR
    Path(artifacts_dir).mkdir(parents=True, exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    base_name = _sanitize_filename(f"{item.nodeid}_{timestamp}")

    screenshot_path = artifacts_dir / f"{base_name}.png"
    html_path = artifacts_dir / f"{base_name}.html"

    try:
        driver.save_screenshot(str(screenshot_path))
    except (InvalidSessionIdException, WebDriverException):
        pass

    try:
        html_path.write_text(driver.page_source, encoding="utf-8")
    except (InvalidSessionIdException, WebDriverException):
        pass