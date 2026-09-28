'use strict';
const $ = selector => document.querySelector(selector);
const input = $('#media-url');
const status = $('#status');
const settings = $('#settings-dialog');
let mode = 'auto';
let apiUrl = window.SEBI_COBALT_CONFIG?.apiUrl || '';
let apiKey = '';
let activeRequest = null;
let busy = false;
const MAX_DOWNLOAD_MS = 30 * 60 * 1000;

function remember(name, value) { try { value ? localStorage.setItem(name, value) : localStorage.removeItem(name); } catch {} }
function recalled(name) { try { return localStorage.getItem(name) || ''; } catch { return ''; } }
apiUrl = recalled('sebi-cobalt-server') || apiUrl;

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
  $('#connection-text').textContent = apiUrl ? 'Server configured' : 'Connect download server';
  $('#connection-button').classList.toggle('connected', Boolean(apiUrl));
  $('#setup-note').hidden = Boolean(apiUrl);
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

function openSettings() {
  $('#server-url').value = apiUrl;
  $('#api-key').value = apiKey;
  showStatus('', false, $('#settings-status'));
  settings.showModal();
}
['#settings-button', '#connection-button', '#setup-button'].forEach(selector => $(selector).addEventListener('click', openSettings));
$('#close-settings').addEventListener('click', () => settings.close());
$('#settings-form').addEventListener('submit', event => {
  event.preventDefault();
  if (busy) { showStatus('Finish or cancel the current download before changing servers.', true, $('#settings-status')); return; }
  try {
    const address = serverUrl($('#server-url').value);
    apiUrl = address;
    apiKey = $('#api-key').value.trim();
    remember('sebi-cobalt-server', apiUrl);
    refreshConnection(); clearResults(); settings.close();
    showStatus('Server configured. Paste a link to try your first download.');
  } catch (error) { showStatus(error.message || 'Enter your download server address.', true, $('#settings-status')); }
});
$('#forget-server').addEventListener('click', () => {
  if (busy) { showStatus('Finish or cancel the current download first.', true, $('#settings-status')); return; }
  apiUrl = ''; apiKey = ''; remember('sebi-cobalt-server', '');
  $('#server-url').value = ''; $('#api-key').value = '';
  refreshConnection(); clearResults(); settings.close(); showStatus('Server disconnected.');
});

function clearResults() { $('#results').replaceChildren(); $('#results').hidden = true; }
function setBusy(value) {
  busy = value;
  $('#download-button').disabled = value;
  document.querySelectorAll('.file-row button').forEach(button => { button.disabled = value; });
  $('#progress-area').hidden = !value;
  if (value) $('#progress').removeAttribute('value');
}
function friendlyError(code, httpStatus) {
  if (httpStatus === 429 || code?.includes('rate')) return 'The server is busy or has reached its request limit. Please try again later.';
  if (code?.includes('auth') || code?.includes('turnstile') || [401, 403].includes(httpStatus)) return 'This server requires access or a browser challenge. Ask its operator to enable this website, or connect your own server in settings.';
  if (code?.includes('private')) return 'This content is private and cannot be downloaded.';
  if (code?.includes('unsupported')) return 'This link or website is not supported by your download server.';
  if (code?.includes('unavailable')) return 'The media is unavailable. Try another public link.';
  if (code?.includes('too_long')) return 'This video exceeds the server’s duration limit.';
  if (code?.includes('youtube.login') || code?.includes('session') || code?.includes('token')) return 'YouTube needs additional setup on your download server. Ask its operator to check the YouTube configuration.';
  return `The download server could not process this link${code ? ` (${code})` : ''}. Try another link or check your server.`;
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
  if (!apiUrl) { showStatus('Connect a download server in settings first. Your link will stay here.', true); openSettings(); return; }
  const controller = new AbortController(); activeRequest = controller;
  const timer = setTimeout(() => controller.abort(), 60000);
  clearResults(); setBusy(true); showStatus('Finding your little download…');
  try {
    const endpoint = serverUrl(apiUrl);
    const headers = { Accept: 'application/json', 'Content-Type': 'application/json' };
    if (apiKey) headers.Authorization = `Api-Key ${apiKey}`;
    const response = await fetch(endpoint, {
      method: 'POST', headers, signal: controller.signal, redirect: 'error',
      body: JSON.stringify({ url: mediaUrl, downloadMode: mode, videoQuality: $('#quality').value, audioFormat: 'mp3', localProcessing: 'disabled', filenameStyle: 'pretty' })
    });
    const data = await response.json().catch(() => { throw new Error('The server did not return a cobalt response. Check its address in settings.'); });
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
      throw new Error('This server only offers browser processing for this file. Connect a server that supports server-side processing.');
    } else { throw new Error('The server returned an unsupported response. Check your server version.'); }
    showStatus('Your find is ready. Choose Save file to keep it.');
  } catch (error) {
    clearResults();
    showStatus(controller.signal.aborted ? 'Request stopped. You can try again.' : error instanceof TypeError ? 'Could not reach your server. Check that it is running and allows this website to connect.' : error.message, true);
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
    showStatus(controller.signal.aborted ? 'Download stopped. You can try again.' : error instanceof TypeError ? 'This file could not be downloaded here. Its server may block browser downloads, or the link may have expired. Check your backend’s proxy settings.' : error.message, true);
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
