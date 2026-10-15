import express from 'express';
import http from 'node:http';
import https from 'node:https';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.disable('x-powered-by');
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '0.0.0.0';
const BACKEND = process.env.BACKEND_URL || 'http://127.0.0.1:8000';
const DIST_DIR = path.join(__dirname, 'dist');
const STANDALONE_FILE = existsSync(path.join(__dirname, 'fotexagyn-standalone.html'))
  ? path.join(__dirname, 'fotexagyn-standalone.html')
  : path.join(__dirname, 'dist', 'index.html');

// Hardening headers para páginas estáticas e respostas da API proxy.
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  const scriptPolicy = _req.path === '/standalone' ? "'self' 'unsafe-inline'" : "'self' 'unsafe-inline'";
  res.setHeader(
    'Content-Security-Policy',
    `default-src 'self'; script-src ${scriptPolicy} https://cdn.tailwindcss.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com; font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com data:; img-src 'self' data: https:; connect-src 'self' ${BACKEND} http://localhost:8000 http://127.0.0.1:8000; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'`,
  );
  next();
});

// Proxy /api/* para o backend FastAPI, repassando credenciais, headers e cookies da sessão.
app.use((req, res, next) => {
  if (req.path !== '/api' && !req.path.startsWith('/api/')) return next();

  const upstreamUrl = new URL(req.originalUrl, BACKEND);
  const transport = upstreamUrl.protocol === 'https:' ? https : http;
  
  const headers = { ...req.headers };
  headers.host = upstreamUrl.host;

  const upstream = transport.request(upstreamUrl, {
    method: req.method,
    headers,
  }, (upstreamResponse) => {
    res.writeHead(upstreamResponse.statusCode || 502, upstreamResponse.headers);
    upstreamResponse.pipe(res);
  });

  upstream.on('error', (error) => {
    console.error(`[FotexaGYN API Proxy Error]: ${error.message}`);
    if (!res.headersSent) {
      res.status(502).json({ error: 'Backend FotexaGYN indisponível ou offline', details: error.message });
    }
  });

  req.pipe(upstream);
});

app.get('/health', (_req, res) => {
  res.json({ 
    status: 'ok', 
    app: 'FotexaGYN',
    frontend: existsSync(path.join(DIST_DIR, 'index.html')) ? 'built' : 'not-built',
    backend: BACKEND
  });
});

app.get('/standalone', (_req, res) => {
  if (!existsSync(STANDALONE_FILE)) return res.sendStatus(404);
  res.sendFile(STANDALONE_FILE);
});

app.use(express.static(DIST_DIR, { index: false, fallthrough: true }));


// Tela isolada de check-in (tablet recepção)
app.get('/checkin-tablet', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'checkin-tablet.html'));
});
app.get('/checkin', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'checkin-tablet.html'));
});

app.use((req, res) => {
  const indexFile = path.join(DIST_DIR, 'index.html');
  if (req.method !== 'GET' || !existsSync(indexFile)) {
    if (existsSync(STANDALONE_FILE)) {
      return res.sendFile(STANDALONE_FILE);
    }
    return res.status(503).send('FotexaGYN Frontend não compilado. Execute "npm run build" antes de iniciar o servidor.');
  }
  res.sendFile(indexFile);
});

app.listen(PORT, HOST, () => {
  console.log(`=========================================`);
  console.log(` FotexaGYN Frontend rodando com sucesso! `);
  console.log(` URL: http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
  console.log(` Proxy configurado para Backend: ${BACKEND}`);
  console.log(`=========================================`);
});