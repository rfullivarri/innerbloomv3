import { importPKCS8, SignJWT } from 'jose';

type ServiceAccount = {
  client_email: string;
  private_key: string;
  token_uri?: string;
};

export type DriveFile = {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  thumbnailLink?: string;
};

export function assertMarketingDriveConfigured() {
  const rawJson = String(process.env.GOOGLE_SERVICE_ACCOUNT_JSON ?? '').trim();
  const legacyBase64 = String(process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64 ?? '').trim();
  if (!rawJson && !legacyBase64) {
    throw new Error('Marketing Drive is not configured on this API service. Set GOOGLE_SERVICE_ACCOUNT_JSON_BASE64 (or GOOGLE_SERVICE_ACCOUNT_JSON) in Railway, then redeploy.');
  }
}

/** Lists only direct image children.  Folder traversal is deliberately not recursive. */
export async function listDriveFolderImages(folderId: string): Promise<DriveFile[]> {
  const token = await getAccessToken();
  const files: DriveFile[] = [];
  let pageToken = '';
  do {
    const params = new URLSearchParams({
      q: `'${folderId.replace(/'/g, "\\'")}' in parents and trashed = false and mimeType contains 'image/'`,
      fields: 'nextPageToken,files(id,name,mimeType,webViewLink,thumbnailLink)',
      orderBy: 'name_natural',
      pageSize: '100',
      supportsAllDrives: 'true',
      includeItemsFromAllDrives: 'true',
    });
    if (pageToken) params.set('pageToken', pageToken);
    const response = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`, {
      headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) throw new Error(`Google Drive folder listing failed (HTTP ${response.status})`);
    const payload = await response.json() as { files?: DriveFile[]; nextPageToken?: string };
    files.push(...(payload.files ?? []));
    pageToken = payload.nextPageToken ?? '';
  } while (pageToken);
  return files;
}

const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive';
const DRIVE_DOWNLOAD_ATTEMPTS = 3;
const DRIVE_DOWNLOAD_TIMEOUT_MS = 60_000;

export async function downloadDriveFile(fileId: string) {
  let lastError: unknown;

  for (let attempt = 1; attempt <= DRIVE_DOWNLOAD_ATTEMPTS; attempt += 1) {
    try {
      const token = await getAccessToken();
      const response = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(DRIVE_DOWNLOAD_TIMEOUT_MS),
      });

      if (!response.ok) {
        const error = new Error(`Google Drive download failed for ${fileId} (HTTP ${response.status})`);
        if (response.status < 500 && response.status !== 429) throw error;
        lastError = error;
      } else {
        return {
          bytes: Buffer.from(await response.arrayBuffer()),
          contentType: response.headers.get('content-type') ?? 'application/octet-stream',
        };
      }
    } catch (error) {
      lastError = error;
    }

    if (attempt < DRIVE_DOWNLOAD_ATTEMPTS) {
      await new Promise(resolve => setTimeout(resolve, attempt * 2_000));
    }
  }

  const reason = lastError instanceof Error ? lastError.message : String(lastError ?? 'unknown error');
  throw new Error(`Google Drive download failed for ${fileId} after ${DRIVE_DOWNLOAD_ATTEMPTS} attempts: ${reason}`);
}

export async function uploadDriveImage(input: {
  name: string;
  bytes: Buffer;
  contentType: string;
  parentFolderId: string;
}): Promise<DriveFile> {
  const token = await getAccessToken();
  const boundary = 'innerbloom-drive-upload';
  const metadata = JSON.stringify({
    name: input.name,
    parents: [input.parentFolderId],
    mimeType: input.contentType,
  });
  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n--${boundary}\r\nContent-Type: ${input.contentType}\r\n\r\n`),
    input.bytes,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);
  const response = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=id,name,mimeType,webViewLink,thumbnailLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body,
      signal: AbortSignal.timeout(60_000),
    },
  );

  if (!response.ok) {
    throw new Error(`Google Drive upload failed (HTTP ${response.status}): ${await response.text()}`);
  }

  return (await response.json()) as DriveFile;
}

async function getAccessToken() {
  const rawJson = String(process.env.GOOGLE_SERVICE_ACCOUNT_JSON ?? '').trim();
  const legacyBase64 = String(process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64 ?? '').trim();
  assertMarketingDriveConfigured();

  let serviceAccount: ServiceAccount;
  try {
    serviceAccount = JSON.parse(rawJson || Buffer.from(legacyBase64, 'base64').toString('utf8')) as ServiceAccount;
  } catch {
    throw new Error('The Google service account secret is not valid JSON.');
  }

  if (!serviceAccount.client_email || !serviceAccount.private_key) {
    throw new Error('The Google service account must include client_email and private_key.');
  }

  const now = Math.floor(Date.now() / 1000);
  const key = await importPKCS8(serviceAccount.private_key, 'RS256');
  const assertion = await new SignJWT({ scope: DRIVE_SCOPE })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuer(serviceAccount.client_email)
    .setAudience(serviceAccount.token_uri ?? 'https://oauth2.googleapis.com/token')
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(key);

  const response = await fetch(serviceAccount.token_uri ?? 'https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    throw new Error(`Google OAuth token request failed (HTTP ${response.status})`);
  }

  const payload = (await response.json()) as { access_token?: string };
  if (!payload.access_token) {
    throw new Error('Google OAuth token response did not include an access token.');
  }

  return payload.access_token;
}
