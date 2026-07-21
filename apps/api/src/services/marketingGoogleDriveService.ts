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

const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive';

export async function downloadDriveFile(fileId: string) {
  const token = await getAccessToken();
  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    throw new Error(`Google Drive download failed for ${fileId} (HTTP ${response.status})`);
  }

  return {
    bytes: Buffer.from(await response.arrayBuffer()),
    contentType: response.headers.get('content-type') ?? 'application/octet-stream',
  };
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
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,webViewLink,thumbnailLink',
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
  const raw = String(process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64 ?? '').trim();
  if (!raw) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON_BASE64 is required for the Drive staging step.');
  }

  let serviceAccount: ServiceAccount;
  try {
    serviceAccount = JSON.parse(Buffer.from(raw, 'base64').toString('utf8')) as ServiceAccount;
  } catch {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON_BASE64 is not valid base64 JSON.');
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
