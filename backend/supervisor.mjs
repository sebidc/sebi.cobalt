import { spawn } from 'node:child_process';
const children = new Set();
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill('SIGTERM');
  const timer = setTimeout(() => {
    for (const child of children) child.kill('SIGKILL');
    process.exit(code);
  }, 5000);
  timer.unref();
  process.exitCode = code;
}
function run(args) {
  const child = spawn(process.execPath, args, { stdio: 'inherit' });
  children.add(child);
  child.on('error', error => { console.error(error.message); stop(1); });
  child.on('exit', code => { children.delete(child); if (!stopping) stop(code || 1); });
  return child;
}
process.on('SIGTERM', () => stop());
process.on('SIGINT', () => stop());
// Only the cobalt API is public. The token provider binds to loopback.
process.env.YOUTUBE_SESSION_SERVER = 'http://127.0.0.1:4416';
process.env.YOUTUBE_SESSION_INNERTUBE_CLIENT = 'WEB_EMBEDDED';
run(['/app/session-provider/build/main.js', '--host', '127.0.0.1', '--port', '4416']);
let ready = false;
for (let attempt = 0; attempt < 60 && !stopping; attempt++) {
  try {
    const response = await fetch('http://127.0.0.1:4416/ping', { signal: AbortSignal.timeout(1000) });
    if (response.ok) { ready = true; break; }
  } catch {}
  await new Promise(resolve => setTimeout(resolve, 1000));
}
if (ready && !stopping) run(['src/cobalt']);
else { console.error('YouTube session provider failed to start.'); stop(1); }
