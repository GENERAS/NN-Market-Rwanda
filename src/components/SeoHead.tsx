import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface SeoHeadProps {
  title: string;
  description: string;
  noIndex?: boolean;
}

export function SeoHead({ title, description, noIndex = false }: SeoHeadProps) {
  const location = useLocation();

  useEffect(() => {
    document.title = title;

    const descMeta = document.querySelector('meta[name="description"]');
    if (descMeta) descMeta.setAttribute('content', description);

    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', title);

    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.setAttribute('content', description);

    const canonicalUrl = `${window.location.origin}${location.pathname}`;
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', canonicalUrl);

    let robots = document.querySelector('meta[name="robots"]');
    if (!robots) {
      robots = document.createElement('meta');
      robots.setAttribute('name', 'robots');
      document.head.appendChild(robots);
    }
    robots.setAttribute('content', noIndex ? 'noindex, nofollow' : 'index, follow');
  }, [title, description, location.pathname, noIndex]);

  return null;
}
