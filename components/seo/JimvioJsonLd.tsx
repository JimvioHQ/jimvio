import { Organization, WebSite, WithContext } from "schema-dts";
import { SITE } from "@/lib/seo";

const organization: Organization = {
  "@type": "Organization",
  name: SITE.name,
  url: SITE.url,
  logo: {
    "@type": "ImageObject",
    url: `${SITE.url}/jimvio-logo.png`,
    width: "200",
    height: "200",
  },
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
  name: SITE.name,
  url: SITE.url,
  description: SITE.description,
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${SITE.url}/marketplace?q={search_term_string}`,
    },
    query: "required name=search_term_string",
  },
};

const unifiedSchema: WithContext<any> = {
  "@context": "https://schema.org",
  "@graph": [organization, website]
};

export function JimvioJsonLd() {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(unifiedSchema) }}
    />
  );
}
