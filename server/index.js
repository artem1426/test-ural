import express from 'express';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { searchParts } from './parts.js';

const app = express();
const server = createServer(app);
const host = '127.0.0.1';
const configuredPort = process.env.PORT;
app.get('/api/parts', searchParts);

if (process.argv.includes('--dev')) {
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: { middlewareMode: true, ws: { server } },
  });
  app.use(vite.middlewares);
} else {
  app.use(express.static(fileURLToPath(new URL('../dist/', import.meta.url))));
}

server.on('error', (error) => {
  if (error.code !== 'EADDRINUSE') throw error;
  if (configuredPort) {
    console.error(`Порт ${configuredPort} занят. Укажите свободный порт в PORT.`);
    process.exit(1);
  }
  server.listen(0, host);
});

server.on('listening', () => {
  console.log(`Поиск запчастей — http://${host}:${server.address().port}`);
});

server.listen(Number(configuredPort || 5173), host);
