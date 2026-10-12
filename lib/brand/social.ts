/** Canonical Jimvio accounts. Email templates and the public homepage use these URLs. */
export const JIMVIO_LINKEDIN_URL = "https://www.linkedin.com/company/jimvio/";
export const JIMVIO_INSTAGRAM_URL =
  "https://www.instagram.com/jimvioofficial?dlrf=MW03Y2U4aGVpc3hsMw%3D%3D&utm_source=qr";
export const JIMVIO_TIKTOK_URL = "https://www.tiktok.com/@jimvioofficial";

export const JIMVIO_SOCIAL_LINKS = [
  { name: "instagram" as const, label: "Instagram", href: JIMVIO_INSTAGRAM_URL },
  { name: "tiktok" as const, label: "TikTok", href: JIMVIO_TIKTOK_URL },
  { name: "linkedin" as const, label: "LinkedIn", href: JIMVIO_LINKEDIN_URL },
] as const;
