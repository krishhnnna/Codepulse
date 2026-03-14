#!/usr/bin/env bash
# Render Build Script
# Installs Python dependencies + Playwright Chromium for Cloudflare bypass

set -e

echo "=== Installing Python dependencies ==="
pip install -r requirements.txt

echo "=== Installing Playwright system deps ==="
# Install Playwright browsers + system dependencies
# On Render (Ubuntu), --with-deps installs libgbm, libnss3, etc.
PLAYWRIGHT_BROWSERS_PATH=/opt/render/.cache/ms-playwright playwright install --with-deps chromium || {
    echo "=== --with-deps failed, trying without ==="
    PLAYWRIGHT_BROWSERS_PATH=/opt/render/.cache/ms-playwright playwright install chromium
}

echo "=== Build complete ==="
