export type MarketingAsset = {
  file: string;
  title: string;
  url: string;
};

export type MarketingPostStatus = 'draft' | 'needs_review' | 'approved';

export type MarketingPostSeed = {
  id: string;
  number: string;
  platform: 'instagram';
  format: 'carousel' | 'static';
  status: MarketingPostStatus;
  scheduledDate: string;
  scheduledTime: string;
  hypothesis: string;
  metric: string;
  caption: string;
  trackingUrl: string;
  assets: MarketingAsset[];
};

export type MarketingCampaignSeed = {
  title: string;
  campaignCode: string;
  primaryUrl: string;
  postCount: number;
  language: 'English' | 'Spanish';
  driveRootUrl: string;
  strategyMemoryUrl: string;
  assetsFolderUrl: string;
  campaignsFolderUrl: string;
  posts: MarketingPostSeed[];
};

const assetBaseUrl =
  'https://raw.githubusercontent.com/rfullivarri/innerbloomv3/main/Docs/marketing/campaigns/2026-06-mvp/assets';

export const marketingCampaignSeed: MarketingCampaignSeed = {
  title: 'Innerbloom 2.0 Marketing MVP - English Test',
  campaignCode: 'ib20_mvp',
  primaryUrl: 'https://innerbloomjourney.org/',
  postCount: 20,
  language: 'English',
  driveRootUrl: 'https://drive.google.com/drive/folders/1OMs5zzPQcx9Db9RjpA7J-xL5h1b5V9cZ',
  strategyMemoryUrl: 'https://drive.google.com/file/d/1FGQPOJ1Gp0A7--yNbPDMKhgdOP89Gres/view?usp=drivesdk',
  assetsFolderUrl: 'https://drive.google.com/drive/folders/1FplCAOvdgLA9p73fA7-piQH16d0nSuEg',
  campaignsFolderUrl: 'https://drive.google.com/drive/folders/1S3J3aFgtd1np7mjBKGBpN1w5xuyuGyuH',
  posts: [
    {
      id: 'post_001',
      number: '001',
      platform: 'instagram',
      format: 'carousel',
      status: 'needs_review',
      scheduledDate: '2026-06-30',
      scheduledTime: '19:30:00',
      hypothesis:
        'People who have failed with streak-based apps will respond to adaptive rhythm and real weeks.',
      metric: 'page_view -> landing_cta_clicked -> auth_started -> auth_completed -> dashboard_view',
      trackingUrl:
        'https://innerbloomjourney.org/?utm_source=instagram&utm_medium=social&utm_campaign=ib20_mvp&utm_content=post_001&ib_post=001',
      caption: [
        'Your habits should adapt to your real life.',
        '',
        'Most habit apps assume every day is the same.',
        '',
        'Then a busy week hits, your streak breaks, and the whole plan starts feeling useless.',
        '',
        'Innerbloom is built around adaptive rhythm:',
        '',
        '- lower the intensity when life gets heavy',
        '- keep visible progress',
        '- recalibrate instead of starting over',
        '- build a Journey that can survive real weeks',
        '',
        'Early version is live.',
        '',
        'Try it here:',
        'https://innerbloomjourney.org/?utm_source=instagram&utm_medium=social&utm_campaign=ib20_mvp&utm_content=post_001&ib_post=001',
        '',
        '#habits #habitbuilding #selfimprovement #productivity #personalgrowth #wellbeing #buildinpublic',
      ].join('\n'),
      assets: [
        {
          file: 'post-001-carousel-01.png',
          title: 'Your habits should adapt to your real life.',
          url: `${assetBaseUrl}/post-001-carousel-01.png`,
        },
        {
          file: 'post-001-carousel-02.png',
          title: 'Most habit apps assume every day is the same.',
          url: `${assetBaseUrl}/post-001-carousel-02.png`,
        },
        {
          file: 'post-001-carousel-03.png',
          title: 'Lower the intensity. Keep the direction.',
          url: `${assetBaseUrl}/post-001-carousel-03.png`,
        },
        {
          file: 'post-001-carousel-04.png',
          title: 'Build a Journey that can survive real weeks.',
          url: `${assetBaseUrl}/post-001-carousel-04.png`,
        },
      ],
    },
    {
      id: 'post_002',
      number: '002',
      platform: 'instagram',
      format: 'static',
      status: 'needs_review',
      scheduledDate: '2026-07-03',
      scheduledTime: '19:30:00',
      hypothesis:
        'A direct anti-perfect-days message will perform better for people tired of rigid productivity systems.',
      metric: 'page_view, scroll depth, landing_cta_clicked, and dashboard_view',
      trackingUrl:
        'https://innerbloomjourney.org/?utm_source=instagram&utm_medium=social&utm_campaign=ib20_mvp&utm_content=post_002&ib_post=002',
      caption: [
        'If your plan only works on perfect days, it is not a plan.',
        '',
        'Most people do not fail habits because they are lazy.',
        '',
        'They fail because the system expects the same output from them every day, even when their energy, stress, sleep, and schedule change.',
        '',
        'Innerbloom is an adaptive habit app.',
        '',
        'It helps you keep direction without forcing the same rhythm all the time.',
        '',
        'Start small. Recalibrate. Keep moving.',
        '',
        'Try it here:',
        'https://innerbloomjourney.org/?utm_source=instagram&utm_medium=social&utm_campaign=ib20_mvp&utm_content=post_002&ib_post=002',
        '',
        '#habits #selfimprovement #wellbeing #productivity #mentalclarity #habittracker #buildinpublic',
      ].join('\n'),
      assets: [
        {
          file: 'post-002-static-pain-proposal.png',
          title: 'If your plan only works on perfect days, it is not a plan.',
          url: `${assetBaseUrl}/post-002-static-pain-proposal.png`,
        },
      ],
    },
  ],
};
