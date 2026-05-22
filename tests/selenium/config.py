from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit

from dotenv import load_dotenv
from selenium import webdriver
from selenium.webdriver.chrome.options import Options as ChromeOptions
from selenium.webdriver.edge.options import Options as EdgeOptions
from selenium.webdriver.remote.webdriver import WebDriver

ROOT_DIR = Path(__file__).resolve().parents[2]
DEFAULT_ARTIFACTS_DIR = ROOT_DIR / "tests" / "selenium" / "artifacts"


def _as_bool(value: str | None, default: bool = False) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


@dataclass(frozen=True)
class SeleniumSettings:
    base_url: str
    api_base_url: str
    browser: str
    headless: bool
    window_width: int
    window_height: int
    timeout_seconds: int
    artifacts_dir: Path
    selenium_remote_url: str | None


def _derive_api_base_url(base_url: str) -> str:
    parsed = urlsplit(base_url)
    scheme = parsed.scheme or "http"
    host = parsed.hostname or "localhost"
    if ":" in host and not host.startswith("["):
        host = f"[{host}]"
    netloc = f"{host}:8080"
    return urlunsplit((scheme, netloc, "", "", "")).rstrip("/")


def load_settings() -> SeleniumSettings:
    load_dotenv(ROOT_DIR / ".env", override=False)

    base_url = os.getenv("E2E_BASE_URL", "http://localhost:3000").rstrip("/")
    api_base_url = os.getenv("E2E_API_BASE_URL", _derive_api_base_url(base_url)).rstrip("/")
    browser = os.getenv("E2E_BROWSER", "edge")
    headless = _as_bool(os.getenv("E2E_HEADLESS"), default=False)
    width = int(os.getenv("E2E_WINDOW_WIDTH", "1600"))
    height = int(os.getenv("E2E_WINDOW_HEIGHT", "900"))
    timeout_seconds = int(os.getenv("E2E_SELENIUM_TIMEOUT") or "30")
    artifacts_dir = Path(os.getenv("E2E_ARTIFACTS_DIR", str(DEFAULT_ARTIFACTS_DIR)))
    selenium_remote_url = os.getenv("E2E_SELENIUM_REMOTE_URL")

    return SeleniumSettings(
        base_url=base_url,
        api_base_url=api_base_url,
        browser=browser,
        headless=headless,
        window_width=width,
        window_height=height,
        timeout_seconds=timeout_seconds,
        artifacts_dir=artifacts_dir,
        selenium_remote_url=selenium_remote_url,
    )


def build_driver(settings: SeleniumSettings) -> WebDriver:
    browser = settings.browser.strip().lower()

    # Construir opciones según el browser
    if browser == "chrome":
        options = ChromeOptions()
    elif browser == "edge":
        options = EdgeOptions()
    else:
        raise ValueError(
            f"Unsupported browser '{browser}'. "
            "Use E2E_BROWSER=chrome (CI/Linux) or E2E_BROWSER=edge (local/Windows)."
        )

    if settings.headless:
        options.add_argument("--headless=new")
    options.add_argument("--disable-gpu")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-software-rasterizer")
    options.add_argument("--disable-extensions")
    options.add_argument("--window-size=1600,900")
    options.add_argument("--remote-debugging-port=9222")
    options.add_argument("--disable-setuid-sandbox")
    options.add_argument("--disable-web-security")

    # RemoteWebDriver — usado en CI contra Selenium Grid en OKE
    if settings.selenium_remote_url:
        driver = webdriver.Remote(
            command_executor=settings.selenium_remote_url,
            options=options,
        )
        driver.set_window_size(settings.window_width, settings.window_height)
        return driver

    # Driver local — solo para desarrollo en Windows con Edge
    if browser == "edge":
        local_driver = ROOT_DIR / "tests" / "edgedriver" / "edgedriver_win64" / "msedgedriver.exe"
        if local_driver.exists():
            from selenium.webdriver.edge.service import Service as EdgeService
            service = EdgeService(executable_path=str(local_driver))
            driver = webdriver.Edge(service=service, options=options)
        else:
            raise FileNotFoundError(
                f"msedgedriver.exe no encontrado en {local_driver}. "
                "Descárgalo desde https://developer.microsoft.com/en-us/microsoft-edge/tools/webdriver/"
            )
    else:
        # Chrome local requiere que el usuario tenga Chrome instalado
        # En CI siempre se usa RemoteWebDriver, nunca llega aquí
        raise EnvironmentError(
            "Chrome local no está configurado. "
            "En CI usa E2E_SELENIUM_REMOTE_URL para apuntar al Selenium Grid."
        )

    driver.set_window_size(settings.window_width, settings.window_height)
    return driver