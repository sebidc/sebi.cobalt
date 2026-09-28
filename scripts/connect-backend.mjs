// Owner maintenance: connect a deployed backend once for every visitor.
// node scripts/connect-backend.mjs https://actual-service.onrender.com/
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const input = process.argv[2];
if (!input) throw new Error('Provide the deployed backend URL.');
const url = new URL(input);
if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) {
  throw new Error('Use a public HTTPS address without credentials or query parameters.');
}
url.pathname = url.pathname.replace(/\/*$/, '/');
const response = await fetch(url, { signal: AbortSignal.timeout(180000), headers: { Origin: 'https://sebidc.github.io' } });
if (!response.ok) throw new Error(`Backend check failed: HTTP ${response.status}`);
const info = await response.json();
if (!info.cobalt || !Array.isArray(info.cobalt.services)) throw new Error('This address does not return a cobalt API.');
if (info.cobalt.turnstileSitekey) throw new Error('This backend requires a browser challenge; configure a matching authentication flow before connecting.');
const allowedOrigin = response.headers.get('access-control-allow-origin');
if (!['*', 'https://sebidc.github.io'].includes(allowedOrigin)) throw new Error('Backend must permit https://sebidc.github.io via CORS.');
await writeFile(fileURLToPath(new URL('../config.js', import.meta.url)),
  `'use strict';\n// Public download endpoint, set by the site owner. No private credentials.\nwindow.SEBI_COBALT_CONFIG = Object.freeze(${JSON.stringify({ apiUrl: url.href })});\n`);
console.log(`Connected ${url.href} for every visitor. Commit and publish config.js.`);
