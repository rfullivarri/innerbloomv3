import type { MarketingPostSeed } from '../content/marketingAdminSeed';

const PICTURE_LIMIT = 10;

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

  return `${[columns, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n')}\n`;
}

export function downloadMetricoolCalendarCsv(posts: MarketingPostSeed[]) {
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
}
