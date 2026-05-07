// import { Organization, WebSite } from "schema-dts";

// const siteUrl = "https://jimvio.com";

// export const JimvioJsonLd = () => {
//   const organization: Organization = {
//     "@type": "Organization",
//     "name": "Jimvio",
//     "url": siteUrl,
//     "logo": `${siteUrl}/jimvio-logo.png`,
//     "description": "Jimvio is a global B2B creator-commerce ecosystem specializing in cross-border trade, affiliate marketing, and digital influencer commerce.",
//     "contactPoint": {
//       "@type": "ContactPoint",
//       "telephone": "+1-555-JIMVIO",
//       "contactType": "customer service",
//       "availableLanguage": ["en", "fr"]
//     },
//     "sameAs": [
//       "https://twitter.com/jimvio",
//       "https://linkedin.com/company/jimvio",
//       "https://facebook.com/jimvio"
//     ]
//   };

//   const website: WebSite = {
//     "@type": "WebSite",
//     "name": "Jimvio",
//     "alternateName": "Jimvio",
//     "url": "https://jimvio.com/"
//   };

//   return (
//     <>
//       <script
//         type="application/ld+json"
//         dangerouslySetInnerHTML={{ __html: JSON.stringify(organization) }}
//       />
//       <script
//         type="application/ld+json"
//         dangerouslySetInnerHTML={{ __html: JSON.stringify(website) }}
//       />
//     </>
//   );
// };
// components/seo/JimvioJsonLd.tsx
// Single source for all JSON-LD structured data.
// Replaces both the old JimvioJsonLd and StructuredData components —
// delete whichever one you keep less. Only this file should exist.
//
// Rendered inside <head> in app/layout.tsx (not in <body>, not on <html>).

import { Organization, WebSite, WithContext } from "schema-dts";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "https://www.jimvio.com";

const organization: WithContext<Organization> = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Jimvio",
  url: siteUrl,
  logo: {
    "@type": "ImageObject",
    url: `${siteUrl}/jimvio-logo.png`,
    width: "200",
    height: "200",
  },
  description:
    "Jimvio is a global creator-commerce ecosystem connecting creators, buyers, communities, campaigns and suppliers in a powerful marketplace built for scale.",
  contactPoint: {
    "@type": "ContactPoint",
    email: "info@jimvio.com",
    telephone: "+250 791 855 396",
    contactType: "customer service",
    availableLanguage: ["en", "fr"],
  },
  sameAs: [
    'https://x.com/Jimvio_Official',
    'https://www.linkedin.com/company/jimvio',
    'https://www.youtube.com/@jimvio',
    'https://www.tiktok.com/@jimvio_official',
    "https://www.instagram.com/jimvio_official",
  ],
};

const website: WithContext<WebSite> = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Jimvio",
  url: siteUrl,
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${siteUrl}/search?q={search_term_string}`,
    },
    // @ts-expect-error — schema-dts doesn't type query-input but Google requires it
    "query-input": "required name=search_term_string",
  },
};

export function JimvioJsonLd() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organization) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(website) }}
      />
    </>
  );
}
