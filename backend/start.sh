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
# The fork generates tokens internally and supplies embedded-player host flags.
CUSTOM_INNERTUBE_CLIENT="${CUSTOM_INNERTUBE_CLIENT:-WEB_EMBEDDED}"
YOUTUBE_GENERATE_PO_TOKENS="${YOUTUBE_GENERATE_PO_TOKENS:-1}"
YOUTUBE_USE_ONESIE="${YOUTUBE_USE_ONESIE:-0}"
export CUSTOM_INNERTUBE_CLIENT YOUTUBE_GENERATE_PO_TOKENS YOUTUBE_USE_ONESIE
exec node src/cobalt
