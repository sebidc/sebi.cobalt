'use strict';

const form = document.querySelector('#save-form');
const input = document.querySelector('#media-url');
const status = document.querySelector('#status');
const pasteButton = document.querySelector('#paste-button');
const about = document.querySelector('#about-dialog');

function message(text, error = false) {
  status.textContent = text;
  status.classList.toggle('error', error);
  input.setAttribute('aria-invalid', String(error));
}

function readPublicUrl(value) {
  const url = new URL(value.trim());
  if (!['http:', 'https:'].includes(url.protocol) || !url.hostname.includes('.') || url.username || url.password) {
    throw new Error('Paste a complete public link beginning with https://.');
  }
  return url.href;
}

form.addEventListener('submit', event => {
  event.preventDefault();
  let mediaUrl;
  try {
    mediaUrl = readPublicUrl(input.value);
  } catch {
    message('Paste a complete public link, such as https://www.youtube.com/watch?v=…', true);
    input.focus();
    return;
  }
  const destination = new URL('https://cobalt.meowing.de/');
  destination.hash = encodeURIComponent(mediaUrl);
  // Navigate in the same tab so browser popup blockers cannot interrupt the handoff.
  // The media URL is passed to the original frontend, never to a third-party API here.
  window.location.assign(destination.href);
});

input.addEventListener('input', () => message(''));
pasteButton.addEventListener('click', async () => {
  try {
    input.value = (await navigator.clipboard.readText()).trim();
    input.focus();
    message(input.value ? 'Link pasted. Ready when you are.' : 'Your clipboard is empty.');
  } catch {
    input.focus();
    message('Paste your link with ⌘V on Mac or Ctrl+V on Windows.');
  }
});

document.querySelector('#about-button').addEventListener('click', () => about.showModal());
document.querySelector('#close-about').addEventListener('click', () => about.close());
about.addEventListener('click', event => {
  const bounds = about.getBoundingClientRect();
  if (event.target === about && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) {
    about.close();
  }
});

if (window.location.hash.length > 1) {
  try {
    input.value = readPublicUrl(decodeURIComponent(window.location.hash.slice(1)));
    message('Link ready. Continue to save it.');
  } catch {
    message('The link in this address could not be read. Paste it below.', true);
  }
}
