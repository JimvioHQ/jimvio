/**
 * Expanded Jimvio house personas for world-scale editorial communities.
 * Controlled editorial identities — not independent customers.
 */

export type WorldPersonaExtra = {
  key: string;
  fullName: string;
  username: string;
  bio: string;
  avatarUrl: string;
  affinities: string[];
};

function avatar(id: string): string {
  return `https://images.unsplash.com/${id}?auto=format&fit=crop&w=256&h=256&q=80`;
}

/** Additional personas beyond the core 6 in editorial-personas.ts */
export const WORLD_PERSONA_EXTRAS: WorldPersonaExtra[] = [
  { key: "alex", fullName: "Alex Morgan", username: "alex_morgan", bio: "Product designer focused on clear interfaces.", avatarUrl: avatar("photo-1494790108377-be9c29b29330"), affinities: ["Design", "Technology", "Creator"] },
  { key: "daniel", fullName: "Daniel K.", username: "daniel_k", bio: "Software engineer shipping web platforms.", avatarUrl: avatar("photo-1506794778202-cad84cf45f1d"), affinities: ["Programming", "Technology", "AI"] },
  { key: "sarah", fullName: "Sarah N.", username: "sarah_n", bio: "Marketing specialist and growth experiments.", avatarUrl: avatar("photo-1438761681033-6461ffad8d80"), affinities: ["Marketing", "Business", "Creator"] },
  { key: "eric", fullName: "Eric M.", username: "eric_m", bio: "Startup founder working on distribution.", avatarUrl: avatar("photo-1519085360753-af0119f7cbe7"), affinities: ["Startups", "Business", "Ecommerce"] },
  { key: "chris", fullName: "Chris B.", username: "chris_b", bio: "Fitness coach focused on sustainable training.", avatarUrl: avatar("photo-1568602471122-7832951cc4c5"), affinities: ["Fitness", "Health", "Sports"] },
  { key: "nina", fullName: "Nina O.", username: "nina_o", bio: "Photographer and visual storyteller.", avatarUrl: avatar("photo-1544005313-94ddf0286df2"), affinities: ["Photography", "Design", "Travel"] },
  { key: "kwame", fullName: "Kwame A.", username: "kwame_a", bio: "Builder across West African creator scenes.", avatarUrl: avatar("photo-1504257432389-52343af06c20"), affinities: ["Creator", "Business", "Music"] },
  { key: "lea", fullName: "Lea P.", username: "lea_p", bio: "Career coach for early professionals.", avatarUrl: avatar("photo-1487412720507-e7ab37603c6f"), affinities: ["Education", "Business", "Other"] },
  { key: "omar", fullName: "Omar H.", username: "omar_h", bio: "Finance literacy educator — not personalized advice.", avatarUrl: avatar("photo-1463453094581-df63d5c0c3cf"), affinities: ["Finance", "Trading", "Education"] },
  { key: "rita", fullName: "Rita S.", username: "rita_s", bio: "Ecommerce operator and catalog craft.", avatarUrl: avatar("photo-1534528741775-53994a69daeb"), affinities: ["Ecommerce", "Business", "Marketing"] },
  { key: "ben", fullName: "Ben T.", username: "ben_t", bio: "DevOps and reliability habits.", avatarUrl: avatar("photo-1507591064344-4c6ce005b128"), affinities: ["Technology", "Programming", "AI"] },
  { key: "zoe", fullName: "Zoe L.", username: "zoe_l", bio: "Content creator and short-form editor.", avatarUrl: avatar("photo-1524504388940-b1c17226555e"), affinities: ["Creator", "Entertainment", "Marketing"] },
  { key: "ibrahim", fullName: "Ibrahim Y.", username: "ibrahim_y", bio: "Football tactics and local sports talk.", avatarUrl: avatar("photo-1492562080023-ab3db95bfbce"), affinities: ["Sports", "Fitness", "Other"] },
  { key: "claire", fullName: "Claire D.", username: "claire_d", bio: "Gospel music and thoughtful encouragement.", avatarUrl: avatar("photo-1488426862026-3ee34a7d66df"), affinities: ["Faith", "Music", "Education"] },
  { key: "hugo", fullName: "Hugo R.", username: "hugo_r", bio: "Travel planning without the brochure voice.", avatarUrl: avatar("photo-1506277886164-e25aa3f4ef7f"), affinities: ["Travel", "Photography", "Other"] },
  { key: "fatima", fullName: "Fatima Z.", username: "fatima_z", bio: "UI systems and accessibility practice.", avatarUrl: avatar("photo-1554151228-14d9def656e4"), affinities: ["Design", "Technology", "Education"] },
  { key: "joel", fullName: "Joel W.", username: "joel_w", bio: "Affiliate marketer focused on honest recommendations.", avatarUrl: avatar("photo-1496360167021-56a851459a08"), affinities: ["Marketing", "Ecommerce", "Creator"] },
  { key: "amina2", fullName: "Amina R.", username: "amina_r", bio: "Nairobi-based creator and community host.", avatarUrl: avatar("photo-1531123897727-8f129e1688ce"), affinities: ["Creator", "Business", "Entertainment"] },
  { key: "pete", fullName: "Pete G.", username: "pete_g", bio: "Gaming sessions and design curiosity.", avatarUrl: avatar("photo-1539571696357-5a69c17a67c6"), affinities: ["Gaming", "Entertainment", "Technology"] },
  { key: "helen", fullName: "Helen C.", username: "helen_c", bio: "Books, notes, and learning systems.", avatarUrl: avatar("photo-1580489944761-15a19d654956"), affinities: ["Education", "Other", "Faith"] },
  { key: "samir", fullName: "Samir K.", username: "samir_k", bio: "Cloud engineering and cost-aware architecture.", avatarUrl: avatar("photo-1507003211169-0a1dd7228f2d"), affinities: ["Technology", "Programming", "AI"] },
  { key: "yuki", fullName: "Yuki S.", username: "yuki_s", bio: "Mobile development and release discipline.", avatarUrl: avatar("photo-1548142813-c348350df52b"), affinities: ["Programming", "Technology", "Design"] },
  { key: "marco", fullName: "Marco V.", username: "marco_v", bio: "Import/export operations and trade logistics.", avatarUrl: avatar("photo-1472099645785-5658abf4ff4e"), affinities: ["Business", "Ecommerce", "Other"] },
  { key: "tessa", fullName: "Tessa J.", username: "tessa_j", bio: "Fashion merchandising and brand storytelling.", avatarUrl: avatar("photo-1529626455594-4ff0802cfb7e"), affinities: ["Fashion", "Creator", "Marketing"] },
  { key: "noah", fullName: "Noah F.", username: "noah_f", bio: "Data science for practical product questions.", avatarUrl: avatar("photo-1500648767791-00dcc994a43e"), affinities: ["AI", "Technology", "Education"] },
  { key: "priya", fullName: "Priya M.", username: "priya_m", bio: "Product management and roadmap craft.", avatarUrl: avatar("photo-1573496359142-b8d87734a5a2"), affinities: ["Technology", "Business", "Startups"] },
  { key: "lucas", fullName: "Lucas E.", username: "lucas_e", bio: "Cybersecurity habits for builders.", avatarUrl: avatar("photo-1560250097-0b93528c311a"), affinities: ["Technology", "Programming", "Other"] },
  { key: "ada", fullName: "Ada O.", username: "ada_o", bio: "Lagos operator building small teams.", avatarUrl: avatar("photo-1531746020798-e6953c6e8e04"), affinities: ["Business", "Startups", "Creator"] },
  { key: "tom", fullName: "Tom H.", username: "tom_h", bio: "Running and endurance training notes.", avatarUrl: avatar("photo-1519345182560-3f2917c472ef"), affinities: ["Fitness", "Sports", "Health"] },
  { key: "mira", fullName: "Mira Q.", username: "mira_q", bio: "Wellness routines without extremes.", avatarUrl: avatar("photo-1517841905240-472988babdf9"), affinities: ["Health", "Fitness", "Education"] },
  { key: "jon", fullName: "Jon P.", username: "jon_p", bio: "Open source maintainer habits.", avatarUrl: avatar("photo-1463453094581-df63d5c0c3cf"), affinities: ["Programming", "Technology", "Education"] },
  { key: "cara", fullName: "Cara B.", username: "cara_b", bio: "Video editing and packaging tips.", avatarUrl: avatar("photo-1524504388940-b1c17226555e"), affinities: ["Creator", "Entertainment", "Music"] },
  { key: "davi", fullName: "Davi N.", username: "davi_n", bio: "Brazilian-African diaspora creator collabs.", avatarUrl: avatar("photo-1504257432389-52343af06c20"), affinities: ["Creator", "Music", "Travel"] },
  { key: "ruth", fullName: "Ruth K.", username: "ruth_k", bio: "Bible study facilitation and reflective prompts.", avatarUrl: avatar("photo-1488426862026-3ee34a7d66df"), affinities: ["Faith", "Education", "Music"] },
  { key: "glen", fullName: "Glen S.", username: "glen_s", bio: "Sports analytics without invented scores.", avatarUrl: avatar("photo-1492562080023-ab3db95bfbce"), affinities: ["Sports", "Other", "Education"] },
  { key: "ivy", fullName: "Ivy C.", username: "ivy_c", bio: "Language learning systems.", avatarUrl: avatar("photo-1487412720507-e7ab37603c6f"), affinities: ["Education", "Travel", "Other"] },
  { key: "paul", fullName: "Paul D.", username: "paul_d", bio: "Retail operations and storefront UX.", avatarUrl: avatar("photo-1519085360753-af0119f7cbe7"), affinities: ["Ecommerce", "Business", "Marketing"] },
  { key: "nena", fullName: "Nena W.", username: "nena_w", bio: "Women in business peer counsel.", avatarUrl: avatar("photo-1534528741775-53994a69daeb"), affinities: ["Business", "Startups", "Education"] },
  { key: "kyle", fullName: "Kyle R.", username: "kyle_r", bio: "Prompt engineering with evaluation habits.", avatarUrl: avatar("photo-1506794778202-cad84cf45f1d"), affinities: ["AI", "Technology", "Programming"] },
  { key: "sofia", fullName: "Sofia L.", username: "sofia_l", bio: "Food culture and practical kitchen craft.", avatarUrl: avatar("photo-1544005313-94ddf0286df2"), affinities: ["Other", "Travel", "Health"] },
  { key: "andre", fullName: "Andre F.", username: "andre_f", bio: "Film discussion with spoilers labeled.", avatarUrl: avatar("photo-1539571696357-5a69c17a67c6"), affinities: ["Entertainment", "Creator", "Education"] },
  { key: "bianca", fullName: "Bianca M.", username: "bianca_m", bio: "Personal branding without empty hustle.", avatarUrl: avatar("photo-1529626455594-4ff0802cfb7e"), affinities: ["Creator", "Marketing", "Business"] },
  { key: "reed", fullName: "Reed A.", username: "reed_a", bio: "Leadership writing that people actually read.", avatarUrl: avatar("photo-1560250097-0b93528c311a"), affinities: ["Business", "Education", "Other"] },
  { key: "tina", fullName: "Tina V.", username: "tina_v", bio: "Student projects and internship prep.", avatarUrl: avatar("photo-1554151228-14d9def656e4"), affinities: ["Education", "Programming", "Design"] },
  { key: "caleb", fullName: "Caleb J.", username: "caleb_j", bio: "Worship music and community hosting.", avatarUrl: avatar("photo-1506277886164-e25aa3f4ef7f"), affinities: ["Faith", "Music", "Creator"] },
  { key: "hana", fullName: "Hana E.", username: "hana_e", bio: "Digital marketing measurement literacy.", avatarUrl: avatar("photo-1494790108377-be9c29b29330"), affinities: ["Marketing", "Business", "Creator"] },
  { key: "otto", fullName: "Otto K.", username: "otto_k", bio: "Hardware-adjacent makers and prototypes.", avatarUrl: avatar("photo-1507591064344-4c6ce005b128"), affinities: ["Technology", "Startups", "Education"] },
  { key: "vera", fullName: "Vera S.", username: "vera_s", bio: "Landscape photography and light practice.", avatarUrl: avatar("photo-1517841905240-472988babdf9"), affinities: ["Photography", "Travel", "Design"] },
];
