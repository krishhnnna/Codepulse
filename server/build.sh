#!/usr/bin/env bash
# Render Build Script
set -e

echo "=== Installing Python dependencies ==="
pip install -r requirements.txt

echo "=== Installing Playwright Chromium + system deps ==="
# Install to DEFAULT cache path so runtime finds it automatically
playwright install --with-deps chromium

echo "=== Verifying Chromium install ==="
python3 -c "from playwright.sync_api import sync_playwright; p = sync_playwright().start(); b = p.chromium.launch(headless=True, args=['--no-sandbox','--disable-dev-shm-usage']); print('Chromium OK:', b.version); b.close(); p.stop()"

echo "=== Build complete ==="
