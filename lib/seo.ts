// import { Metadata } from 'next';

// const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://jimvio.com';

// interface SeoProps {
//   title?: string;
//   description?: string;
//   image?: string;
//   path?: string;
//   type?: 'website' | 'article' | 'product';
// }

// export function constructMetadata({
//   title = "Jimvio – Global Creator-Commerce Ecosystem",
//   description = "Jimvio connects creators, buyers, and suppliers in a powerful global marketplace built for scale.",
//   image = "/jimvio-og.png",
//   path = "",
//   type = 'website'
// }: SeoProps = {}): Metadata {
//   const url = `${siteUrl}${path}`;

//   return {
//     title: {
//       default: "Jimvio – Global Creator-Commerce Ecosystem",
//       template: `%s | Jimvio`
//     },
//     description,
//     metadataBase: new URL(siteUrl),
//     alternates: {
//       canonical: url,
//     },  
//     openGraph: {
//       title: "Jimvio – Global Creator-Commerce Ecosystem",
//       description: "Jimvio connects creators, buyers, communities ,campagins and suppliers in a powerful global marketplace.",
//       url: "https://jimvio.com/",
//       siteName: 'Jimvio',
//       images: [
//         {
//           url: "/jimvio-logo.png",
//           width: 1200,
//           height: 630,
//           alt: "Jimvio – Global Creator-Commerce Ecosystem",
//         },
//       ],
//       type: type === 'product' ? 'website' : type as 'website' | 'article',
//     },
//     twitter: {
//       card: 'summary_large_image',
//       title: "Jimvio – Global Creator-Commerce Ecosystem",
//       description: "Jimvio connects creators, buyers,communities ,campagins and suppliers in a powerful global marketplace.",
//       images: ["/jimvio-logo.png"],
//       creator: '@jimvio',
//     },
//     robots: {
//       index: true,
//       follow: true,
//       googleBot: {
//         index: true,
//         follow: true,
//         'max-video-preview': -1,
//         'max-image-preview': 'large',
//         'max-snippet': -1,
//       },
//     },
//     icons: {
//       icon: [
//         { url: "/Favicon.png" },
//       ],
//       shortcut: "/Favicon.png",
//       apple: "/jimvio-logo.png",
//     },
//     verification: {
//       google: "X3BENzfRf3Px2mMhw41lZgkOwJNs_BMpYSw2y_t6LO8",
//     },
//   };
// }

import { Metadata } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://jimvio.com';

interface SeoProps {
  title?: string;
  description?: string;
  image?: string;
  path?: string;
  type?: 'website' | 'article' | 'product';
  noIndex?: boolean;
}

export function constructMetadata({
  title = "Jimvio – Global Creator-Commerce Ecosystem",
  description = "Jimvio connects creators, buyers, communities, campaigns and suppliers in a powerful global marketplace built for scale.",
  image = "/jimvio-og.png",
  path = "",
  type = 'website',
  noIndex = false,
}: SeoProps = {}): Metadata {
  const url = `${siteUrl}${path}`;
  const ogType = type === 'product' ? 'website' : type as 'website' | 'article';

  return {
    title: {
      default: "Jimvio – Global Creator-Commerce Ecosystem",
      template: `%s | Jimvio`,
    },
    description,
    metadataBase: new URL(siteUrl),
    alternates: {
      canonical: url,
    },

    openGraph: {
      title,         // 👈 dynamic, not hardcoded
      description,   // 👈 dynamic
      url,           // 👈 dynamic canonical URL
      siteName: 'Jimvio',
      images: [
        {
          url: image,
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
      title,         // 👈 dynamic
      description,   // 👈 dynamic
      images: [image],
      creator: '@jimvio',
      site: '@jimvio',
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
      apple: '/apple-touch-icon.png', // 👈 ideally 180×180px dedicated file
    },

    verification: {
      google: "X3BENzfRf3Px2mMhw41lZgkOwJNs_BMpYSw2y_t6LO8",
    },
  };
}
