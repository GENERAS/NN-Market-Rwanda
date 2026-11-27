import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface SeoHeadProps {
  title: string;
  description: string;
  noIndex?: boolean;
  structuredData?: Array<Record<string, unknown>>;
}

function setMetaTag(selector: string, attrName: 'name' | 'property', attrVal: string, content: string) {
  let el = document.querySelector(selector);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attrName, attrVal);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

export function SeoHead({ title, description, noIndex = false, structuredData = [] }: SeoHeadProps) {
  const location = useLocation();
  const structuredJson = JSON.stringify(structuredData);

  useEffect(() => {
    document.title = title;
    const origin = window.location.origin;
    const canonicalUrl = `${origin}${location.pathname}`;

    setMetaTag('meta[name="description"]', 'name', 'description', description);
    setMetaTag('meta[property="og:title"]', 'property', 'og:title', title);
    setMetaTag('meta[property="og:description"]', 'property', 'og:description', description);
    setMetaTag('meta[property="og:url"]', 'property', 'og:url', canonicalUrl);
    setMetaTag('meta[name="twitter:title"]', 'name', 'twitter:title', title);
    setMetaTag('meta[name="twitter:description"]', 'name', 'twitter:description', description);
    setMetaTag('meta[name="robots"]', 'name', 'robots', noIndex ? 'noindex, nofollow' : 'index, follow');

    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', canonicalUrl);

    const scriptId = 'nn-seo-jsonld';
    let scriptEl = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (noIndex) {
      if (scriptEl) scriptEl.remove();
      return;
    }

    const baseSchemas: Array<Record<string, unknown>> = [
      {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'NN Market Rwanda',
        alternateName: ['N Market in Rwanda', 'N Market Rwanda', 'NN Market'],
        url: origin,
        potentialAction: {
          '@type': 'SearchAction',
          target: `${origin}/products?q={search_term_string}`,
          'query-input': 'required name=search_term_string',
        },
      },
      {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'NN Market Rwanda',
        alternateName: ['N Market in Rwanda', 'N Market Rwanda', 'NN Market'],
        description:
          'Independent N-Nutrition product platform in Rwanda for easy product requests and distributor joining assistance.',
        areaServed: {
          '@type': 'Country',
          name: 'Rwanda',
        },
        url: origin,
      },
    ];

    const extraSchemas = JSON.parse(structuredJson) as Array<Record<string, unknown>>;
    const allSchemas = [...baseSchemas, ...extraSchemas];

    if (!scriptEl) {
      scriptEl = document.createElement('script');
      scriptEl.id = scriptId;
      scriptEl.type = 'application/ld+json';
      document.head.appendChild(scriptEl);
    }
    scriptEl.textContent = JSON.stringify(allSchemas);
  }, [title, description, location.pathname, noIndex, structuredJson]);

  return null;
}
