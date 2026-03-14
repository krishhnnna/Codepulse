#!/usr/bin/env bash
# Render Build Script
set -e

echo "=== Installing Python dependencies ==="
pip install -r requirements.txt

echo "=== Installing Playwright Chromium ==="
# Install browsers inside the project dir so they persist at runtime
export PLAYWRIGHT_BROWSERS_PATH=$PWD/.playwright-browsers
playwright install --with-deps chromium || playwright install chromium

echo "=== Verifying Chromium install ==="
ls -la $PLAYWRIGHT_BROWSERS_PATH/ || echo "Browser dir listing failed"

echo "=== Build complete ==="
