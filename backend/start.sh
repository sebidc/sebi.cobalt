#!/bin/sh
set -eu
# Render supplies its public URL automatically; tunnel URLs must use it.
API_URL="${API_URL:-${RENDER_EXTERNAL_URL:-}}"
if [ -z "$API_URL" ]; then
  echo 'API_URL or RENDER_EXTERNAL_URL is required.' >&2
  exit 1
fi
API_URL="${API_URL%/}/"
API_PORT="${API_PORT:-${PORT:-10000}}"
API_LISTEN_ADDRESS="${API_LISTEN_ADDRESS:-0.0.0.0}"
export API_URL API_PORT API_LISTEN_ADDRESS
exec node src/cobalt
