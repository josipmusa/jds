import * as http from 'node:http';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as net from 'node:net';
import { WebSocketServer, WebSocket } from 'ws';
import { resolveDbPath, readGraph } from './db.js';
import { buildGraph } from './graph.js';

const IDLE_TIMEOUT_MS = 5 * 60 * 1000;

function pidFileForDb(dbPath: string): string {
  // Derive a stable key from the session DB path (use the session UUID directory name)
  const sessionDir = path.basename(path.dirname(dbPath));
  return `/tmp/jds-viz-${sessionDir}.pid`;
}

function parseArgs(): { port: number; dbPath: string } {
  const args = process.argv.slice(2);
  let port = 3847;
  let dbPath = '';
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--port' && args[i + 1]) port = parseInt(args[++i], 10);
    if (args[i] === '--db' && args[i + 1]) dbPath = args[++i];
  }
  return { port, dbPath: dbPath || resolveDbPath() };
}

function findFreePort(start: number): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(start, () => {
      const { port } = server.address() as net.AddressInfo;
      server.close(() => resolve(port));
    });
    server.on('error', () => findFreePort(start + 1).then(resolve, reject));
  });
}

function writePidFile(pidFile: string): void {
  fs.writeFileSync(pidFile, String(process.pid));
}

function removePidFile(pidFile: string): void {
  try { fs.unlinkSync(pidFile); } catch { /* already gone */ }
}

async function main(): Promise<void> {
  const { port: preferredPort, dbPath } = parseArgs();

  if (!fs.existsSync(dbPath)) {
    console.error(`[jds-viz] DB not found: ${dbPath}`);
    process.exit(1);
  }

  const pidFile = pidFileForDb(dbPath);
  const port = await findFreePort(preferredPort);
  const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');

  writePidFile(pidFile);
  process.on('exit', () => removePidFile(pidFile));
  process.on('SIGTERM', () => process.exit(0));
  process.on('SIGINT', () => process.exit(0));

  const httpServer = http.createServer((req, res) => {
    if (req.url === '/health') {
      res.writeHead(200).end('ok');
      return;
    }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }).end(html);
  });

  const wss = new WebSocketServer({ server: httpServer });
  const clients = new Set<WebSocket>();
  let idleTimer: ReturnType<typeof setTimeout> | null = null;

  function resetIdleTimer(): void {
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = null;
    if (clients.size === 0) {
      idleTimer = setTimeout(() => {
        console.log('[jds-viz] No clients for 5 min — shutting down.');
        process.exit(0);
      }, IDLE_TIMEOUT_MS);
    }
  }

  function broadcast(): void {
    if (clients.size === 0) return;
    try {
      const { todos, deps } = readGraph(dbPath);
      const payload = JSON.stringify(buildGraph(todos, deps));
      for (const ws of clients) {
        if (ws.readyState === WebSocket.OPEN) ws.send(payload);
      }
    } catch (err) {
      console.error('[jds-viz] Failed to read DB:', err);
    }
  }

  wss.on('connection', (ws) => {
    clients.add(ws);
    if (idleTimer) { clearTimeout(idleTimer); idleTimer = null; }
    broadcast();
    ws.on('close', () => {
      clients.delete(ws);
      resetIdleTimer();
    });
  });

  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  fs.watch(path.dirname(dbPath), () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(broadcast, 200);
  });

  httpServer.listen(port, () => {
    console.log(`Task visualization running at http://localhost:${port}`);
  });

  resetIdleTimer();
}

main().catch(err => {
  console.error('[jds-viz] Fatal:', err);
  process.exit(1);
});
