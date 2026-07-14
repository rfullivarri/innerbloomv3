#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MOBILE_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
REPO_ROOT="$(cd "${MOBILE_DIR}/../.." && pwd)"

ICON_SOURCE="${REPO_ROOT}/apps/web/public/brand/innerbloom-2/flower-square-large.png"
SPLASH_SOURCE="${REPO_ROOT}/apps/web/public/IB-COLOR-LOGO-v2.png"
ASSETS="${MOBILE_DIR}/ios/App/App/Assets.xcassets"

[[ -f "${ICON_SOURCE}" ]] || { echo "Missing ${ICON_SOURCE}" >&2; exit 1; }
[[ -f "${SPLASH_SOURCE}" ]] || { echo "Missing ${SPLASH_SOURCE}" >&2; exit 1; }
command -v sips >/dev/null || { echo "macOS sips is required" >&2; exit 1; }

# The iOS home-screen icon uses the standalone square flower mark.
sips --resampleHeightWidth 1024 1024 \
  "${ICON_SOURCE}" \
  --out "${ASSETS}/AppIcon.appiconset/AppIcon-512@2x.png" >/dev/null

# The launch experience uses the canonical complete Innerbloom lockup.
# Preserve the original aspect ratio and transparency; UIKit controls sizing.
for filename in splash-2732x2732.png splash-2732x2732-1.png splash-2732x2732-2.png; do
  cp "${SPLASH_SOURCE}" "${ASSETS}/Splash.imageset/${filename}"
done

echo "Updated iOS icon from the flower mark and splash from IB-COLOR-LOGO-v2.png."
