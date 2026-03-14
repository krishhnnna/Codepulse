#!/usr/bin/env bash
# Render Build Script
set -e

echo "=== Installing Python dependencies ==="
pip install -r requirements.txt

echo "=== Build complete ==="
