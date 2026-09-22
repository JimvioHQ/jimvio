/**
 * Curated licensed Unsplash photography mapped to Jimvio editorial categories.
 * All sourceIds are Unsplash CDN assets under the Unsplash License.
 */
import { licensedUnsplashPhoto } from "./unsplash";
import type { LicensedPhotoSpec } from "./types";

type Entry = { id: string; photographer?: string };

function pack(theme: string, entries: Entry[]): LicensedPhotoSpec[] {
  return entries.map((e) =>
    licensedUnsplashPhoto({
      sourceId: e.id,
      photographer: e.photographer,
      themes: [theme],
    })
  );
}

/** Category → licensed photos. Keys match communities.category values. */
export const CATEGORY_PHOTO_CATALOG: Record<string, LicensedPhotoSpec[]> = {
  Technology: pack("Technology", [
    { id: "photo-1518770660439-4636190af475" },
    { id: "photo-1519389950473-47ba0277781c" },
    { id: "photo-1498050108023-c8194b44aeae" },
    { id: "photo-1461749280684-dccba630e2f6" },
    { id: "photo-1486312338219-ce68d2c6f44d" },
    { id: "photo-1515879218367-8466d910aaa4" },
    { id: "photo-1555949963-aa79dcee981c" },
    { id: "photo-1581091226825-a6a2a5aee158" },
    { id: "photo-1531297484001-80022131f5a1" },
    { id: "photo-1488590528505-98d2b5aba04b" },
    { id: "photo-1526374965328-7f61d4dc18c5" },
    { id: "photo-1550751827-4bd374c3f58b" },
  ]),
  AI: pack("AI", [
    { id: "photo-1677442136019-21780ecad995" },
    { id: "photo-1620712943543-bcc4688e7485" },
    { id: "photo-1485827404703-89b55fcc595e" },
    { id: "photo-1676299080920-5e9e4e0e0f4a" },
    { id: "photo-1535378917041-10a22c95931a" },
    { id: "photo-1555255707-c079f81d9905" },
    { id: "photo-1504639725590-34d0984388bd" },
    { id: "photo-1555949963-ff9fe0c870eb" },
    { id: "photo-1589254065878-42c0da9245d2" },
    { id: "photo-1526378800651-c32d16afc4b5" },
  ]),
  Programming: pack("Programming", [
    { id: "photo-1461749280684-dccba630e2f6" },
    { id: "photo-1498050108023-c8194b44aeae" },
    { id: "photo-1515879218367-8466d910aaa4" },
    { id: "photo-1542831371-29b0f74f9713" },
    { id: "photo-1555066931-4365d14bab8c" },
    { id: "photo-1516116216624-53e697fedbea" },
    { id: "photo-1587620962725-abab7fe55159" },
    { id: "photo-1605379399642-870262d3d051" },
    { id: "photo-1618477388954-7852f7236f87" },
    { id: "photo-1571171637578-41bc2dd41cd2" },
  ]),
  Business: pack("Business", [
    { id: "photo-1454165804606-c3d57bc86b40" },
    { id: "photo-1460925895917-afdab827c52f" },
    { id: "photo-1486312338219-ce68d2c6f44d" },
    { id: "photo-1556761175-5973dc0f32e7" },
    { id: "photo-1521737604893-d14cc237f11d" },
    { id: "photo-1600880292203-757bb62b4baf" },
    { id: "photo-1553877522-43269d4ea984" },
    { id: "photo-1542744173-8e7e53415bb0" },
    { id: "photo-1573164713985-aebc6e1c2f3e" },
    { id: "photo-1664575602554-2087b04935a5" },
    { id: "photo-1552664730-d307ca884978" },
    { id: "photo-1517245386807-bb43f82c33c4" },
  ]),
  Finance: pack("Finance", [
    { id: "photo-1554224155-6726b3ff858f" },
    { id: "photo-1611974789855-9c2a0a7236a3" },
    { id: "photo-1579621970563-ebecfc0b8f4c" },
    { id: "photo-1565514020176-db0906c6f4b0" },
    { id: "photo-1633158829585-23ba8f7c8caf" },
    { id: "photo-1559526324-4b87b5e36e44" },
    { id: "photo-1642543492481-44e81e3914a7" },
    { id: "photo-1553729459-efe14ef6055d" },
  ]),
  Trading: pack("Trading", [
    { id: "photo-1611974789855-9c2a0a7236a3" },
    { id: "photo-1642543492481-44e81e3914a7" },
    { id: "photo-1590283603385-17ffb3a7f29f" },
    { id: "photo-1642790106117-e829e14a795f" },
    { id: "photo-1535320903710-d993d3d77d29" },
    { id: "photo-1551288049-bebda4e38f71" },
    { id: "photo-1563986768609-322da13575f3" },
    { id: "photo-1460925895917-afdab827c52f" },
  ]),
  Marketing: pack("Marketing", [
    { id: "photo-1432888622747-4eb9a8f2c1c5" },
    { id: "photo-1557838923-2985c318be48" },
    { id: "photo-1460925895917-afdab827c52f" },
    { id: "photo-1533750349088-cd871a87b26d" },
    { id: "photo-1552664730-d307ca884978" },
    { id: "photo-1611224923853-80b023f02d71" },
    { id: "photo-1563986768494-94bf1488c6c8" },
    { id: "photo-1557804506-669a67965ba0" },
    { id: "photo-1542744173-8e7e53415bb0" },
    { id: "photo-1504868584819-f8e8b4b67b8a" },
  ]),
  Design: pack("Design", [
    { id: "photo-1561070791-2526d30994b5" },
    { id: "photo-1586717791821-3f7f56f1d7aa" },
    { id: "photo-1558655146-d09347e92766" },
    { id: "photo-1609921213029-c9e7a3f5e0d0" },
    { id: "photo-1626785774573-4b7993145bee" },
    { id: "photo-1572044167834-846e5e6f5a05" },
    { id: "photo-1586717799252-bd134ad00e26" },
    { id: "photo-1618005182384-a83a8bd57fbe" },
    { id: "photo-1558655146-9f40138edfeb" },
    { id: "photo-1513542789411-8a32f5a0c4c7" },
  ]),
  Photography: pack("Photography", [
    { id: "photo-1452587925148-ce544e77e293" },
    { id: "photo-1492691527719-9d1e07e534b4" },
    { id: "photo-1516035069371-29a1b244cc32" },
    { id: "photo-1502920917128-1aa500764cbd" },
    { id: "photo-1554048612-b6a482bc67e5" },
    { id: "photo-1471341971476-ae15ff5dd4ea" },
    { id: "photo-1606983340126-99ab4feaa64a" },
    { id: "photo-1493863641943-9b68992a8d07" },
    { id: "photo-1542038784424-4f3f3c0a3b3e" },
    { id: "photo-1516035069371-29a1b244cc32" },
  ]),
  Gaming: pack("Gaming", [
    { id: "photo-1511512578047-dfb367046420" },
    { id: "photo-1493711662062-fa541adb3fc8" },
    { id: "photo-1542751371-adc38448a05e" },
    { id: "photo-1552820728-8b83bb6b773f" },
    { id: "photo-1538481199705-c710c4ea965a" },
    { id: "photo-1593305841991-05c297ba4585" },
    { id: "photo-1612287230202-1ff1d85d1bdf" },
    { id: "photo-1550745165-9bc0b252726f" },
  ]),
  Education: pack("Education", [
    { id: "photo-1434030216411-0b793f4b4173" },
    { id: "photo-1481627834876-b7833e8f5570" },
    { id: "photo-1503676260728-1c00da094a0b" },
    { id: "photo-1522202176988-66273c2fd55f" },
    { id: "photo-1456513080800-a5857292e0a4" },
    { id: "photo-1523240795612-9a054b0db644" },
    { id: "photo-1516321318423-f06f85e504b3" },
    { id: "photo-1497633762265-9d179a990aa6" },
    { id: "photo-1509062522246-3755977927d7" },
    { id: "photo-1580582932707-520aed937b7b" },
  ]),
  Entertainment: pack("Entertainment", [
    { id: "photo-1478720568477-152d9b164e26" },
    { id: "photo-1489599849927-2ee91cede3dd" },
    { id: "photo-1514525253161-7a46d19cd819" },
    { id: "photo-1493225457124-a3eb161ffa5f" },
    { id: "photo-1598899134739-24c46f58b8c0" },
    { id: "photo-1517604931442-7e0c8ed2963c" },
    { id: "photo-1485846234645-a62644f84728" },
    { id: "photo-1574267432553-4b4628081c31" },
  ]),
  Health: pack("Health", [
    { id: "photo-1505576399279-565b52d4ac71" },
    { id: "photo-1490645935967-10de6ba17061" },
    { id: "photo-1512621776951-a57141f2eefd" },
    { id: "photo-1544367567-0f2fcb009e0b" },
    { id: "photo-1571019613454-1cb2f99b2d8b" },
    { id: "photo-1498837164567-7067c8d8d0b5" },
    { id: "photo-1515377905703-c4788e51af15" },
    { id: "photo-1506126613408-eca07ce68773" },
  ]),
  Fitness: pack("Fitness", [
    { id: "photo-1517836357463-d25dfeac3438" },
    { id: "photo-1571019613454-1cb2f99b2d8b" },
    { id: "photo-1534438327276-14e5300c3a48" },
    { id: "photo-1518611012118-696072aa579a" },
    { id: "photo-1576678927484-cc907957088c" },
    { id: "photo-1599058945522-28d584b6f14f" },
    { id: "photo-1541534741688-6078c6bfb5c5" },
    { id: "photo-1476480862126-209bfaa8edc8" },
    { id: "photo-1552674605-db6ffd4facb5" },
    { id: "photo-1517963879433-6ad2b056d944" },
  ]),
  Sports: pack("Sports", [
    { id: "photo-1461896836934-ffe607ba6851" },
    { id: "photo-1574629810360-7efbbe195018" },
    { id: "photo-1546519638-68e109498ee8" },
    { id: "photo-1551958219-acbc608c6377" },
    { id: "photo-1579952363873-27f3bade9f55" },
    { id: "photo-1431324155629-1a6deb1dec8d" },
    { id: "photo-1517649763962-0c623066027c" },
    { id: "photo-1560272564-c83b66b1ad12" },
    { id: "photo-1521412644187-c49fa049e66d" },
    { id: "photo-1508098682722-e99c43a406b2" },
  ]),
  Music: pack("Music", [
    { id: "photo-1470225620780-dba8ba36b745" },
    { id: "photo-1511379938547-c1f69419868d" },
    { id: "photo-1493225457124-a3eb161ffa5f" },
    { id: "photo-1514525253161-7a46d19cd819" },
    { id: "photo-1511671782779-c97d3d27a1d4" },
    { id: "photo-1598488035139-bdbb2231ce04" },
    { id: "photo-1507838153414-b4b713384a76" },
    { id: "photo-1459749411177-047947b3c9d8" },
  ]),
  Faith: pack("Faith", [
    { id: "photo-1438232992991-995b7058bbb3" },
    { id: "photo-1507692049790-de58290a4334" },
    { id: "photo-1507003211169-0a1dd7228f2d" },
    { id: "photo-1519491050282-cf00c82424b4" },
    { id: "photo-1478146896981-b80fe463b330" },
    { id: "photo-1504052434569-70ad5836ab65" },
    { id: "photo-1469474968028-56623f02e42e" },
    { id: "photo-1444703686981-aafab48aba88" },
    { id: "photo-1506905925346-21bda4d32df4" },
    { id: "photo-1470252649378-9c5946542eb1" },
  ]),
  Travel: pack("Travel", [
    { id: "photo-1488646953014-85cb44e25828" },
    { id: "photo-1469854523086-cc02fe5d8800" },
    { id: "photo-1476514525535-07fb3b4ae5f1" },
    { id: "photo-1507525428034-b723cf961d3e" },
    { id: "photo-1530789253388-582c481c54b0" },
    { id: "photo-1501785888041-af3ef285b470" },
    { id: "photo-1476514525535-07fb3b4ae5f1" },
    { id: "photo-1526772662000-3f88f10405ff" },
  ]),
  Startups: pack("Startups", [
    { id: "photo-1559136555-9303baea8ebd" },
    { id: "photo-1556761175-b413da4baf72" },
    { id: "photo-1517245386807-bb43f82c33c4" },
    { id: "photo-1522071820081-009f0129c71c" },
    { id: "photo-1553877522-43269d4ea984" },
    { id: "photo-1460925895917-afdab827c52f" },
    { id: "photo-1600880292089-90a7e086ee0c" },
    { id: "photo-1531482615713-2afd69097998" },
    { id: "photo-1552664730-d307ca884978" },
    { id: "photo-1664575602554-2087b04935a5" },
  ]),
  Fashion: pack("Fashion", [
    { id: "photo-1445205170230-053b83016050" },
    { id: "photo-1483985988355-763728e1935b" },
    { id: "photo-1469334031218-e382a71b716b" },
    { id: "photo-1490481651871-ab68de25d43d" },
    { id: "photo-1558171813-4c088753af8f" },
    { id: "photo-1558769132-cb1aea458c5e" },
    { id: "photo-1441984904996-e0b241908096" },
    { id: "photo-1496747611176-843222e1e57c" },
  ]),
  Ecommerce: pack("Ecommerce", [
    { id: "photo-1441986300917-64674bd600d8" },
    { id: "photo-1472851294608-062f824d29cc" },
    { id: "photo-1556742049-0cfed4f6a45d" },
    { id: "photo-1607082349566-187342175e2f" },
    { id: "photo-1556740758-90de374c12ad" },
    { id: "photo-1563013544-824ae1b704d3" },
    { id: "photo-1607083206968-13611e3d76db" },
    { id: "photo-1556742111-a301076d9d18" },
  ]),
  Creator: pack("Creator", [
    { id: "photo-1492691527719-9d1e07e534b4" },
    { id: "photo-1516035069371-29a1b244cc32" },
    { id: "photo-1590602847861-f357a9332bbc" },
    { id: "photo-1611162616475-46b635cb6868" },
    { id: "photo-1574717024653-61fd2cf4d44d" },
    { id: "photo-1478737270239-2f02b77fc618" },
    { id: "photo-1598488035139-bdbb2231ce04" },
    { id: "photo-1516321318423-f06f85e504b3" },
    { id: "photo-1550745165-9bc0b252726f" },
    { id: "photo-1618005182384-a83a8bd57fbe" },
    { id: "photo-1589903308904-1010c2294adc" },
    { id: "photo-1493863641943-9b68992a8d07" },
  ]),
  News: pack("News", [
    { id: "photo-1495020689067-958852a7765e" },
    { id: "photo-1504711434969-e33886168f5c" },
    { id: "photo-1585829365295-ab7cd400c167" },
    { id: "photo-1457369804613-52c61a468e7d" },
    { id: "photo-1566378246598-5b11a0d486cc" },
    { id: "photo-1586339949916-3e9457ba6d3f" },
    { id: "photo-1504711434969-e33886168f5c" },
    { id: "photo-1495020689067-958852a7765e" },
  ]),
  Other: pack("Other", [
    { id: "photo-1522202176988-66273c2fd55f" },
    { id: "photo-1517245386807-bb43f82c33c4" },
    { id: "photo-1529156069898-49953e39b3ac" },
    { id: "photo-1511632765486-a01980e01a18" },
    { id: "photo-1469474968028-56623f02e42e" },
    { id: "photo-1506905925346-21bda4d32df4" },
    { id: "photo-1497366216548-37526070297c" },
    { id: "photo-1497366811353-6870744d04b2" },
  ]),
};

