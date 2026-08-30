/**
 * Procedural editorial personas to support real membership rows at scale.
 * ~50% African. Controlled Jimvio house identities — not customers.
 */
import type { EditorialPersonaSpec } from "./editorial-personas";
import { REALITY_PERSONAS } from "./editorial-reality-personas";

const AFRICAN_FIRST = [
  "Jean", "Aisha", "Kwesi", "Wanjiru", "Thabo", "Fatou", "Mutesi", "Chinedu", "Ama", "Brian",
  "Zanele", "Ibrahim", "Lillian", "Youssef", "Halima", "Tadesse", "Chipo", "Kofi", "Nala", "Sibusiso",
  "Imani", "Abdulahi", "Patience", "Emeka", "Amina", "Roland", "Blessing", "Ngozi", "Samuel", "Keza",
  "Omar", "Mercy", "Daniel", "Abena", "Josephine", "Farouk", "Lindiwe", "Hakim", "Sanaa", "Peter",
  "Noura", "Michael", "Grace", "Idris", "Esther", "Boubacar", "Tatenda", "Adjoa", "Kelvin", "Ruth",
  "Uwase", "Tunde", "Zola", "Kamau", "Abeba", "Sekou", "Tendai", "Yaa", "Juma", "Amara",
];
const AFRICAN_LAST = [
  "Habimana", "Okonkwo", "Mensah", "Kamau", "Dlamini", "Diallo", "Uwase", "Eze", "Serwaa", "Otieno",
  "Nkosi", "Traore", "Namukasa", "ElAmrani", "Hassan", "Bekele", "Moyo", "Asante", "Phiri", "Mthembu",
  "Ngugi", "Mohamed", "Chirwa", "Obi", "Yusuf", "Kagame", "Adeyemi", "Ike", "Boateng", "Ineza",
  "Jallow", "Atieno", "Mwangi", "Owusu", "Mutesi", "Bello", "Molefe", "Benali", "ElIdrissi", "Okello",
  "Said", "Ade", "Mutoni", "Banjo", "Wanjiku", "Sow", "Chirume", "Mensimah", "Mugisha", "Nalwoga",
];
const AFRICAN_CITIES = [
  "Kigali, Rwanda", "Lagos, Nigeria", "Accra, Ghana", "Nairobi, Kenya", "Johannesburg, South Africa",
  "Dakar, Senegal", "Kampala, Uganda", "Cairo, Egypt", "Casablanca, Morocco", "Addis Ababa, Ethiopia",
  "Dar es Salaam, Tanzania", "Cape Town, South Africa", "Lusaka, Zambia", "Harare, Zimbabwe",
  "Abuja, Nigeria", "Kumasi, Ghana", "Mombasa, Kenya", "Tunis, Tunisia", "Durban, South Africa",
];

const GLOBAL_FIRST = [
  "Elena", "James", "Mei", "Lucas", "Nora", "Hiro", "Sofia", "Ethan", "Amelia", "Raj",
  "Chloe", "Mateo", "Hannah", "Oliver", "Isla", "Diego", "Freya", "Arjun", "Camille", "Noah",
  "Lara", "William", "Anya", "Kai", "Maya", "Felix", "Ines", "Omar", "Julia", "Leo",
  "Priya", "Theo", "Ava", "Marcus", "Lina", "Harry", "Yara", "Owen", "Mila", "Sebastian",
];
const GLOBAL_LAST = [
  "Vargas", "Whitfield", "Lin", "Ferreira", "Bergman", "Tanaka", "Rossi", "Brooks", "Clark", "Patel",
  "Martin", "Alvarez", "Lee", "Schmidt", "Thompson", "Costa", "Nielsen", "Mehta", "Dubois", "Keller",
  "Santos", "Hayes", "Petrova", "Nakamura", "Chen", "Braun", "Moreau", "Khalil", "Andersson", "Shah",
  "Reed", "Ortega", "Walsh", "Haddad", "Fraser", "Novak", "Cruz", "Volkov", "Price", "Park",
];
const GLOBAL_CITIES = [
  "Madrid, Spain", "Toronto, Canada", "Singapore", "São Paulo, Brazil", "Stockholm, Sweden",
  "Tokyo, Japan", "Milan, Italy", "Austin, USA", "London, UK", "Mumbai, India", "Paris, France",
  "Berlin, Germany", "Sydney, Australia", "Lisbon, Portugal", "Seoul, South Korea", "Dubai, UAE",
  "Amsterdam, Netherlands", "New York, USA", "Mexico City, Mexico", "Dublin, Ireland",
];

