'use strict';
const $ = selector => document.querySelector(selector);
const input = $('#media-url');
const status = $('#status');
let mode = 'auto';
const apiUrl = window.SEBI_COBALT_CONFIG?.apiUrl || '';
let activeRequest = null;
let busy = false;
const MAX_DOWNLOAD_MS = 30 * 60 * 1000;

function remember(name, value) { try { value ? localStorage.setItem(name, value) : localStorage.removeItem(name); } catch {} }
function recalled(name) { try { return localStorage.getItem(name) || ''; } catch { return ''; } }
// Download service is configured once by the owner, never by visitors.
remember('sebi-cobalt-server', '');

function showStatus(text, error = false, target = status) {
  target.textContent = text;
  target.classList.toggle('error', error);
}
function safeUrl(value) {
  const url = new URL(value.trim());
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('Please use a complete HTTP or HTTPS link.');
  return url;
}
function serverUrl(value) {
  const url = safeUrl(value);
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (url.protocol !== 'https:' && !local) throw new Error('Use an HTTPS server address, or a local address on your own computer.');
  if (url.search || url.hash) throw new Error('Use the server address without query parameters or a fragment.');
  url.pathname = url.pathname.replace(/\/*$/, '/');
  return url.href;
}
function refreshConnection() {
  $('#connection-text').textContent = apiUrl ? 'Download service connected' : 'Downloads getting ready';
  $('#connection-badge').classList.toggle('connected', Boolean(apiUrl));
  $('#setup-note').hidden = Boolean(apiUrl);
  $('#download-button').disabled = !apiUrl;
}
function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  const light = theme === 'light';
  $('#theme-toggle').setAttribute('aria-label', `Switch to ${light ? 'dark' : 'light'} mode`);
  $('#theme-toggle').innerHTML = `<span aria-hidden="true">${light ? '☾' : '☀'}</span><span class="theme-label">${light ? 'Dark' : 'Light'} mode</span>`;
  $('meta[name="theme-color"]').content = light ? '#f2efdf' : '#333c43';
}
setTheme(recalled('sebi-theme') === 'light' ? 'light' : 'dark');
$('#theme-toggle').addEventListener('click', () => {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  setTheme(next); remember('sebi-theme', next);
});

function clearResults() { $('#results').replaceChildren(); $('#results').hidden = true; }
function setBusy(value) {
  busy = value;
  $('#download-button').disabled = value || !apiUrl;
  document.querySelectorAll('.file-row button').forEach(button => { button.disabled = value; });
  $('#progress-area').hidden = !value;
  if (value) $('#progress').removeAttribute('value');
}
function friendlyError(code, httpStatus) {
  if (httpStatus === 429 || code?.includes('rate')) return 'The server is busy or has reached its request limit. Please try again later.';
  if (code?.includes('auth') || code?.includes('turnstile') || [401, 403].includes(httpStatus)) return 'The download service needs attention. Please try again later; no setup is needed on your device.';
  if (code?.includes('private')) return 'This content is private and cannot be downloaded.';
  if (code?.includes('unsupported')) return 'This link or website is not supported yet.';
  if (code?.includes('unavailable')) return 'The media is unavailable. Try another public link.';
  if (code?.includes('too_long')) return 'This video exceeds the server’s duration limit.';
  if (code?.includes('youtube.login')) return 'YouTube is blocking downloads from this server. You can still try links from other supported sites.';
  if (code?.includes('session') || code?.includes('token')) return 'The download service is refreshing its connection. Please try again in a minute.';
  return `The download server could not process this link${code ? ` (${code})` : ''}. Try another link or try again later.`;
}
function filenameSafe(name, fallback) {
  return String(name || fallback).replace(/[\x00-\x1f/\\]/g, '_').slice(0, 200) || fallback;
}
function addFile(urlValue, filename) {
  const url = safeUrl(urlValue).href;
  const row = document.createElement('div'); row.className = 'file-row';
  const label = document.createElement('span'); label.className = 'file-name'; label.textContent = filename;
  const button = document.createElement('button'); button.type = 'button'; button.className = 'button primary'; button.textContent = 'Save file ↓';
  button.addEventListener('click', () => saveFile(url, filename));
  row.append(label, button); $('#results').append(row); $('#results').hidden = false;
}

$('#save-form').addEventListener('submit', async event => {
  event.preventDefault();
  if (busy) return;
  let mediaUrl;
  try { mediaUrl = safeUrl(input.value).href; }
  catch { input.setAttribute('aria-invalid', 'true'); showStatus('Paste a complete public link beginning with https://.', true); input.focus(); return; }
  input.removeAttribute('aria-invalid');
  if (!apiUrl) { showStatus('Downloads aren’t ready yet. Please check back soon; there’s nothing to set up.', true); return; }
  const controller = new AbortController(); activeRequest = controller;
  const timer = setTimeout(() => controller.abort(), 180000);
  clearResults(); setBusy(true); showStatus('Finding your little download… The service may take a minute to wake up.');
  try {
    const endpoint = serverUrl(apiUrl);
    const headers = { Accept: 'application/json', 'Content-Type': 'application/json' };
    const response = await fetch(endpoint, {
      method: 'POST', headers, signal: controller.signal, redirect: 'error',
      body: JSON.stringify({ url: mediaUrl, downloadMode: mode, videoQuality: $('#quality').value, audioFormat: 'mp3', localProcessing: 'disabled', alwaysProxy: true, filenameStyle: 'pretty' })
    });
    const data = await response.json().catch(() => { throw new Error('The download service is not ready yet. Please try again in a minute.'); });
    if (!response.ok || data.status === 'error') throw new Error(friendlyError(data.error?.code, response.status));
    if (['tunnel', 'redirect'].includes(data.status)) {
      addFile(data.url, filenameSafe(data.filename, mode === 'audio' ? 'sebi-audio.mp3' : 'sebi-video.mp4'));
    } else if (data.status === 'picker' && Array.isArray(data.picker)) {
      data.picker.forEach((item, index) => {
        const type = ['photo', 'video', 'gif'].includes(item.type) ? item.type : 'media';
        const extension = { photo: 'jpg', video: 'mp4', gif: 'gif', media: 'bin' }[type];
        addFile(item.url, `sebi-${type}-${index + 1}.${extension}`);
      });
      if (data.audio) addFile(data.audio, filenameSafe(data.audioFilename, 'sebi-audio.mp3'));
      if (!$('#results').children.length) throw new Error('The post has no downloadable files.');
    } else if (data.status === 'local-processing') {
      throw new Error('This file needs processing that isn’t available yet. Please try another format or link.');
    } else { throw new Error('The download service returned an unexpected response. Please try again later.'); }
    showStatus('Your find is ready. Choose Save file to keep it.');
  } catch (error) {
    clearResults();
    showStatus(controller.signal.aborted ? 'Request stopped. You can try again.' : error instanceof TypeError ? 'The download service could not be reached. Please try again in a minute.' : error.message, true);
  } finally { clearTimeout(timer); if (activeRequest === controller) activeRequest = null; setBusy(false); }
});

async function saveFile(url, filename) {
  if (busy) return;
  const controller = new AbortController(); activeRequest = controller;
  const timer = setTimeout(() => controller.abort(), MAX_DOWNLOAD_MS);
  setBusy(true); showStatus('Downloading your file…');
  try {
    // Never send the server API key to a media URL or another origin.
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`File download failed (${response.status}). Get a new download link and try again.`);
    const total = Number(response.headers.get('Content-Length')) || 0;
    const chunks = []; let received = 0;
    const reader = response.body?.getReader();
    let blob;
    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value); received += value.byteLength;
        if (total > 0) $('#progress').value = Math.min(100, received / total * 100);
        showStatus(`Downloading ${filename} · ${(received / 1024 / 1024).toFixed(1)} MB${total > 0 ? ` of ${(total / 1024 / 1024).toFixed(1)} MB` : ''}`);
      }
      blob = new Blob(chunks, { type: response.headers.get('Content-Type') || 'application/octet-stream' });
    } else { blob = await response.blob(); }
    if (blob.size === 0) throw new Error('The server returned an empty file. Get a new download link and try again.');
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = objectUrl; link.download = filename; link.hidden = true;
    document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
    showStatus('File sent to your browser’s downloads. A little find, kept.');
  } catch (error) {
    showStatus(controller.signal.aborted ? 'Download stopped. You can try again.' : error instanceof TypeError ? 'This file could not be downloaded here. The link may have expired. Get a new download link and try again.' : error.message, true);
  } finally { clearTimeout(timer); if (activeRequest === controller) activeRequest = null; setBusy(false); }
}

$('#cancel-button').addEventListener('click', () => activeRequest?.abort());
input.addEventListener('input', () => { input.removeAttribute('aria-invalid'); if (!busy) showStatus(''); });
$('#paste-button').addEventListener('click', async () => {
  try { input.value = (await navigator.clipboard.readText()).trim(); input.focus(); showStatus(input.value ? 'Link pasted. Choose your format below.' : 'Your clipboard is empty.'); }
  catch { input.focus(); showStatus('Paste with ⌘V on Mac or Ctrl+V on Windows.'); }
});
document.querySelectorAll('[data-mode]').forEach(button => button.addEventListener('click', () => {
  if (busy) return;
  mode = button.dataset.mode;
  document.querySelectorAll('[data-mode]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
  $('#quality').disabled = mode === 'audio'; clearResults();
}));
refreshConnection();
if (location.hash.length > 1 && location.hash !== '#save') {
  try { input.value = safeUrl(decodeURIComponent(location.hash.slice(1))).href; } catch {}
}

const servicesDialog = $('#services-dialog');
let servicesCloseTimer;
function closeServices() {
  if (!servicesDialog.open || servicesDialog.classList.contains('is-closing')) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { servicesDialog.close(); return; }
  servicesDialog.classList.add('is-closing');
  servicesCloseTimer = setTimeout(() => servicesDialog.close(), 160);
}
$('#services-button').addEventListener('click', () => {
  servicesDialog.show();
  $('#services-button').setAttribute('aria-expanded', 'true');
});
$('#services-close').addEventListener('click', closeServices);
servicesDialog.addEventListener('cancel', event => { event.preventDefault(); closeServices(); });
servicesDialog.addEventListener('close', () => {
  clearTimeout(servicesCloseTimer);
  servicesDialog.classList.remove('is-closing');
  $('#services-button').setAttribute('aria-expanded', 'false');
  if (servicesDialog.contains(document.activeElement)) $('#services-button').focus();
});
document.addEventListener('pointerdown', event => {
  if (!servicesDialog.contains(event.target) && !$('#services-button').contains(event.target)) closeServices();
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && servicesDialog.open) { event.preventDefault(); closeServices(); }
});