/** Slug/keyword overlays for communities that need more specific imagery. */
const SLUG_THEME_OVERRIDES: Array<{ match: RegExp; themes: string[]; extraIds: string[] }> = [
  {
    match: /africa|nigeria|lagos|nairobi|accra|rwanda|kigali|kenya|ghana/i,
    themes: ["Creator", "Travel", "Other"],
    extraIds: [
      "photo-1523805009345-7448845a9e53",
      "photo-1489392191049-fc10c97e64b6",
      "photo-1547471080-7cc2caa01a7e",
      "photo-1618826411640-d6df44dd3f7a",
      "photo-1484318571209-619aa0ad2d4c",
      "photo-1516026672322-bc52d61a55d5",
    ],
  },
  {
    match: /yoga|wellness|meditation/i,
    themes: ["Health", "Fitness"],
    extraIds: [
      "photo-1544367567-0f2fcb009e0b",
      "photo-1506126613408-eca07ce68773",
      "photo-1599901860904-17e6ed7083a0",
    ],
  },
  {
    match: /food|meal|cook|nutrition/i,
    themes: ["Health"],
    extraIds: [
      "photo-1490645935967-10de6ba17061",
      "photo-1512621776951-a57141f2eefd",
      "photo-1498837164567-7067c8d8d0b5",
    ],
  },
  {
    match: /robot|automat/i,
    themes: ["AI", "Technology"],
    extraIds: [
      "photo-1485827404703-89b55fcc595e",
      "photo-1535378917041-10a22c95931a",
    ],
  },
];

