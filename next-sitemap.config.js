/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://jimvio.com',
  generateRobotsTxt: true,
  sitemapSize: 7000,
  exclude: ['/dashboard/*', '/admin/*', '/api/*'],
  robotsTxtOptions: {
    policies: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/dashboard', '/admin', '/api'],
      },
    ],
    additionalSitemaps: [
      'https://jimvio.com/sitemap.xml',
    ],
  },
}
