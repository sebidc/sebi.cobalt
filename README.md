# sebi.cobalt

A minimal cobalt frontend with one centered download form, an emoji mascot, a compact side rail linking to [Sebi’s main site](https://sebidc.github.io/), and a Supported sites dialog with wrapping tags. Fonts and colors match [sebi.emojis](https://sebidc.github.io/sebi.emojis/).

**Website:** https://sebidc.github.io/sebi.cobalt/

Visitors only paste a public media link, choose a format, and save the file. There is **no server-address field, API-key prompt, or connection setup for visitors**. The site owner configures the download backend once in `config.js`; previous per-device server settings are ignored.

## Deployment status

The frontend is hosted on GitHub Pages. The official cobalt backend is deployed on Render’s Free plan at **https://sebi-cobalt-api.onrender.com/** and is configured globally in `config.js`. Visitors never need a server address or account. When no endpoint is configured, the page clearly marks downloads as unavailable rather than showing setup prompts.

## Owner maintenance: free Render backend

[Deploy the prepared backend to Render](https://render.com/deploy?repo=https%3A%2F%2Fgithub.com%2Fsebidc%2Fsebi.cobalt)

1. Sign in to Render as the site owner and create a Blueprint from this repository using `render.yaml`.
2. Confirm the service uses the **Free** compute plan. The Blueprint requests only one free web service, no paid disk or database.
3. Render builds `backend/Dockerfile`, which builds the pinned public meowing.de API fork. The startup script uses `RENDER_EXTERNAL_URL` automatically so generated download tunnels have the correct address.
4. After deployment, connect the actual Render service URL once:
   ```sh
   node scripts/connect-backend.mjs https://ACTUAL-SERVICE.onrender.com/
   ```
   The script checks the cobalt response and the CORS configuration before updating `config.js`.
5. Publish that change to GitHub Pages. All visitors then use the configured endpoint automatically, without entering anything.

The prepared server permits the GitHub Pages origin, retains cobalt's rate limiting, and limits media to 20 minutes. No secret API key is embedded in the public frontend.

Render's free services sleep after 15 idle minutes and can take about a minute to resume. This client allows three minutes for resolving a download and requests proxying for file downloads. Free bandwidth and outbound-traffic limits apply; without a payment method, services are suspended when included bandwidth is exhausted. This is a hobby setup, not unlimited public download hosting. See [Render's current free-service limitations](https://render.com/docs/free).

Deployment checks confirmed that a public Streamable video resolves and returns MP4 bytes through the pinned meowing fork. YouTube failed on two public videos with the fork: embedded playback returned `error.api.content.video.unavailable`, the alternative Onesie request with embedded playback returned the same error, and mobile playback with Onesie returned `error.api.youtube.login`. The earlier official API and session-provider tests also failed. This does not establish that hosting IP is the only cause; the operator's live network and private configuration are not known. YouTube is not verified working here. A prior Vimeo test returned `error.api.fetch.fail`. Platform support depends on the backend, its server IP, and any required platform session/cookie configuration. Do not copy credentials or challenge keys from another instance. Hosted cobalt instances require operator permission for external use: [cobalt API docs](https://github.com/imputnet/cobalt/blob/main/docs/api.md).

## Download behavior

`POST /` resolves media with `localProcessing: disabled` and `alwaysProxy: true`. Tunnel and redirect responses become Save file buttons; picker responses become individual file buttons. The browser fetches files, displays progress when size information exists, and saves a Blob through its download manager without navigating away. Large downloads consume browser memory because the file is buffered before saving. Unsupported responses and failed requests show an error; visitors are never asked to fix a server configuration.

## Frontend hosting and preview

GitHub Pages: **Deploy from a branch → main → / (root)**. No build required.

Local preview: `python3 -m http.server 8087 --bind 127.0.0.1`, then open `http://localhost:8087`.

## Design and credits

The slate/cream/green palette, typography and Sebi sticker assets match the user's [sebi.emojis repository](https://github.com/sebidc/sebi.emojis). Fonts, icon, and three sticker assets were copied at the user's request and retain their original ownership and license terms. The MIT license applies to original code written for this repository, not those assets.

Original downloader API: [imputnet/cobalt](https://github.com/imputnet/cobalt), under AGPL-3.0. The deployed API now builds [Patrick's public meowing.de fork](https://github.com/zImPatrick/cobalt/tree/52943246af06ffcd6cc2af9aefbde959e4fc131a), pinned to that commit. Credit to Patrick for the YouTube playback, host-flag, token-generation and retry changes, and to the upstream cobalt developers. The API source and exact build configuration remain available through these links and `backend/Dockerfile`. This build uses the fork's internal token generator, mobile playback and alternative Onesie requests by default; it does not connect to meowing.de's hosted backend. Initial reference: [cobalt.meowing.de](https://cobalt.meowing.de/). No cobalt API source, mascots, backend credentials, or protected-site authentication tokens are copied into this frontend. This project is unaffiliated with those operators.
