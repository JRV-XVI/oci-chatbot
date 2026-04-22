from __future__ import annotations

import sys
import time
import urllib.error
import urllib.request


def wait_for_url(url: str, timeout_seconds: int) -> int:
    deadline = time.time() + timeout_seconds
    while time.time() < deadline:
        try:
            with urllib.request.urlopen(url, timeout=5) as response:
                if 200 <= response.status < 500:
                    print(f"[wait_for_url] URL available: {url} ({response.status})")
                    return 0
        except urllib.error.HTTPError as exc:
            if 400 <= exc.code < 500:
                print(f"[wait_for_url] URL available: {url} ({exc.code})")
                return 0
        except urllib.error.URLError:
            pass
        except TimeoutError:
            pass

        time.sleep(2)

    print(f"[wait_for_url] Timed out waiting for URL: {url}")
    return 1


def main() -> int:
    if len(sys.argv) < 2:
        print("Usage: wait_for_url.py <url> [timeout_seconds]")
        return 2

    url = sys.argv[1]
    timeout = int(sys.argv[2]) if len(sys.argv) > 2 else 60
    return wait_for_url(url, timeout)


if __name__ == "__main__":
    raise SystemExit(main())
