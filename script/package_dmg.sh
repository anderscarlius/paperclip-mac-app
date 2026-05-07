#!/usr/bin/env bash
set -euo pipefail

APP_NAME="${APP_NAME:-PaperclipDesktop}"
BUNDLE_ID="${BUNDLE_ID:-com.paperclip.desktop}"
MIN_SYSTEM_VERSION="${MIN_SYSTEM_VERSION:-14.0}"
VERSION="${VERSION:-$(date +%Y.%m.%d)}"
BUILD_NUMBER="${BUILD_NUMBER:-$(date +%Y%m%d%H%M)}"
SIGN_IDENTITY="${SIGN_IDENTITY:-}"
ENTITLEMENTS="${ENTITLEMENTS:-}"
NOTARY_PROFILE="${NOTARY_PROFILE:-}"
SKIP_SIGN="false"
SKIP_NOTARIZE="false"
OUTPUT_DIR=""

usage() {
  printf 'usage: %s [--identity "Developer ID Application: ..."] [--entitlements path] [--notary-profile profile] [--skip-sign] [--skip-notarize] [--output-dir dir]\n' "$0" >&2
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --identity)
      SIGN_IDENTITY="${2:?missing identity}"
      shift 2
      ;;
    --entitlements)
      ENTITLEMENTS="${2:?missing entitlements path}"
      shift 2
      ;;
    --notary-profile)
      NOTARY_PROFILE="${2:?missing notary profile}"
      shift 2
      ;;
    --skip-sign)
      SKIP_SIGN="true"
      shift
      ;;
    --skip-notarize)
      SKIP_NOTARIZE="true"
      shift
      ;;
    --output-dir)
      OUTPUT_DIR="${2:?missing output dir}"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      usage
      exit 2
      ;;
  esac
done

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUILD_DIR="$ROOT_DIR/dist/release"
APP_BUNDLE="$BUILD_DIR/$APP_NAME.app"
APP_CONTENTS="$APP_BUNDLE/Contents"
APP_MACOS="$APP_CONTENTS/MacOS"
APP_RESOURCES="$APP_CONTENTS/Resources"
APP_BINARY="$APP_MACOS/$APP_NAME"
INFO_PLIST="$APP_CONTENTS/Info.plist"
DMG_STAGE="$BUILD_DIR/dmg-stage"
OUTPUT_DIR="${OUTPUT_DIR:-$BUILD_DIR}"
DMG_PATH="$OUTPUT_DIR/$APP_NAME-$VERSION.dmg"

log() {
  printf '[package] %s\n' "$*"
}

copy_paperclip_source() {
  local source_dir="$ROOT_DIR/vendor/paperclip"
  local destination="$APP_RESOURCES/paperclip"

  if [[ ! -f "$source_dir/package.json" ]]; then
    printf 'Missing vendored Paperclip source at %s\n' "$source_dir" >&2
    exit 1
  fi

  if command -v rsync >/dev/null 2>&1; then
    rsync -a --delete \
      --exclude '.git' \
      --exclude 'node_modules' \
      --exclude '.turbo' \
      --exclude '.DS_Store' \
      "$source_dir/" "$destination/"
  else
    rm -rf "$destination"
    mkdir -p "$destination"
    ditto "$source_dir" "$destination"
    find "$destination" -name .git -prune -exec rm -rf {} +
    find "$destination" -name node_modules -prune -exec rm -rf {} +
    find "$destination" -name .turbo -prune -exec rm -rf {} +
    find "$destination" -name .DS_Store -delete
  fi
}

sign_path() {
  local path_to_sign="$1"
  shift
  codesign --force "$@" "$path_to_sign"
}

log "Building Swift release binary"
swift build -c release --product "$APP_NAME"
BUILD_BINARY="$(swift build -c release --show-bin-path)/$APP_NAME"

log "Creating app bundle at $APP_BUNDLE"
rm -rf "$APP_BUNDLE" "$DMG_STAGE"
mkdir -p "$APP_MACOS" "$APP_RESOURCES" "$OUTPUT_DIR"
cp "$BUILD_BINARY" "$APP_BINARY"
chmod +x "$APP_BINARY"

if [[ -d "$ROOT_DIR/Sources/PaperclipDesktop/Resources" ]]; then
  ditto "$ROOT_DIR/Sources/PaperclipDesktop/Resources" "$APP_RESOURCES"
fi

copy_paperclip_source

