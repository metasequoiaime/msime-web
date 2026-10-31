#!/usr/bin/env bash
# Renders og-cover.html to public/og-cover.png at 1200x630 with headless Chrome.
#
# Headless Chrome on macOS writes the screenshot and then often hangs in teardown ("Teardown watchdog expired"), exits non-zero and leaves helper processes reparented to launchd. So the script does not wait for Chrome to exit: it waits for the PNG to be written, then stops every process started with this run's throwaway profile, and does the same on any exit path.
set -euo pipefail

here="$(cd "$(dirname "$0")" && pwd)"
out="$here/../../public/og-cover.png"
chrome="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
profile="$(mktemp -d)"
tmp_out="$profile/og-cover.png"

cleanup() {
  # A Chrome stuck in teardown ignores SIGTERM, so follow up with SIGKILL for anything still holding this profile.
  pkill -f "user-data-dir=$profile" 2>/dev/null || true
  sleep 1
  pkill -9 -f "user-data-dir=$profile" 2>/dev/null || true
  rm -rf "$profile"
}
trap cleanup EXIT INT TERM

"$chrome" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
  --user-data-dir="$profile" --no-first-run --no-default-browser-check \
  --allow-file-access-from-files --window-size=1200,630 \
  --screenshot="$tmp_out" "file://$here/og-cover.html" >/dev/null 2>&1 &
disown

# Chrome logs the byte count only after the file is complete; a stable non-zero size is the same signal without parsing logs.
for _ in $(seq 1 60); do
  if [[ -s "$tmp_out" ]]; then
    size=$(wc -c < "$tmp_out")
    sleep 0.5
    [[ "$(wc -c < "$tmp_out")" == "$size" ]] && break
  fi
  sleep 0.5
done
[[ -s "$tmp_out" ]] || { echo "screenshot was not written" >&2; exit 1; }

mv "$tmp_out" "$out"
sips -g pixelWidth -g pixelHeight "$out" | tail -2
