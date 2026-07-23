import type { MarketingPostSeed } from '../content/marketingAdminSeed';
import { apiAuthorizedFetch } from './api';

const PICTURE_LIMIT = 10;

type MediaValidationResult = {
  url: string;
  ok: boolean;
  status: number | null;
  contentType: string | null;
  contentLength: number | null;
  reason: string | null;
};

function csvEscape(value: string | number | boolean | null | undefined) {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function buildMetricoolCalendarCsv(posts: MarketingPostSeed[]) {
  const pictureColumns = Array.from({ length: PICTURE_LIMIT }, (_, index) => `Picture Url ${index + 1}`);
  const altTextColumns = Array.from({ length: PICTURE_LIMIT }, (_, index) => `Alt text picture ${index + 1}`);
  const columns = [
    'Text',
    'Date',
    'Time',
    'Draft',
    'Facebook',
    'Twitter/X',
    'LinkedIn',
    'GBP',
    'Instagram',
    'Pinterest',
    'TikTok',
    'YouTube',
    'Threads',
    'Bluesky',
    ...pictureColumns,
    ...altTextColumns,
    'Shortener',
    'Instagram Post Type',
    'Brand name',
  ];

  const rows = posts.map((post) => {
    const row = Object.fromEntries(columns.map((column) => [column, '']));
    row.Text = post.caption;
    row.Date = post.scheduledDate;
    row.Time = post.scheduledTime;
    row.Draft = 'FALSE';
    row.Facebook = 'FALSE';
    row['Twitter/X'] = 'FALSE';
    row.LinkedIn = 'FALSE';
    row.GBP = 'FALSE';
    row.Instagram = 'TRUE';
    row.Pinterest = 'FALSE';
    row.TikTok = 'FALSE';
    row.YouTube = 'FALSE';
    row.Threads = 'FALSE';
    row.Bluesky = 'FALSE';
    row.Shortener = 'FALSE';
    row['Instagram Post Type'] = 'POST';

    post.assets.slice(0, PICTURE_LIMIT).forEach((asset, index) => {
      row[`Picture Url ${index + 1}`] = asset.url;
      row[`Alt text picture ${index + 1}`] = asset.title;
    });

    return columns.map((column) => row[column]);
  });

  return `\uFEFF${[columns, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n')}\n`;
}

export async function validateMetricoolMedia(posts: MarketingPostSeed[]) {
  const urls = [...new Set(posts.flatMap((post) => post.assets.map((asset) => asset.url.trim())).filter(Boolean))];
  if (!urls.length) {
    return { ok: false, assets: [] as MediaValidationResult[] };
  }

  const response = await apiAuthorizedFetch('/admin/marketing/r2/validate', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ urls }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Media validation failed with HTTP ${response.status}: ${body}`);
  }

  return response.json() as Promise<{ ok: boolean; assets: MediaValidationResult[] }>;
}

export async function downloadMetricoolCalendarCsv(posts: MarketingPostSeed[]) {
  try {
    const validation = await validateMetricoolMedia(posts);
    const invalid = validation.assets.filter((asset) => !asset.ok);

    if (!validation.ok || invalid.length > 0) {
      const details = invalid
        .slice(0, 8)
        .map((asset, index) => `${index + 1}. ${asset.reason || 'invalid media'} · ${asset.url}`)
        .join('\n');
      window.alert(
        `The CSV was not generated because ${invalid.length || 'some'} media URL(s) are not publicly downloadable as images.\n\n${details}\n\nUse Upload R2 again after fixing the public R2 configuration, then retry CSV.`,
      );
      return false;
    }

    const csv = buildMetricoolCalendarCsv(posts);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'metricool-calendar-import.csv';
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    return true;
  } catch (error) {
    window.alert(error instanceof Error ? error.message : 'Unable to validate media before CSV export.');
    return false;
  }
}