cat >"$INFO_PLIST" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleDevelopmentRegion</key>
  <string>en</string>
  <key>CFBundleExecutable</key>
  <string>$APP_NAME</string>
  <key>CFBundleIdentifier</key>
  <string>$BUNDLE_ID</string>
  <key>CFBundleName</key>
  <string>Paperclip Desktop</string>
  <key>CFBundleDisplayName</key>
  <string>Paperclip Desktop</string>
  <key>CFBundlePackageType</key>
  <string>APPL</string>
  <key>CFBundleShortVersionString</key>
  <string>$VERSION</string>
  <key>CFBundleVersion</key>
  <string>$BUILD_NUMBER</string>
  <key>LSApplicationCategoryType</key>
  <string>public.app-category.developer-tools</string>
  <key>LSMinimumSystemVersion</key>
  <string>$MIN_SYSTEM_VERSION</string>
  <key>NSHighResolutionCapable</key>
  <true/>
  <key>NSHumanReadableCopyright</key>
  <string>Copyright Paperclip contributors.</string>
  <key>NSPrincipalClass</key>
  <string>NSApplication</string>
  <key>NSAppTransportSecurity</key>
  <dict>
    <key>NSAllowsLocalNetworking</key>
    <true/>
  </dict>
</dict>
</plist>
PLIST
plutil -lint "$INFO_PLIST" >/dev/null

if [[ "$SKIP_SIGN" == "false" ]]; then
  if [[ -z "$SIGN_IDENTITY" ]]; then
    printf 'SIGN_IDENTITY is required unless --skip-sign is passed.\n' >&2
    printf 'Example: %s --identity "Developer ID Application: Your Name (TEAMID)" --notary-profile paperclip\n' "$0" >&2
    exit 2
  fi

  if [[ "$SIGN_IDENTITY" == "-" ]]; then
    SIGN_ARGS=(--timestamp=none --options runtime --sign -)
  else
    SIGN_ARGS=(--timestamp --options runtime --sign "$SIGN_IDENTITY")
  fi
  if [[ -n "$ENTITLEMENTS" ]]; then
    SIGN_ARGS+=(--entitlements "$ENTITLEMENTS")
  fi

  log "Signing app with $SIGN_IDENTITY"
  while IFS= read -r nested_code; do
    sign_path "$nested_code" "${SIGN_ARGS[@]}"
  done < <(find "$APP_BUNDLE" \( -name '*.framework' -o -name '*.dylib' -o -name '*.so' -o -name '*.node' \) -print)

  while IFS= read -r executable_file; do
    if [[ "$executable_file" == "$APP_BINARY" ]]; then
      continue
    fi
    if file "$executable_file" | grep -q 'Mach-O'; then
      sign_path "$executable_file" "${SIGN_ARGS[@]}"
    fi
  done < <(find "$APP_BUNDLE" -type f -perm -111 -print)

  sign_path "$APP_BINARY" "${SIGN_ARGS[@]}"
  sign_path "$APP_BUNDLE" "${SIGN_ARGS[@]}"

  log "Verifying app signature"
  codesign --verify --deep --strict --verbose=2 "$APP_BUNDLE"
  if [[ "$SIGN_IDENTITY" != "-" ]]; then
    spctl --assess --type execute --verbose=4 "$APP_BUNDLE"
  else
    log "Skipping Gatekeeper assessment for ad-hoc signature"
  fi
else
  log "Skipping code signing"
fi

log "Creating DMG"
mkdir -p "$DMG_STAGE"
cp -R "$APP_BUNDLE" "$DMG_STAGE/"
ln -s /Applications "$DMG_STAGE/Applications"
rm -f "$DMG_PATH"
hdiutil create -volname "Paperclip Desktop" -srcfolder "$DMG_STAGE" -ov -format UDBZ "$DMG_PATH"

if [[ "$SKIP_SIGN" == "false" && "$SIGN_IDENTITY" != "-" ]]; then
  log "Signing DMG"
  codesign --force --timestamp --sign "$SIGN_IDENTITY" "$DMG_PATH"
  codesign --verify --verbose=2 "$DMG_PATH"
fi

if [[ "$SKIP_NOTARIZE" == "false" ]]; then
  if [[ -z "$NOTARY_PROFILE" ]]; then
    log "Skipping notarization because NOTARY_PROFILE/--notary-profile is not set"
  else
    log "Submitting DMG for notarization"
    xcrun notarytool submit "$DMG_PATH" --keychain-profile "$NOTARY_PROFILE" --wait
    xcrun stapler staple "$DMG_PATH"
    spctl --assess --type open --context context:primary-signature --verbose=4 "$DMG_PATH"
  fi
else
  log "Skipping notarization"
fi

log "Created $DMG_PATH"
