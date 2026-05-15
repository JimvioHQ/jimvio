
// import { Metadata } from 'next';

// const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://jimvio.com';

// interface SeoProps {
//   title?: string;
//   description?: string;
//   image?: string;
//   path?: string;
//   type?: 'website' | 'article' | 'product';
//   noIndex?: boolean;
// }

// export function constructMetadata({
//   title = "Jimvio – Global Creator-Commerce Ecosystem",
//   description = "Jimvio connects creators, buyers, communities, campaigns and suppliers in a powerful global marketplace built for scale.",
//   image = "/jimvio-og.png",
//   path = "",
//   type = 'website',
//   noIndex = false,
// }: SeoProps = {}): Metadata {
//   const url = `${siteUrl}${path}`;
//   const ogType = type === 'product' ? 'website' : type as 'website' | 'article';

//   return {
//     title: {
//       default: "Jimvio – Global Creator-Commerce Ecosystem",
//       template: `%s | Jimvio`,
//     },
//     description,
//     metadataBase: new URL(siteUrl),
//     alternates: {
//       canonical: url,
//     },

//     openGraph: {
//       title,         // 👈 dynamic, not hardcoded
//       description,   // 👈 dynamic
//       url,           // 👈 dynamic canonical URL
//       siteName: 'Jimvio',
//       images: [
//         {
//           url: image,
//           width: 1200,
//           height: 630,
//           alt: title,
//         },
//       ],
//       type: ogType,
//       locale: 'en_US',
//     },

//     twitter: {
//       card: 'summary_large_image',
//       title,         // 👈 dynamic
//       description,   // 👈 dynamic
//       images: [image],
//       creator: '@jimvio',
//       site: '@jimvio',
//     },

//     robots: noIndex
//       ? { index: false, follow: false }
//       : {
//         index: true,
//         follow: true,
//         googleBot: {
//           index: true,
//           follow: true,
//           'max-video-preview': -1,
//           'max-image-preview': 'large',
//           'max-snippet': -1,
//         },
//       },

//     icons: {
//       icon: [{ url: '/Favicon.png' }],
//       shortcut: '/Favicon.png',
//       apple: '/apple-touch-icon.png', // 👈 ideally 180×180px dedicated file
//     },

//     verification: {
//       google: "X3BENzfRf3Px2mMhw41lZgkOwJNs_BMpYSw2y_t6LO8",
//     },
//   };
// }
// lib/seo.ts

import { Metadata } from 'next';

const siteUrl =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'https://jimvio.com';

export const SITE = {
  name: 'Jimvio',
  url: siteUrl,
  logo: `${siteUrl}/logo.png`,
  ogImage: `${siteUrl}/jimvio-og.png`,
  twitter: '@jimvio',
  description: 'Jimvio connects creators, buyers, communities, campaigns and suppliers in a powerful global marketplace built for scale.',
} as const;

// ── Types ─────────────────────────────────────────────────────────────────────

interface SeoProps {
  title?: string;
  description?: string;
  image?: string;
  path?: string;
  type?: 'website' | 'article' | 'product';
  noIndex?: boolean;
}

// ── Main metadata builder ─────────────────────────────────────────────────────

export function constructMetadata({
  title = 'Jimvio – Global Creator-Commerce Ecosystem',
  description = SITE.description,
  image = SITE.ogImage,
  path = '',
  type = 'website',
  noIndex = false,
}: SeoProps = {}): Metadata {

  const canonicalUrl = `${siteUrl}${path === '/' ? '' : path}`;
  const absoluteImage = image.startsWith('http') ? image : `${siteUrl}${image}`;

  const ogType: 'website' | 'article' = type === 'article' ? 'article' : 'website';

  return {
    title: {
      default: 'Jimvio – Global Creator-Commerce Ecosystem',
      template: `%s | ${SITE.name}`,
    },
    applicationName: SITE.name,
    description,
    metadataBase: new URL(siteUrl),
    alternates: {
      canonical: canonicalUrl,
    },

    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: SITE.name,
      images: [
        {
          url: absoluteImage,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      type: ogType,
      locale: 'en_US',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [absoluteImage],
      creator: SITE.twitter,
      site: SITE.twitter,
    },
    robots: noIndex
      ? { index: false, follow: false }
      : {
        index: true,
        follow: true,
        googleBot: {
          index: true,
          follow: true,
          'max-video-preview': -1,
          'max-image-preview': 'large',
          'max-snippet': -1,
        },
      },
    icons: {
      icon: [{ url: '/Favicon.png' }],
      shortcut: '/Favicon.png',
      apple: '/apple-touch-icon.png',
    },
    verification: {
      google: 'X3BENzfRf3Px2mMhw41lZgkOwJNs_BMpYSw2y_t6LO8',
    },
  };
}