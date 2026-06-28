import { createReadStream } from 'node:fs';
import { access, stat } from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.join(__dirname, 'dist');
const port = Number(process.env.PORT || 3000);
const JSON_BODY_LIMIT_BYTES = 25 * 1024 * 1024;
const MARKETING_R2_ROUTE_PREFIX = '/api/admin/marketing/r2';

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

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Length': Buffer.byteLength(body),
    'Content-Type': 'application/json; charset=utf-8',
  });
  res.end(body);
}

function readJsonBody(req, limitBytes = JSON_BODY_LIMIT_BYTES) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let totalBytes = 0;

    req.on('data', (chunk) => {
      totalBytes += chunk.length;
      if (totalBytes > limitBytes) {
        reject(Object.assign(new Error('Payload too large'), { statusCode: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });

    req.on('end', () => {
      try {
        const text = Buffer.concat(chunks).toString('utf8');
        resolve(text ? JSON.parse(text) : {});
      } catch {
        reject(Object.assign(new Error('Invalid JSON body'), { statusCode: 400 }));
      }
    });

    req.on('error', reject);
  });
}

function normalizeBaseUrl(value) {
  const trimmed = String(value || '').trim().replace(/\/+$/, '');
  if (!trimmed) {
    return '';
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

function getApiBaseUrl() {
  return normalizeBaseUrl(process.env.VITE_API_BASE_URL || process.env.VITE_API_URL || process.env.API_BASE_URL);
}

async function verifyAdminRequest(req) {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return false;
  }

  const apiBaseUrl = getApiBaseUrl();
  if (!apiBaseUrl) {
    console.error('[marketing-r2] Missing VITE_API_BASE_URL/VITE_API_URL/API_BASE_URL for admin verification.');
    return false;
  }

  const response = await fetch(`${apiBaseUrl}/api/admin/me`, {
    headers: {
      Accept: 'application/json',
      Authorization: authorization,
    },
  });

  return response.ok;
}

function getR2Config() {
  const config = {
    accountId: String(process.env.R2_ACCOUNT_ID || '').trim(),
    accessKeyId: String(process.env.R2_ACCESS_KEY_ID || '').trim(),
    secretAccessKey: String(process.env.R2_SECRET_ACCESS_KEY || '').trim(),
    bucket: String(process.env.R2_BUCKET || '').trim(),
    publicBaseUrl: normalizeBaseUrl(process.env.R2_PUBLIC_BASE_URL),
  };

  const missing = Object.entries(config)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  return { ...config, configured: missing.length === 0, missing };
}

let r2Client;

function getR2Client(config) {
  if (!r2Client) {
    r2Client = new S3Client({
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
      forcePathStyle: true,
      region: 'auto',
    });
  }

  return r2Client;
}

function sanitizeAssetKey(value) {
  const key = String(value || '').trim().replace(/^\/+/, '');

  if (
    !key
    || key.includes('..')
    || key.length > 240
    || !/^[a-zA-Z0-9][a-zA-Z0-9._/-]*$/.test(key)
  ) {
    return null;
  }

  return key;
}

function parseBase64Asset(value) {
  const text = String(value || '').trim();
  const match = text.match(/^data:([^;,]+);base64,(.+)$/);
  const base64 = match ? match[2] : text;
  return Buffer.from(base64, 'base64');
}

async function handleMarketingR2Request(req, res, requestUrl) {
  if (requestUrl.pathname === `${MARKETING_R2_ROUTE_PREFIX}/status` && req.method === 'GET') {
    const allowed = await verifyAdminRequest(req);
    if (!allowed) {
      sendJson(res, 401, { ok: false, message: 'Unauthorized' });
      return true;
    }

    const config = getR2Config();
    sendJson(res, 200, {
      ok: true,
      configured: config.configured,
      missing: config.missing,
      bucket: config.bucket || null,
      publicBaseUrl: config.publicBaseUrl || null,
    });
    return true;
  }

  if (requestUrl.pathname === `${MARKETING_R2_ROUTE_PREFIX}/assets` && req.method === 'POST') {
    const allowed = await verifyAdminRequest(req);
    if (!allowed) {
      sendJson(res, 401, { ok: false, message: 'Unauthorized' });
      return true;
    }

    const config = getR2Config();
    if (!config.configured) {
      sendJson(res, 503, { ok: false, message: 'R2 is not configured', missing: config.missing });
      return true;
    }

    const body = await readJsonBody(req);
    const assets = Array.isArray(body?.assets) ? body.assets : [];
    if (assets.length === 0 || assets.length > 10) {
      sendJson(res, 400, { ok: false, message: 'Expected 1-10 assets.' });
      return true;
    }

    const client = getR2Client(config);
    const uploaded = [];

    for (const asset of assets) {
      const key = sanitizeAssetKey(asset?.key);
      if (!key) {
        sendJson(res, 400, { ok: false, message: `Invalid asset key: ${asset?.key ?? ''}` });
        return true;
      }

      const bytes = parseBase64Asset(asset?.contentBase64);
      if (bytes.length === 0 || bytes.length > 10 * 1024 * 1024) {
        sendJson(res, 400, { ok: false, message: `Invalid asset size for ${key}.` });
        return true;
      }

      const contentType = String(asset?.contentType || 'application/octet-stream').trim();

      await client.send(new PutObjectCommand({
        Bucket: config.bucket,
        Key: key,
        Body: bytes,
        ContentType: contentType,
        CacheControl: 'public, max-age=31536000, immutable',
      }));

      uploaded.push({
        key,
        size: bytes.length,
        url: `${config.publicBaseUrl}/${key}`,
      });
    }

    sendJson(res, 200, { ok: true, assets: uploaded });
    return true;
  }

  return false;
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
    if (requestUrl.pathname.startsWith(MARKETING_R2_ROUTE_PREFIX)) {
      const handled = await handleMarketingR2Request(req, res, requestUrl);
      if (handled) {
        return;
      }
    }

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
    const statusCode = Number(error?.statusCode || 500);
    const message = statusCode >= 500 ? 'Internal Server Error' : error.message;

    if (req.url?.startsWith(MARKETING_R2_ROUTE_PREFIX)) {
      sendJson(res, statusCode, { ok: false, message });
      return;
    }

    res.writeHead(statusCode, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(message);
    console.error(error);
  }
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Innerbloom web server listening on http://0.0.0.0:${port}`);
});
