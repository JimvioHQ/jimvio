// components/seo/StructuredData.tsx
// JSON-LD structured data — Next.js Metadata API has no field for this,
// so it must be injected as a component in the root layout's <head>.
//
// These two schemas are what signal to Google that the brand name is "Jimvio"
// and should replace the raw domain "jimvio.com" in search result display.

import { SITE } from '@/lib/seo';

const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE.name,
    url: SITE.url,
    potentialAction: {
        '@type': 'SearchAction',
        target: {
            '@type': 'EntryPoint',
            urlTemplate: `${SITE.url}/search?q={search_term_string}`,
        },
        'query-input': 'required name=search_term_string',
    },
};

const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE.name,
    url: SITE.url,
    logo: {
        '@type': 'ImageObject',
        url: SITE.logo,
        width: '200',
        height: '200',
    },
    sameAs: [
        'https://x.com/Jimvio_Official',
        'https://www.linkedin.com/company/jimvio',
        'https://www.youtube.com/@jimvio',
        'https://www.tiktok.com/@jimvio_official',
        "https://www.instagram.com/jimvio_official",
    ],
    contactPoint: {
        '@type': 'ContactPoint',
        email: 'support@jimvio.com',
    },
};

export function StructuredData() {
    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
            />
        </>
    );
}