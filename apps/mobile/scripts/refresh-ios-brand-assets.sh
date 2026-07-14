#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MOBILE_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
REPO_ROOT="$(cd "${MOBILE_DIR}/../.." && pwd)"
SOURCE="${REPO_ROOT}/apps/web/public/brand/innerbloom-2/flower-square-large.png"
ASSETS="${MOBILE_DIR}/ios/App/App/Assets.xcassets"
APP_ICON="${ASSETS}/AppIcon.appiconset/AppIcon-512@2x.png"
SPLASH_DIR="${ASSETS}/Splash.imageset"

if [[ ! -f "${SOURCE}" ]]; then
  echo "Missing Innerbloom 2 logo asset: ${SOURCE}" >&2
  exit 1
fi

if ! command -v sips >/dev/null 2>&1; then
  echo "This script requires macOS sips." >&2
  exit 1
fi

mkdir -p "$(dirname "${APP_ICON}")" "${SPLASH_DIR}"

sips --resampleHeightWidth 1024 1024 "${SOURCE}" --out "${APP_ICON}" >/dev/null

for filename in splash-2732x2732.png splash-2732x2732-1.png splash-2732x2732-2.png; do
  sips --resampleHeightWidth 2732 2732 "${SOURCE}" --out "${SPLASH_DIR}/${filename}" >/dev/null
done

echo "Updated iOS app icon and splash assets from Innerbloom 2 brand source."
