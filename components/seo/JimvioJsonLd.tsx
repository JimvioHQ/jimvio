import { Organization, WebSite } from "schema-dts";
import { SITE } from "@/lib/seo";

const orgId = `${SITE.url}/#organization`;
const websiteId = `${SITE.url}/#website`;

const organization: Organization = {
  "@type": "Organization",
  "@id": orgId,
  name: SITE.name,
  legalName: SITE.name,
  alternateName: ["Jimvio Marketplace", "Jimvio.com"],
  url: SITE.url,
  logo: {
    "@type": "ImageObject",
    url: `${SITE.url}/icons/icon-512.png`,
    width: "512",
    height: "512",
  },
  image: `${SITE.url}/jimvio-og.png`,
  description: SITE.description,
  contactPoint: {
    "@type": "ContactPoint",
    email: "info@jimvio.com",
    telephone: "+250 791 855 396",
    contactType: "customer service",
    availableLanguage: ["en", "fr"],
  },
  sameAs: [
    "https://x.com/Jimvio_Official",
    "https://www.linkedin.com/company/jimvio",
    "https://www.youtube.com/@jimvio",
    "https://www.tiktok.com/@jimvio_official",
    "https://www.instagram.com/jimvio_official",
  ],
};

const website: WebSite = {
  "@type": "WebSite",
  "@id": websiteId,
  name: SITE.name,
  alternateName: ["Jimvio", "Jimvio Marketplace"],
  url: SITE.url,
  description: SITE.description,
  publisher: { "@id": orgId },
  inLanguage: "en",
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${SITE.url}/marketplace?q={search_term_string}`,
    },
    query: "required name=search_term_string",
  },
};

const unifiedSchema = {
  "@context": "https://schema.org" as const,
  "@graph": [organization, website],
};

export function JimvioJsonLd() {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(unifiedSchema) }}
    />
  );
}
