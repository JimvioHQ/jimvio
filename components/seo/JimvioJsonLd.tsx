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
