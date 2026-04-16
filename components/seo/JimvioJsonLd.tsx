import { Organization, WebSite } from "schema-dts";

const siteUrl = "https://jimvio.com";

export const JimvioJsonLd = () => {
  const organization: Organization = {
    "@type": "Organization",
    "name": "Jimvio",
    "url": siteUrl,
    "logo": `${siteUrl}/jimvio-logo.png`,
    "description": "Jimvio is a global B2B creator-commerce ecosystem specializing in cross-border trade, affiliate marketing, and digital influencer commerce.",
    "contactPoint": {
      "@type": "ContactPoint",
      "telephone": "+1-555-JIMVIO",
      "contactType": "customer service",
      "availableLanguage": ["en", "fr"]
    },
    "sameAs": [
      "https://twitter.com/jimvio",
      "https://linkedin.com/company/jimvio",
      "https://facebook.com/jimvio"
    ]
  };

  const website: WebSite = {
    "@type": "WebSite",
    "name": "Jimvio",
    "alternateName": "Jimvio",
    "url": "https://jimvio.com/"
  };

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
};
