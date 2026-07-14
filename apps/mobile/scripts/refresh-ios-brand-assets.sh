#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MOBILE_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
REPO_ROOT="$(cd "${MOBILE_DIR}/../.." && pwd)"
SOURCE="${REPO_ROOT}/apps/web/public/brand/innerbloom-2/flower-square-large.png"
ASSETS="${MOBILE_DIR}/ios/App/App/Assets.xcassets"
[[ -f "${SOURCE}" ]] || { echo "Missing ${SOURCE}" >&2; exit 1; }
command -v sips >/dev/null || { echo "macOS sips is required" >&2; exit 1; }
sips --resampleHeightWidth 1024 1024 "${SOURCE}" --out "${ASSETS}/AppIcon.appiconset/AppIcon-512@2x.png" >/dev/null
for filename in splash-2732x2732.png splash-2732x2732-1.png splash-2732x2732-2.png; do
  sips --resampleHeightWidth 2732 2732 "${SOURCE}" --out "${ASSETS}/Splash.imageset/${filename}" >/dev/null
done
echo "Updated iOS icon and splash from Innerbloom 2 brand asset."
