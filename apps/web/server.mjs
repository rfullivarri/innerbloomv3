import { createReadStream } from 'node:fs';
import { access, stat } from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.join(__dirname, 'dist');
const port = Number(process.env.PORT || 3000);

const EXACT_PAGE_ROUTES = new Map([
  ['/intro-journey', 'onboarding/index.html'],
]);

const CONTENT_TYPES = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.map', 'application/json; charset=utf-8'],
  ['.mp4', 'video/mp4'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.txt', 'text/plain; charset=utf-8'],
  ['.webmanifest', 'application/manifest+json; charset=utf-8'],
  ['.xml', 'application/xml; charset=utf-8'],
]);

function getContentType(filePath) {
  return CONTENT_TYPES.get(path.extname(filePath).toLowerCase()) || 'application/octet-stream';
}

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function resolveRequestPath(urlPath) {
  if (EXACT_PAGE_ROUTES.has(urlPath)) {
    return path.join(distDir, EXACT_PAGE_ROUTES.get(urlPath));
  }

  const normalizedPath = path.normalize(decodeURIComponent(urlPath)).replace(/^(\.\.[/\\])+/, '');
  const relativePath = normalizedPath.replace(/^[/\\]+/, '');
  const candidatePath = path.join(distDir, relativePath);

  if (await exists(candidatePath)) {
    const candidateStats = await stat(candidatePath);
    if (candidateStats.isDirectory()) {
      const directoryIndexPath = path.join(candidatePath, 'index.html');
      if (await exists(directoryIndexPath)) {
        return directoryIndexPath;
      }
    } else {
      return candidatePath;
    }
  }

  const cleanUrlIndexPath = path.join(distDir, relativePath, 'index.html');
  if (relativePath && (await exists(cleanUrlIndexPath))) {
    return cleanUrlIndexPath;
  }

  return path.join(distDir, 'index.html');
}

const server = http.createServer(async (req, res) => {
  try {
    const requestUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const filePath = await resolveRequestPath(requestUrl.pathname);
    const fileStats = await stat(filePath);

    res.writeHead(200, {
      'Content-Length': fileStats.size,
      'Content-Type': getContentType(filePath),
    });

    if (req.method === 'HEAD') {
      res.end();
      return;
    }

    createReadStream(filePath).pipe(res);
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Internal Server Error');
    console.error(error);
  }
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Innerbloom web server listening on http://0.0.0.0:${port}`);
});
