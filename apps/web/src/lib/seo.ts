import { useEffect } from 'react';

type MetaInput = {
  title: string;
  description: string;
  image: string;
  images?: string[];
  imageAlt?: string;
  ogImageSecureUrl?: string;
  ogImageType?: string;
  ogImageWidth?: string;
  ogImageHeight?: string;
  twitterImage?: string;
  twitterImageAlt?: string;
  url?: string;
  type?: 'website' | 'article';
  siteName?: string;
};

const ensureAbsoluteUrl = (value: string) => {
  if (value.startsWith('http://') || value.startsWith('https://')) {
    return value;
  }

  return new URL(value, window.location.origin).toString();
};

const upsertMetaTag = (key: string, content: string, attr: 'name' | 'property') => {
  const existing = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (existing) {
    existing.setAttribute('content', content);
    return;
  }

  const meta = document.createElement('meta');
  meta.setAttribute(attr, key);
  meta.setAttribute('content', content);
  document.head.appendChild(meta);
};

const removeMetaTags = (key: string, attr: 'name' | 'property') => {
  const existing = document.head.querySelectorAll(`meta[${attr}="${key}"]`);
  existing.forEach((element) => element.remove());
};

const insertMetaTag = (key: string, content: string, attr: 'name' | 'property') => {
  const meta = document.createElement('meta');
  meta.setAttribute(attr, key);
  meta.setAttribute('content', content);
  document.head.appendChild(meta);
};

const upsertCanonical = (href: string) => {
  const existing = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (existing) {
    existing.href = href;
    return;
  }

  const link = document.createElement('link');
  link.rel = 'canonical';
  link.href = href;
  document.head.appendChild(link);
};

export const usePageMeta = ({
  title,
  description,
  image,
  images,
  imageAlt,
  twitterImage,
  twitterImageAlt,
  ogImageSecureUrl,
  ogImageType,
  ogImageWidth,
  ogImageHeight,
  url,
  type = 'website',
  siteName = 'Innerbloom'
}: MetaInput) => {
  useEffect(() => {
    const resolvedUrl = ensureAbsoluteUrl(url ?? window.location.pathname);
    const resolvedImage = ensureAbsoluteUrl(image);
    const resolvedImages = (images && images.length ? images : [image]).map(ensureAbsoluteUrl);
    const resolvedTwitterImage = ensureAbsoluteUrl(twitterImage ?? resolvedImage);

    document.title = title;
    upsertMetaTag('description', description, 'name');
    upsertMetaTag('og:title', title, 'property');
    upsertMetaTag('og:description', description, 'property');
    removeMetaTags('og:image', 'property');
    removeMetaTags('og:image:alt', 'property');
    resolvedImages.forEach((value) => insertMetaTag('og:image', value, 'property'));
    if (imageAlt) {
      insertMetaTag('og:image:alt', imageAlt, 'property');
    }
    if (ogImageSecureUrl) {
      upsertMetaTag('og:image:secure_url', ensureAbsoluteUrl(ogImageSecureUrl), 'property');
    }
    if (ogImageType) {
      upsertMetaTag('og:image:type', ogImageType, 'property');
    }
    if (ogImageWidth) {
      upsertMetaTag('og:image:width', ogImageWidth, 'property');
    }
    if (ogImageHeight) {
      upsertMetaTag('og:image:height', ogImageHeight, 'property');
    }
    upsertMetaTag('og:url', resolvedUrl, 'property');
    upsertMetaTag('og:type', type, 'property');
    upsertMetaTag('og:site_name', siteName, 'property');
    upsertMetaTag('twitter:card', 'summary_large_image', 'name');
    upsertMetaTag('twitter:title', title, 'name');
    upsertMetaTag('twitter:description', description, 'name');
    upsertMetaTag('twitter:image', resolvedTwitterImage, 'name');
    if (twitterImageAlt) {
      upsertMetaTag('twitter:image:alt', twitterImageAlt, 'name');
    }
    upsertCanonical(resolvedUrl);
  }, [
    description,
    image,
    imageAlt,
    images,
    ogImageHeight,
    ogImageSecureUrl,
    ogImageType,
    ogImageWidth,
    title,
    twitterImage,
    twitterImageAlt,
    type,
    url
  ]);
};
