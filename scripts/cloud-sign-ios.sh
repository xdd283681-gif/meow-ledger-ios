#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
: "${RUNNER_TEMP:?Run this in a GitHub macOS runner}"
: "${IOS_CERTIFICATE_BASE64:?Add IOS_CERTIFICATE_BASE64 in repository Actions secrets}"
: "${IOS_CERTIFICATE_PASSWORD:?Add IOS_CERTIFICATE_PASSWORD in repository Actions secrets}"
: "${IOS_PROFILE_BASE64:?Add IOS_PROFILE_BASE64 in repository Actions secrets}"
: "${IOS_BUNDLE_ID:?Choose the Bundle ID registered with Apple}"
: "${IOS_EXPORT_METHOD:?Choose debugging, release-testing or app-store-connect}"
if [[ ! "$IOS_BUNDLE_ID" =~ ^[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)+$ ]]; then echo 'Invalid Bundle ID' >&2; exit 1; fi
case "$IOS_EXPORT_METHOD" in debugging|release-testing|app-store-connect) ;; *) echo 'Invalid export method' >&2; exit 1;; esac
MEOW_SIGN_DIR=$(mktemp -d "$RUNNER_TEMP/meow-sign.XXXXXX")
MEOW_KEYCHAIN="$MEOW_SIGN_DIR/signing.keychain-db"
MEOW_PROFILE_DEST=''
cleanup() {
  security delete-keychain "$MEOW_KEYCHAIN" >/dev/null 2>&1 || true
  if [[ -n "$MEOW_PROFILE_DEST" ]]; then rm -f -- "$MEOW_PROFILE_DEST"; fi
  rm -rf -- "$MEOW_SIGN_DIR"
}
trap cleanup EXIT
export MEOW_SIGN_DIR
python3 - <<'PY'
import base64, os
from pathlib import Path
root=Path(os.environ['MEOW_SIGN_DIR'])
for variable,name in [('IOS_CERTIFICATE_BASE64','certificate.p12'),('IOS_PROFILE_BASE64','profile.mobileprovision')]:
    root.joinpath(name).write_bytes(base64.b64decode(''.join(os.environ[variable].split()),validate=True))
PY
MEOW_KEYCHAIN_PASSWORD=$(openssl rand -hex 24)
echo "::add-mask::$MEOW_KEYCHAIN_PASSWORD"
security create-keychain -p "$MEOW_KEYCHAIN_PASSWORD" "$MEOW_KEYCHAIN"
security set-keychain-settings -lut 21600 "$MEOW_KEYCHAIN"
security unlock-keychain -p "$MEOW_KEYCHAIN_PASSWORD" "$MEOW_KEYCHAIN"
security import "$MEOW_SIGN_DIR/certificate.p12" -P "$IOS_CERTIFICATE_PASSWORD" -A -t cert -f pkcs12 -k "$MEOW_KEYCHAIN"
security set-key-partition-list -S apple-tool:,apple:,codesign: -s -k "$MEOW_KEYCHAIN_PASSWORD" "$MEOW_KEYCHAIN" >/dev/null
security list-keychains -d user -s "$MEOW_KEYCHAIN" "$HOME/Library/Keychains/login.keychain-db"
security cms -D -i "$MEOW_SIGN_DIR/profile.mobileprovision" > "$MEOW_SIGN_DIR/profile.plist"
python3 scripts/prepare-signing.py "$MEOW_SIGN_DIR/profile.plist" "$MEOW_SIGN_DIR"
MEOW_UUID=$(cat "$MEOW_SIGN_DIR/uuid.txt")
MEOW_TEAM=$(cat "$MEOW_SIGN_DIR/team.txt")
MEOW_PROFILE_DEST="$HOME/Library/MobileDevice/Provisioning Profiles/$MEOW_UUID.mobileprovision"
mkdir -p "$(dirname "$MEOW_PROFILE_DEST")"
cp "$MEOW_SIGN_DIR/profile.mobileprovision" "$MEOW_PROFILE_DEST"
MEOW_IDENTITY=$(security find-identity -v -p codesigning "$MEOW_KEYCHAIN" | sed -nE 's/.*[0-9]+\) ([A-Fa-f0-9]{40}) .*/\1/p' | head -n 1)
if [[ -z "$MEOW_IDENTITY" ]]; then echo 'No valid code signing identity in certificate' >&2; exit 1; fi
mkdir -p build
xcodebuild -project MeowLedger.xcodeproj -scheme MeowLedger -configuration Release \
  -destination 'generic/platform=iOS' -archivePath build/MeowLedger.xcarchive \
  CODE_SIGN_STYLE=Manual DEVELOPMENT_TEAM="$MEOW_TEAM" \
  PRODUCT_BUNDLE_IDENTIFIER="$IOS_BUNDLE_ID" CODE_SIGN_IDENTITY="$MEOW_IDENTITY" \
  PROVISIONING_PROFILE_SPECIFIER="$MEOW_UUID" archive
xcodebuild -exportArchive -archivePath build/MeowLedger.xcarchive \
  -exportOptionsPlist "$MEOW_SIGN_DIR/ExportOptions.plist" -exportPath build/export
find build/export -name '*.ipa' -exec shasum -a 256 {} \;
