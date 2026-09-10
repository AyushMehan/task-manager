/**
 * Always-on gateway for http://task-manager
 *
 * A ~30MB Node process that sits on port 80 so the URL always resolves, while
 * Docker — and its multi-gigabyte VM — stays off until actually wanted.
 *
 *   app reachable on :3000  ->  proxy straight through
 *   app not reachable       ->  serve a page offering to start Docker
 *
 * Zero dependencies, so there is nothing to install or keep updated.
 */

import http from 'node:http';
import net from 'node:net';
import { spawn } from 'node:child_process';

const LISTEN_HOST = process.env.GATEWAY_HOST ?? '0.0.0.0';
const LISTEN_PORT = Number(process.env.GATEWAY_PORT ?? 80);
const APP_HOST = process.env.APP_HOST ?? '127.0.0.1';
const APP_PORT = Number(process.env.APP_PORT ?? 3000);

const DOCKER_EXE =
  process.env.DOCKER_DESKTOP_EXE ??
  `${process.env.LOCALAPPDATA}\\Programs\\DockerDesktop\\Docker Desktop.exe`;

/** Probe result is cached briefly so a page of assets is not 50 TCP probes. */
const PROBE_CACHE_MS = 2000;
let lastProbe = { at: 0, up: false };

function probeApp(timeout = 400) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const done = (up) => {
      socket.destroy();
      resolve(up);
    };
    socket.setTimeout(timeout);
    socket.once('connect', () => done(true));
    socket.once('timeout', () => done(false));
    socket.once('error', () => done(false));
    socket.connect(APP_PORT, APP_HOST);
  });
}

async function isAppUp({ fresh = false } = {}) {
  const now = Date.now();
  if (!fresh && now - lastProbe.at < PROBE_CACHE_MS) return lastProbe.up;
  const up = await probeApp();
  lastProbe = { at: now, up };
  return up;
}

let dockerStarting = false;

function startDocker() {
  if (dockerStarting) return;
  dockerStarting = true;
  try {
    // detached + unref so Docker Desktop outlives this request, and this
    // process never becomes its parent-in-waiting.
    spawn(DOCKER_EXE, [], { detached: true, stdio: 'ignore' }).unref();
    console.log('[gateway] launched Docker Desktop');
  } catch (error) {
    console.error('[gateway] could not launch Docker Desktop:', error.message);
  }
  // Allow another attempt after a while in case the first one failed.
  setTimeout(() => {
    dockerStarting = false;
  }, 120_000);
}

function proxy(req, res) {
  const upstream = http.request(
    {
      host: APP_HOST,
      port: APP_PORT,
      method: req.method,
      path: req.url,
      headers: { ...req.headers, host: `${APP_HOST}:${APP_PORT}` },
    },
    (upstreamRes) => {
      res.writeHead(upstreamRes.statusCode ?? 502, upstreamRes.headers);
      upstreamRes.pipe(res);
    },
  );

  upstream.on('error', () => {
    // The app went away mid-flight: fall back rather than showing a raw error.
    lastProbe = { at: 0, up: false };
    if (!res.headersSent) sendWaitingPage(res, 503);
    else res.end();
  });

  req.pipe(upstream);
}

function sendWaitingPage(res, status = 503) {
  const body = WAITING_PAGE;
  res.writeHead(status, {
    'content-type': 'text/html; charset=utf-8',
    'content-length': Buffer.byteLength(body),
    'cache-control': 'no-store',
  });
  res.end(body);
}

const server = http.createServer(async (req, res) => {
  // Control endpoints, handled here so they work while the app is down.
  if (req.url === '/__gateway/status') {
    const up = await isAppUp({ fresh: true });
    const body = JSON.stringify({ up });
    res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
    res.end(body);
    return;
  }

  if (req.url === '/__gateway/start' && req.method === 'POST') {
    startDocker();
    res.writeHead(202, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ starting: true }));
    return;
  }

  if (await isAppUp()) proxy(req, res);
  else sendWaitingPage(res);
});