const AVATARS = [
  "photo-1494790108377-be9c29b29330",
  "photo-1507003211169-0a1dd7228f2d",
  "photo-1438761681033-6461ffad8d80",
  "photo-1519085360753-af0119f7cbe7",
  "photo-1517841905240-472988babdf9",
  "photo-1506794778202-cad84cf45f1d",
  "photo-1529626455594-4ff0802cfb7e",
  "photo-1507591064344-4c6ce005b128",
  "photo-1487412720507-e7ab37603c6f",
  "photo-1463453094581-df63d5c0c3cf",
  "photo-1544005313-94ddf0286df2",
  "photo-1539571696357-5a69c17a67c6",
  "photo-1573496359142-b8d87734a5a2",
  "photo-1500648767791-00dcc994a43e",
  "photo-1524504388940-b1c17226555e",
  "photo-1472099645785-5658abf4ff4e",
  "photo-1554151228-14d9def656e4",
  "photo-1560250097-0b93528c311a",
  "photo-1488426862026-3ee34a7d66df",
  "photo-1492562080023-ab3db95bfbce",
  "photo-1534528741775-53994a69daeb",
  "photo-1580489944761-15a19d654956",
  "photo-1531746020798-e6953c6e8e04",
  "photo-1504257432389-52343af06c20",
  "photo-1506277886164-e25aa3f4ef7f",
  "photo-1519345182560-3f2917c472ef",
  "photo-1531123897727-8f129e1688ce",
];

const AFFINITY_SETS = [
  ["Technology", "Programming", "AI"],
  ["Business", "Startups", "Ecommerce"],
  ["Creator", "Marketing", "Entertainment"],
  ["Finance", "Trading", "Education"],
  ["Fitness", "Health", "Sports"],
  ["Design", "Photography", "Travel"],
  ["Faith", "Music", "Education"],
  ["Education", "Business", "Other"],
];

function avatar(id: string): string {
  return `https://images.unsplash.com/${id}?auto=format&fit=crop&w=256&h=256&q=80`;
}

function buildBatch(
  prefix: string,
  count: number,
  first: string[],
  last: string[],
  cities: string[],
  region: "africa" | "global"
): EditorialPersonaSpec[] {
  const out: EditorialPersonaSpec[] = [];
  for (let i = 0; i < count; i++) {
    const f = first[i % first.length]!;
    const l = last[Math.floor(i / first.length) % last.length]!;
    const key = `${prefix}${String(i + 1).padStart(3, "0")}`;
    const city = cities[i % cities.length]!;
    out.push({
      key,
      fullName: `${f} ${l}`,
      username: `${f.toLowerCase()}_${l.toLowerCase().replace(/[^a-z]/g, "")}${i + 1}`.slice(0, 24),
      bio: `Jimvio house contributor based in ${city}.`,
      avatarUrl: avatar(AVATARS[i % AVATARS.length]!),
      affinities: AFFINITY_SETS[i % AFFINITY_SETS.length]!,
    });
    void region;
  }
  return out;
}

/** Hand-authored reality personas + procedural expansion (~400 African + ~400 global). */
export const EXPANDED_REALITY_PERSONAS: EditorialPersonaSpec[] = [
  ...REALITY_PERSONAS,
  ...buildBatch("afx", 350, AFRICAN_FIRST, AFRICAN_LAST, AFRICAN_CITIES, "africa"),
  ...buildBatch("glx", 350, GLOBAL_FIRST, GLOBAL_LAST, GLOBAL_CITIES, "global"),
];

export function africanPersonaRatio(specs: EditorialPersonaSpec[]): number {
  const african = specs.filter(
    (p) =>
      p.key.startsWith("afr") ||
      p.key.startsWith("afx") ||
      /rwanda|nigeria|ghana|kenya|uganda|tanzania|africa|lagos|kigali|nairobi|accra|cairo|dakar|kampala|johannesburg|addis|harare|lusaka|casablanca|abidjan/i.test(
        `${p.bio} ${p.fullName}`
      )
  ).length;
  return african / Math.max(1, specs.length);
}
