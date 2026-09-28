# sebi.cobalt

A small, independent shortcut inspired by [cobalt.meowing.de](https://cobalt.meowing.de/).

**Website:** https://sebidc.github.io/sebi.cobalt/

Paste a public media link and continue to meowing.de, where its cobalt frontend handles format selection, browser challenges, media processing, and the download.

## What this does

- Runs entirely as static HTML, CSS, and JavaScript on GitHub Pages.
- Validates a public HTTP(S) URL and passes it to `https://cobalt.meowing.de/#<encoded-url>`.
- Includes clipboard paste, an accessible about dialog, and mobile layouts.
- Has no analytics, accounts, stored links, copied cobalt assets, or backend credentials.

## Important limitation

This is a **handoff page, not a standalone downloader or a mirror of meowing.de**. Downloading finishes on the external site and depends on its availability and supported services. It does not call meowing.de's protected API from another origin, reuse its challenge site key, or bypass its protection.

Direct downloads within this site would require an API whose operator authorizes this frontend and configures CORS and any challenge/authentication for its origin. No such backend is configured.

The URL prefill format is documented in [cobalt's frontend README](https://github.com/imputnet/cobalt/blob/main/web/README.md#link-prefill).

## Hosting

In GitHub repository settings, enable **Pages → Deploy from a branch → main → / (root)**. No build step or paid server is needed for this page.

For a local preview, run `python3 -m http.server 8080` in this folder, then open `http://localhost:8080`.

## Credits

Original cobalt: [imputnet/cobalt](https://github.com/imputnet/cobalt). Community instance and visual inspiration: [cobalt.meowing.de](https://cobalt.meowing.de/) by its operator. This frontend is independently written; no original source, branding assets, or mascots are included. This project is unaffiliated with either operator.

## License

This repository's original code is MIT licensed; see [LICENSE](LICENSE). Third-party sites and software retain their own terms and licenses.