server.on('error', (error) => {
  if (error.code === 'EACCES') {
    console.error(`[gateway] permission denied binding port ${LISTEN_PORT}.`);
  } else if (error.code === 'EADDRINUSE') {
    console.error(`[gateway] port ${LISTEN_PORT} is already in use.`);
  } else {
    console.error('[gateway]', error);
  }
  process.exit(1);
});

server.listen(LISTEN_PORT, LISTEN_HOST, () => {
  console.log(`[gateway] listening on ${LISTEN_HOST}:${LISTEN_PORT} -> ${APP_HOST}:${APP_PORT}`);
});

const WAITING_PAGE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Task Manager</title>
<style>
  :root {
    color-scheme: light;
    --canvas:#f4f6fa; --surface:#fff; --line:#e2e8f0; --ink:#0f172a;
    --muted:#5b6b85; --faint:#94a3b8; --accent:#4f46e5; --accent-hover:#4338ca;
    --success:#059669;
  }
  * { box-sizing: border-box; }
  body {
    margin:0; min-height:100vh; display:grid; place-items:center; padding:1.5rem;
    background:var(--canvas); color:var(--ink);
    font:14px/1.5 ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  }
  .card {
    width:100%; max-width:26rem; background:var(--surface);
    border:1px solid var(--line); border-radius:14px; padding:1.75rem;
    box-shadow:0 1px 2px rgb(2 6 23/.04), 0 1px 3px rgb(2 6 23/.06);
  }
  h1 { margin:0 0 .35rem; font-size:1.05rem; letter-spacing:-.01em; }
  p { margin:0; color:var(--muted); }
  .row { display:flex; align-items:center; gap:.6rem; margin-bottom:1.1rem; }
  .dot {
    width:9px; height:9px; border-radius:50%; background:var(--faint); flex:none;
  }
  .dot.working { background:var(--accent); animation:pulse 1.2s ease-in-out infinite; }
  .dot.up { background:var(--success); }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.3} }
  button {
    margin-top:1.25rem; width:100%; padding:.65rem 1rem; font:inherit; font-weight:500;
    color:#fff; background:var(--accent); border:0; border-radius:9px; cursor:pointer;
  }
  button:hover:not(:disabled) { background:var(--accent-hover); }
  button:disabled { opacity:.55; cursor:default; }
  .hint { margin-top:1rem; font-size:12px; color:var(--faint); }
  code {
    font-family:ui-monospace, SFMono-Regular, Menlo, monospace; font-size:12px;
    background:var(--canvas); padding:.1rem .35rem; border-radius:4px;
  }
</style>
</head>
<body>
  <main class="card">
    <div class="row">
      <span class="dot" id="dot"></span>
      <div>
        <h1 id="title">Task Manager is asleep</h1>
        <p id="status">Docker isn't running, so the app isn't served yet.</p>
      </div>
    </div>
    <button id="start">Start it</button>
    <p class="hint">
      Docker takes about a minute to warm up. This page checks every two seconds
      and loads the app as soon as it answers &mdash; leave it open.
      You can also start it yourself with <code>docker compose up -d</code>.
    </p>
  </main>
<script>
  const dot = document.getElementById('dot');
  const title = document.getElementById('title');
  const status = document.getElementById('status');
  const button = document.getElementById('start');
  let starting = false;

  async function poll() {
    try {
      const response = await fetch('/__gateway/status', { cache: 'no-store' });
      const { up } = await response.json();
      if (up) {
        dot.className = 'dot up';
        title.textContent = 'Ready';
        status.textContent = 'Loading the app\\u2026';
        setTimeout(() => location.reload(), 400);
        return;
      }
    } catch {}
    setTimeout(poll, 2000);
  }

  button.addEventListener('click', async () => {
    if (starting) return;
    starting = true;
    button.disabled = true;
    button.textContent = 'Starting Docker\\u2026';
    dot.className = 'dot working';
    title.textContent = 'Waking up';
    status.textContent = 'Docker is starting. This usually takes 30\\u201360 seconds.';
    try { await fetch('/__gateway/start', { method: 'POST' }); } catch {}
  });

  poll();
</script>
</body>
</html>`;
