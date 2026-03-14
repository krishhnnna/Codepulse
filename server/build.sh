#!/usr/bin/env bash
# Render Build Script
# Installs Python dependencies + Playwright Chromium for Cloudflare bypass

set -e

echo "=== Installing Python dependencies ==="
pip install -r requirements.txt

echo "=== Installing Playwright Chromium ==="
playwright install --with-deps chromium

echo "=== Build complete ==="
