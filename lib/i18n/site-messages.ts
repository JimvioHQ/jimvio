import type { SiteLocale } from "./site-locale";

/**
 * Site chrome translations (navigation, footer), keyed by the English text.
 * A missing entry falls back to English, so nothing ever renders blank.
 */
type Row = { rw: string; fr: string; sw: string };

export const SITE_MESSAGES: Record<string, Row> = {
  // Primary navigation
  Marketplace: { rw: "Isoko", fr: "Marketplace", sw: "Soko" },
  Market: { rw: "Isoko", fr: "Marché", sw: "Soko" },
  Communities: { rw: "Imiryango", fr: "Communautés", sw: "Jumuiya" },
  Commerce: { rw: "Ubucuruzi", fr: "Commerce", sw: "Biashara" },
  Affiliates: { rw: "Abamamaza", fr: "Affiliation", sw: "Washirika" },
  "UGC & Clipping": { rw: "UGC na Clipping", fr: "UGC et clipping", sw: "UGC na Clipping" },
  UGC: { rw: "UGC", fr: "UGC", sw: "UGC" },
  "Digital Market": { rw: "Isoko rya digitale", fr: "Marché numérique", sw: "Soko la kidijitali" },
  "Physical Market": { rw: "Isoko ry'ibintu bifatika", fr: "Marché physique", sw: "Soko la bidhaa halisi" },
  "Software, courses & assets": {
    rw: "Porogaramu, amasomo n'ibikoresho",
    fr: "Logiciels, cours et ressources",
    sw: "Programu, kozi na rasilimali",
  },
  "Real-world goods & equipment": {
    rw: "Ibicuruzwa n'ibikoresho bifatika",
    fr: "Produits et équipements physiques",
    sw: "Bidhaa na vifaa halisi",
  },
  // Account menu
  "My Account": { rw: "Konti yanjye", fr: "Mon compte", sw: "Akaunti yangu" },
  Messages: { rw: "Ubutumwa", fr: "Messages", sw: "Ujumbe" },
  "My Products": { rw: "Ibicuruzwa byanjye", fr: "Mes produits", sw: "Bidhaa zangu" },
  "Saved Items": { rw: "Ibyo nabitse", fr: "Favoris", sw: "Vilivyohifadhiwa" },
  "Help Center": { rw: "Ubufasha", fr: "Centre d'aide", sw: "Kituo cha msaada" },
  // Footer columns
  "Earn & Grow": { rw: "Inyungu no gukura", fr: "Gagner et grandir", sw: "Pata kipato na ukue" },
  Resources: { rw: "Ibikoresho", fr: "Ressources", sw: "Rasilimali" },
  Company: { rw: "Ikigo", fr: "Entreprise", sw: "Kampuni" },
  "Browse Products": { rw: "Reba ibicuruzwa", fr: "Parcourir les produits", sw: "Vinjari bidhaa" },
  Sellers: { rw: "Abacuruzi", fr: "Vendeurs", sw: "Wauzaji" },
  "New Arrivals": { rw: "Ibishya", fr: "Nouveautés", sw: "Bidhaa mpya" },
  "Digital Products": { rw: "Ibicuruzwa bya digitale", fr: "Produits numériques", sw: "Bidhaa za kidijitali" },
  "Buyer Protection": { rw: "Kurinda umuguzi", fr: "Protection acheteur", sw: "Ulinzi wa mnunuzi" },
  "Affiliate Program": { rw: "Gahunda y'abamamaza", fr: "Programme d'affiliation", sw: "Mpango wa washirika" },
  "Creator Monetization": { rw: "Inyungu z'abahanzi", fr: "Monétisation créateurs", sw: "Mapato ya watayarishi" },
  "Founding Creators": { rw: "Abahanzi b'ibanze", fr: "Créateurs fondateurs", sw: "Watayarishi waanzilishi" },
  "Brand Campaigns": { rw: "Campaigns z'ibigo", fr: "Campagnes de marques", sw: "Kampeni za chapa" },
  "Earnings & Payouts": { rw: "Inyungu n'ubwishyu", fr: "Gains et paiements", sw: "Mapato na malipo" },
  Guides: { rw: "Amabwiriza", fr: "Guides", sw: "Miongozo" },
  "Creator Guides": { rw: "Amabwiriza y'abahanzi", fr: "Guides créateurs", sw: "Miongozo ya watayarishi" },
  "API Docs": { rw: "Inyandiko za API", fr: "Documentation API", sw: "Nyaraka za API" },
  "Pricing & Fees": { rw: "Ibiciro n'amafaranga", fr: "Tarifs et frais", sw: "Bei na ada" },
  "About Us": { rw: "Abo turi bo", fr: "À propos", sw: "Kuhusu sisi" },
  Careers: { rw: "Akazi", fr: "Carrières", sw: "Kazi" },
  "Press & Media": { rw: "Itangazamakuru", fr: "Presse et médias", sw: "Habari na vyombo vya habari" },
  "Legal Center": { rw: "Ibijyanye n'amategeko", fr: "Centre juridique", sw: "Kituo cha kisheria" },
  Contact: { rw: "Twandikire", fr: "Contact", sw: "Wasiliana nasi" },
  Status: { rw: "Uko sisitemu ihagaze", fr: "Statut", sw: "Hali" },
  Legal: { rw: "Amategeko", fr: "Mentions légales", sw: "Kisheria" },
  Privacy: { rw: "Ibanga", fr: "Confidentialité", sw: "Faragha" },
  Terms: { rw: "Amabwiriza", fr: "Conditions", sw: "Masharti" },
  Cookies: { rw: "Cookies", fr: "Cookies", sw: "Vidakuzi" },
  "Secure Payments": { rw: "Kwishyura kwizewe", fr: "Paiements sécurisés", sw: "Malipo salama" },
  "SSL Encrypted": { rw: "Bikingiwe na SSL", fr: "Chiffré SSL", sw: "Imesimbwa kwa SSL" },
  Language: { rw: "Ururimi", fr: "Langue", sw: "Lugha" },
  "Product updates from Jimvio": {
    rw: "Amakuru mashya ya Jimvio",
    fr: "Nouveautés de Jimvio",
    sw: "Habari mpya za Jimvio",
  },
  Subscribe: { rw: "Iyandikishe", fr: "S'abonner", sw: "Jiandikishe" },
  "Marketplace, affiliate links, brand briefs, and communities — without juggling five apps.": {
    rw: "Isoko, links z'abamamaza, campaigns z'ibigo n'imiryango — byose ahantu hamwe.",
    fr: "Marketplace, liens d'affiliation, briefs de marques et communautés — sans jongler entre cinq applis.",
    sw: "Soko, viungo vya washirika, kampeni za chapa na jumuiya — bila kutumia programu tano.",
  },
};

export function siteT(locale: SiteLocale, text: string): string {
  if (locale === "en") return text;
  return SITE_MESSAGES[text]?.[locale] ?? text;
}