function dedupePhotos(photos: LicensedPhotoSpec[]): LicensedPhotoSpec[] {
  const seen = new Set<string>();
  const out: LicensedPhotoSpec[] = [];
  for (const photo of photos) {
    if (seen.has(photo.sourceId)) continue;
    seen.add(photo.sourceId);
    out.push(photo);
  }
  return out;
}

export function photosForCommunity(input: {
  category: string;
  slug: string;
  name?: string;
  description?: string | null;
}): LicensedPhotoSpec[] {
  const category = input.category?.trim() || "Other";
  const base = CATEGORY_PHOTO_CATALOG[category] ?? CATEGORY_PHOTO_CATALOG.Other ?? [];
  const extras: LicensedPhotoSpec[] = [];
  const haystack = `${input.slug} ${input.name ?? ""} ${input.description ?? ""}`;

  for (const rule of SLUG_THEME_OVERRIDES) {
    if (!rule.match.test(haystack)) continue;
    for (const theme of rule.themes) {
      extras.push(...(CATEGORY_PHOTO_CATALOG[theme] ?? []));
    }
    for (const id of rule.extraIds) {
      extras.push(
        licensedUnsplashPhoto({
          sourceId: id,
          themes: rule.themes,
        })
      );
    }
  }

  return dedupePhotos([...base, ...extras]);
}

export function listCatalogCategories(): string[] {
  return Object.keys(CATEGORY_PHOTO_CATALOG).sort();
}

export function catalogStats(): { categories: number; uniquePhotos: number } {
  const ids = new Set<string>();
  for (const photos of Object.values(CATEGORY_PHOTO_CATALOG)) {
    for (const p of photos) ids.add(p.sourceId);
  }
  return { categories: listCatalogCategories().length, uniquePhotos: ids.size };
}
