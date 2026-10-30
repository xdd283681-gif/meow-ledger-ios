#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
if ! command -v xcodebuild >/dev/null 2>&1; then
  echo "需要在安装了 Xcode 的 Mac 上执行此脚本。" >&2
  exit 1
fi
if ! command -v node >/dev/null 2>&1; then
  echo "请先安装 Node.js，或直接使用工程内已生成的 Web 资源。" >&2
  exit 1
fi
node scripts/prepare-ios.cjs
case "${1:-simulator}" in
  simulator)
    xcodebuild -project MeowLedger.xcodeproj -scheme MeowLedger -configuration Debug -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' -derivedDataPath build/DerivedData CODE_SIGNING_ALLOWED=NO build
    ;;
  archive)
    if [[ ! "${TEAM_ID:-}" =~ ^[A-Z0-9]{10}$ ]]; then
      echo "请将 TEAM_ID 设置为你自己的 Apple Developer Team ID（10 位字母数字）。" >&2
      exit 1
    fi
    xcodebuild -project MeowLedger.xcodeproj -scheme MeowLedger -configuration Release -destination 'generic/platform=iOS' -archivePath build/MeowLedger.xcarchive -allowProvisioningUpdates DEVELOPMENT_TEAM="$TEAM_ID" archive
    ;;
  *) echo "用法：bash scripts/build-ios.sh simulator|archive" >&2; exit 1 ;;
esac
