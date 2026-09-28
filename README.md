# sebi.cobalt

A personal cobalt frontend styled to match [sebi.emojis](https://sebidc.github.io/sebi.emojis/).

**Website:** https://sebidc.github.io/sebi.cobalt/

## Current status

The GitHub Pages frontend supports direct cobalt API requests, video/audio/mute selection, file pickers, download progress, cancellation, and saving files without navigating away. **No download backend is configured yet.** The previous redirect/handoff to meowing.de has been removed.

Connect a cobalt API you own or have operator permission to use in Settings, or set `apiUrl` in `config.js`. Use an HTTPS endpoint for a public backend. `http://localhost:9000/` is accepted for a local backend, subject to browser local-network permissions.

The backend must allow this frontend's origin (`https://sebidc.github.io`) via CORS and support server-side processing. API keys can be entered in settings; they remain in page memory and are never stored or sent to media hosts. A backend using Turnstile must configure this origin and an appropriate authentication flow; this client does not reuse another site's challenge keys or sessions. Hosted cobalt APIs require operator permission for external projects: [API docs](https://github.com/imputnet/cobalt/blob/main/docs/api.md).

## Download behavior

`POST /` resolves media using `localProcessing: disabled`. Tunnel and redirect responses become Save file buttons. Picker responses become individual file buttons. The browser fetches files, displays progress when size information exists, and saves a Blob through its download manager; the page stays open. Media URLs must allow browser fetching. Large downloads consume browser memory because the file is buffered before saving. Unsupported browser-processing-only responses and blocked fetches show an explicit error.

## Hosting and preview

GitHub Pages: **Deploy from a branch → main → / (root)**. No build needed.

Local preview: `python3 -m http.server 8087 --bind 127.0.0.1`, then open `http://localhost:8087`.

## Design and credits

The slate/cream/green palette, typography, header, hero layout, and Sebi sticker assets match the user's [sebi.emojis repository](https://github.com/sebidc/sebi.emojis). Fonts, icon, and three sticker assets were copied from that repository at the user's request and retain their original ownership and license terms. The MIT license applies to original code written for this repository, not these third-party assets.

Original downloader API: [imputnet/cobalt](https://github.com/imputnet/cobalt). Initial reference: [cobalt.meowing.de](https://cobalt.meowing.de/). No cobalt code, mascots, backend credentials, or protected-site authentication tokens are included. This is an independent client, unaffiliated with those operators.
