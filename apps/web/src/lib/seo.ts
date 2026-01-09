import { useEffect } from 'react';

type MetaInput = {
  title: string;
  description: string;
  image: string;
  url?: string;
  type?: 'website' | 'article';
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

export const usePageMeta = ({ title, description, image, url, type = 'website' }: MetaInput) => {
  useEffect(() => {
    const resolvedUrl = ensureAbsoluteUrl(url ?? window.location.pathname);
    const resolvedImage = ensureAbsoluteUrl(image);

    document.title = title;
    upsertMetaTag('description', description, 'name');
    upsertMetaTag('og:title', title, 'property');
    upsertMetaTag('og:description', description, 'property');
    upsertMetaTag('og:image', resolvedImage, 'property');
    upsertMetaTag('og:url', resolvedUrl, 'property');
    upsertMetaTag('og:type', type, 'property');
    upsertMetaTag('twitter:card', 'summary_large_image', 'name');
    upsertMetaTag('twitter:title', title, 'name');
    upsertMetaTag('twitter:description', description, 'name');
    upsertMetaTag('twitter:image', resolvedImage, 'name');
    upsertCanonical(resolvedUrl);
  }, [description, image, title, type, url]);
};
