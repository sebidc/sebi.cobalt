// These modifications to cobalt are provided under AGPL-3.0, as is cobalt.
// Original source: https://github.com/imputnet/cobalt/tree/a636575b09de1fc55d9b8cd98cac88f5f2f16b42
import { readFile, writeFile } from 'node:fs/promises';
async function replaceOnce(path, before, after) {
  const source = await readFile(path, 'utf8');
  if (source.split(before).length !== 2) throw new Error(`Upstream compatibility patch does not match: ${path}`);
  await writeFile(path, source.replace(before, after));
}
await replaceOnce('src/processing/helpers/youtube-session.js',
  "{ method: 'POST', dispatcher: defaultAgent }",
  "{ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}', dispatcher: defaultAgent }");
// Use the configured web session at every requested resolution. The upstream
// default only selects it above 1080p; IOS requests still fail on this host.
const youtube = 'src/processing/services/youtube.js';
const source = await readFile(youtube, 'utf8');
const start = source.indexOf('    let useSession =');
const end = source.indexOf('    // we can get subtitles', start);
if (start < 0 || end < start || !source.slice(start, end).includes('quality > 1080')) throw new Error('YouTube session patch does not match');
await writeFile(youtube, source.slice(0, start) + '    let useSession = Boolean(env.ytSessionServer && !useHLS);\n\n' + source.slice(end));
// Current web tokens are bound to the video ID, not just visitor data.
await replaceOnce(youtube, '    let info;\n    try {\n        info = await yt.getBasicInfo(o.id, { client: innertubeClient });', `    let info;
    let videoPoToken;
    const bindVideoToken = (value) => {
        if (!videoPoToken) return value;
        const url = new URL(value);
        url.searchParams.set('pot', videoPoToken);
        return url.href;
    };
    try {
        if (useSession) {
            const endpoint = new URL('/get_pot', env.ytSessionServer);
            const response = await fetch(endpoint, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content_binding: o.id, innertube_context: yt.session.context }),
                signal: AbortSignal.timeout(30000)
            });
            const token = await response.json();
            if (!response.ok || !token.poToken) throw new Error('YouTube video token unavailable');
            videoPoToken = token.poToken;
        }
        info = await yt.getBasicInfo(o.id, { client: innertubeClient, po_token: videoPoToken });`);
await replaceOnce(youtube, 'urls = await audio.decipher(innertube.session.player);', 'urls = bindVideoToken(await audio.decipher(innertube.session.player));');
await replaceOnce(youtube, 'video = await video.decipher(innertube.session.player);', 'video = bindVideoToken(await video.decipher(innertube.session.player));');
await replaceOnce(youtube, 'audio = await audio.decipher(innertube.session.player);', 'audio = bindVideoToken(await audio.decipher(innertube.session.player));');
