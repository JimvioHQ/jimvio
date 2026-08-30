/**
 * Large editorial persona roster for membership-realism seeding.
 * ~50% African identities; controlled Jimvio house personas (not customers).
 */
import type { EditorialPersonaSpec } from "./editorial-personas";

function avatar(id: string): string {
  const photo = id.startsWith("photo-") ? id : `photo-${id}`;
  return `https://images.unsplash.com/${photo}?auto=format&fit=crop&w=256&h=256&q=80`;
}

type Seed = {
  key: string;
  fullName: string;
  username: string;
  bio: string;
  avatar: string;
  affinities: string[];
  region: "africa" | "global";
  location: string;
};

const AFRICAN: Seed[] = [
  { key: "afr01", fullName: "Jean-Claude Habimana", username: "jc_habimana", bio: "Kigali product builder and community host.", avatar: "photo-1504257432389-52343af06c20", affinities: ["Technology", "Startups", "Business"], region: "africa", location: "Kigali, Rwanda" },
  { key: "afr02", fullName: "Aisha Okonkwo", username: "aisha_ok", bio: "Lagos creator focused on short-form craft.", avatar: "photo-1531746020798-e6953c6e8e04", affinities: ["Creator", "Marketing", "Entertainment"], region: "africa", location: "Lagos, Nigeria" },
  { key: "afr03", fullName: "Kwesi Mensah", username: "kwesi_m", bio: "Accra operator building ecommerce systems.", avatar: "photo-1506794778202-cad84cf45f1d", affinities: ["Ecommerce", "Business", "Marketing"], region: "africa", location: "Accra, Ghana" },
  { key: "afr04", fullName: "Wanjiru Kamau", username: "wanjiru_k", bio: "Nairobi designer and systems thinker.", avatar: "photo-1531123897727-8f129e1688ce", affinities: ["Design", "Technology", "Creator"], region: "africa", location: "Nairobi, Kenya" },
  { key: "afr05", fullName: "Thabo Dlamini", username: "thabo_d", bio: "Johannesburg founder working on distribution.", avatar: "photo-1519085360753-af0119f7cbe7", affinities: ["Startups", "Business", "Finance"], region: "africa", location: "Johannesburg, South Africa" },
  { key: "afr06", fullName: "Fatou Diallo", username: "fatou_d", bio: "Dakar marketer and brand storyteller.", avatar: "photo-1534528741775-53994a69daeb", affinities: ["Marketing", "Creator", "Business"], region: "africa", location: "Dakar, Senegal" },
  { key: "afr07", fullName: "Mutesi Uwase", username: "mutesi_u", bio: "Rwanda community builder and educator.", avatar: "photo-1488426862026-3ee34a7d66df", affinities: ["Education", "Creator", "Faith"], region: "africa", location: "Kigali, Rwanda" },
  { key: "afr08", fullName: "Chinedu Eze", username: "chinedu_e", bio: "Software engineer shipping web platforms.", avatar: "photo-1507003211169-0a1dd7228f2d", affinities: ["Programming", "Technology", "AI"], region: "africa", location: "Abuja, Nigeria" },
  { key: "afr09", fullName: "Ama Serwaa", username: "ama_s", bio: "Photography and visual storytelling.", avatar: "photo-1524504388940-b1c17226555e", affinities: ["Photography", "Design", "Creator"], region: "africa", location: "Kumasi, Ghana" },
  { key: "afr10", fullName: "Brian Otieno", username: "brian_o", bio: "Fintech literacy without personalized advice.", avatar: "photo-1463453094581-df63d5c0c3cf", affinities: ["Finance", "Trading", "Education"], region: "africa", location: "Nairobi, Kenya" },
  { key: "afr11", fullName: "Zanele Nkosi", username: "zanele_n", bio: "Cape Town fitness and wellness coach.", avatar: "photo-1517841905240-472988babdf9", affinities: ["Fitness", "Health", "Sports"], region: "africa", location: "Cape Town, South Africa" },
  { key: "afr12", fullName: "Ibrahim Traore", username: "ibrahim_t", bio: "Football tactics and local sports talk.", avatar: "photo-1492562080023-ab3db95bfbce", affinities: ["Sports", "Fitness", "Entertainment"], region: "africa", location: "Abidjan, Côte d'Ivoire" },
  { key: "afr13", fullName: "Lillian Namukasa", username: "lillian_n", bio: "Kampala career growth and remote work.", avatar: "photo-1573496359142-b8d87734a5a2", affinities: ["Education", "Business", "Technology"], region: "africa", location: "Kampala, Uganda" },
  { key: "afr14", fullName: "Youssef El Amrani", username: "youssef_e", bio: "Casablanca cloud and backend systems.", avatar: "photo-1500648767791-00dcc994a43e", affinities: ["Technology", "Programming", "AI"], region: "africa", location: "Casablanca, Morocco" },
  { key: "afr15", fullName: "Halima Hassan", username: "halima_h", bio: "Cairo content creator and UGC craft.", avatar: "photo-1544005313-94ddf0286df2", affinities: ["Creator", "Marketing", "Entertainment"], region: "africa", location: "Cairo, Egypt" },
  { key: "afr16", fullName: "Tadesse Bekele", username: "tadesse_b", bio: "Addis builder focused on practical AI.", avatar: "photo-1560250097-0b93528c311a", affinities: ["AI", "Technology", "Education"], region: "africa", location: "Addis Ababa, Ethiopia" },
  { key: "afr17", fullName: "Chipo Moyo", username: "chipo_m", bio: "Harare small-business operations.", avatar: "photo-1554151228-14d9def656e4", affinities: ["Business", "Ecommerce", "Education"], region: "africa", location: "Harare, Zimbabwe" },
  { key: "afr18", fullName: "Kofi Asante", username: "kofi_a", bio: "Gospel music and community hosting.", avatar: "photo-1506277886164-e25aa3f4ef7f", affinities: ["Faith", "Music", "Creator"], region: "africa", location: "Accra, Ghana" },
  { key: "afr19", fullName: "Nala Phiri", username: "nala_p", bio: "Lusaka travel and destination notes.", avatar: "photo-1487412720507-e7ab37603c6f", affinities: ["Travel", "Photography", "Creator"], region: "africa", location: "Lusaka, Zambia" },
  { key: "afr20", fullName: "Sibusiso Mthembu", username: "sibusiso_m", bio: "Durban marketplace seller habits.", avatar: "photo-1519345182560-3f2917c472ef", affinities: ["Ecommerce", "Business", "Marketing"], region: "africa", location: "Durban, South Africa" },
  { key: "afr21", fullName: "Imani Ngugi", username: "imani_n", bio: "Mombasa fashion and brand storytelling.", avatar: "photo-1529626455594-4ff0802cfb7e", affinities: ["Fashion", "Creator", "Marketing"], region: "africa", location: "Mombasa, Kenya" },
  { key: "afr22", fullName: "Abdulahi Mohamed", username: "abdulahi_m", bio: "Mogadishu-diaspora remote engineer.", avatar: "photo-1507591064344-4c6ce005b128", affinities: ["Programming", "Technology", "Education"], region: "africa", location: "Nairobi, Kenya" },
  { key: "afr23", fullName: "Patience Chirwa", username: "patience_c", bio: "Lilongwe education and student projects.", avatar: "photo-1580489944761-15a19d654956", affinities: ["Education", "Creator", "Business"], region: "africa", location: "Lilongwe, Malawi" },
  { key: "afr24", fullName: "Emeka Obi", username: "emeka_o", bio: "Enugu trader focused on process discipline.", avatar: "photo-1472099645785-5658abf4ff4e", affinities: ["Trading", "Finance", "Education"], region: "africa", location: "Enugu, Nigeria" },
  { key: "afr25", fullName: "Amina Yusuf", username: "amina_y", bio: "Dar es Salaam product marketing.", avatar: "photo-1494790108377-be9c29b29330", affinities: ["Marketing", "Business", "Startups"], region: "africa", location: "Dar es Salaam, Tanzania" },
  { key: "afr26", fullName: "Roland Kagame", username: "roland_k", bio: "Kigali AI tooling and evaluation habits.", avatar: "photo-1539571696357-5a69c17a67c6", affinities: ["AI", "Technology", "Programming"], region: "africa", location: "Kigali, Rwanda" },
  { key: "afr27", fullName: "Blessing Adeyemi", username: "blessing_a", bio: "Ibadan UGC and brand collaboration.", avatar: "photo-1438761681033-6461ffad8d80", affinities: ["Creator", "Marketing", "Ecommerce"], region: "africa", location: "Ibadan, Nigeria" },
  { key: "afr28", fullName: "Ngozi Ike", username: "ngozi_i", bio: "Leadership writing for early managers.", avatar: "photo-1531123897727-8f129e1688ce", affinities: ["Business", "Education", "Startups"], region: "africa", location: "Lagos, Nigeria" },
  { key: "afr29", fullName: "Samuel Boateng", username: "samuel_b", bio: "Kumasi sports analytics notes.", avatar: "photo-1492562080023-ab3db95bfbce", affinities: ["Sports", "Education", "Other"], region: "africa", location: "Kumasi, Ghana" },
  { key: "afr30", fullName: "Keza Ineza", username: "keza_i", bio: "Rwanda tourism and destination photography.", avatar: "photo-1517841905240-472988babdf9", affinities: ["Travel", "Photography", "Creator"], region: "africa", location: "Musanze, Rwanda" },
  { key: "afr31", fullName: "Omar Jallow", username: "omar_j", bio: "Banjul diaspora remote product work.", avatar: "photo-1507003211169-0a1dd7228f2d", affinities: ["Technology", "Business", "Startups"], region: "africa", location: "Banjul, Gambia" },
  { key: "afr32", fullName: "Mercy Atieno", username: "mercy_a", bio: "Kisumu career coaching and resumes.", avatar: "photo-1487412720507-e7ab37603c6f", affinities: ["Education", "Business", "Other"], region: "africa", location: "Kisumu, Kenya" },
  { key: "afr33", fullName: "Daniel Mwangi", username: "daniel_mw", bio: "Nairobi devops and reliability habits.", avatar: "photo-1506794778202-cad84cf45f1d", affinities: ["Technology", "Programming", "AI"], region: "africa", location: "Nairobi, Kenya" },
  { key: "afr34", fullName: "Abena Owusu", username: "abena_o", bio: "Accra faith & life conversation host.", avatar: "photo-1488426862026-3ee34a7d66df", affinities: ["Faith", "Music", "Education"], region: "africa", location: "Accra, Ghana" },
  { key: "afr35", fullName: "Josephine Mutesi", username: "josephine_m", bio: "Kampala fashion merchandising.", avatar: "photo-1524504388940-b1c17226555e", affinities: ["Fashion", "Business", "Creator"], region: "africa", location: "Kampala, Uganda" },
  { key: "afr36", fullName: "Farouk Bello", username: "farouk_b", bio: "Kano ecommerce catalog craft.", avatar: "photo-1519085360753-af0119f7cbe7", affinities: ["Ecommerce", "Marketing", "Business"], region: "africa", location: "Kano, Nigeria" },
  { key: "afr37", fullName: "Lindiwe Molefe", username: "lindiwe_m", bio: "Pretoria health & wellness educator.", avatar: "photo-1573496359142-b8d87734a5a2", affinities: ["Health", "Fitness", "Education"], region: "africa", location: "Pretoria, South Africa" },
  { key: "afr38", fullName: "Hakim Benali", username: "hakim_b", bio: "Tunis mobile development and releases.", avatar: "photo-1560250097-0b93528c311a", affinities: ["Programming", "Technology", "Design"], region: "africa", location: "Tunis, Tunisia" },
  { key: "afr39", fullName: "Sanaa El Idrissi", username: "sanaa_e", bio: "Rabat UI systems and accessibility.", avatar: "photo-1544005313-94ddf0286df2", affinities: ["Design", "Technology", "Education"], region: "africa", location: "Rabat, Morocco" },
  { key: "afr40", fullName: "Peter Okello", username: "peter_ok", bio: "Gulu agriculture innovation discussions.", avatar: "photo-1463453094581-df63d5c0c3cf", affinities: ["Business", "Education", "Other"], region: "africa", location: "Gulu, Uganda" },
  { key: "afr41", fullName: "Noura Said", username: "noura_s", bio: "Alexandria film and culture notes.", avatar: "photo-1534528741775-53994a69daeb", affinities: ["Entertainment", "Creator", "Education"], region: "africa", location: "Alexandria, Egypt" },
  { key: "afr42", fullName: "Michael Ade", username: "michael_ade", bio: "Port Harcourt oil-adjacent ops literacy.", avatar: "photo-1500648767791-00dcc994a43e", affinities: ["Business", "Operations", "Education"], region: "africa", location: "Port Harcourt, Nigeria" },
  { key: "afr43", fullName: "Grace Mutoni", username: "grace_mutoni", bio: "Kigali student projects and internships.", avatar: "photo-1554151228-14d9def656e4", affinities: ["Education", "Programming", "Design"], region: "africa", location: "Kigali, Rwanda" },
  { key: "afr44", fullName: "Idris Banjo", username: "idris_b", bio: "Ikeja music production collaboration.", avatar: "photo-1506277886164-e25aa3f4ef7f", affinities: ["Music", "Creator", "Entertainment"], region: "africa", location: "Lagos, Nigeria" },
  { key: "afr45", fullName: "Esther Wanjiku", username: "esther_w", bio: "Nakuru photography business basics.", avatar: "photo-1517841905240-472988babdf9", affinities: ["Photography", "Business", "Creator"], region: "africa", location: "Nakuru, Kenya" },
  { key: "afr46", fullName: "Boubacar Sow", username: "boubacar_s", bio: "Dakar import/export logistics talk.", avatar: "photo-1472099645785-5658abf4ff4e", affinities: ["Business", "Ecommerce", "Other"], region: "africa", location: "Dakar, Senegal" },
  { key: "afr47", fullName: "Tatenda Chirume", username: "tatenda_c", bio: "Harare startup fundraising habits.", avatar: "photo-1539571696357-5a69c17a67c6", affinities: ["Startups", "Finance", "Business"], region: "africa", location: "Harare, Zimbabwe" },
  { key: "afr48", fullName: "Adjoa Mensimah", username: "adjoa_m", bio: "Tema digital marketing measurement.", avatar: "photo-1494790108377-be9c29b29330", affinities: ["Marketing", "Business", "Creator"], region: "africa", location: "Tema, Ghana" },
  { key: "afr49", fullName: "Kelvin Mugisha", username: "kelvin_m", bio: "Kigali cybersecurity habits for builders.", avatar: "photo-1507591064344-4c6ce005b128", affinities: ["Technology", "Programming", "Education"], region: "africa", location: "Kigali, Rwanda" },
  { key: "afr50", fullName: "Ruth Nalwoga", username: "ruth_nal", bio: "Kampala women-in-tech peer counsel.", avatar: "photo-1580489944761-15a19d654956", affinities: ["Technology", "Business", "Education"], region: "africa", location: "Kampala, Uganda" },
];

const GLOBAL: Seed[] = [
  { key: "glb01", fullName: "Elena Vargas", username: "elena_v", bio: "Madrid product designer.", avatar: "photo-1494790108377-be9c29b29330", affinities: ["Design", "Technology", "Creator"], region: "global", location: "Madrid, Spain" },
  { key: "glb02", fullName: "James Whitfield", username: "james_w", bio: "Toronto software engineer.", avatar: "photo-1507003211169-0a1dd7228f2d", affinities: ["Programming", "Technology", "AI"], region: "global", location: "Toronto, Canada" },
  { key: "glb03", fullName: "Mei Lin", username: "mei_lin", bio: "Singapore growth marketer.", avatar: "photo-1438761681033-6461ffad8d80", affinities: ["Marketing", "Business", "Creator"], region: "global", location: "Singapore" },
  { key: "glb04", fullName: "Lucas Ferreira", username: "lucas_f", bio: "São Paulo startup operator.", avatar: "photo-1519085360753-af0119f7cbe7", affinities: ["Startups", "Business", "Ecommerce"], region: "global", location: "São Paulo, Brazil" },
  { key: "glb05", fullName: "Nora Bergman", username: "nora_b", bio: "Stockholm fitness coach.", avatar: "photo-1517841905240-472988babdf9", affinities: ["Fitness", "Health", "Sports"], region: "global", location: "Stockholm, Sweden" },
  { key: "glb06", fullName: "Hiro Tanaka", username: "hiro_t", bio: "Tokyo mobile developer.", avatar: "photo-1506794778202-cad84cf45f1d", affinities: ["Programming", "Technology", "Design"], region: "global", location: "Tokyo, Japan" },
  { key: "glb07", fullName: "Sofia Rossi", username: "sofia_r", bio: "Milan fashion merchandiser.", avatar: "photo-1529626455594-4ff0802cfb7e", affinities: ["Fashion", "Creator", "Marketing"], region: "global", location: "Milan, Italy" },
  { key: "glb08", fullName: "Ethan Brooks", username: "ethan_b", bio: "Austin devops engineer.", avatar: "photo-1507591064344-4c6ce005b128", affinities: ["Technology", "Programming", "AI"], region: "global", location: "Austin, USA" },
  { key: "glb09", fullName: "Amelia Clark", username: "amelia_c", bio: "London career coach.", avatar: "photo-1487412720507-e7ab37603c6f", affinities: ["Education", "Business", "Other"], region: "global", location: "London, UK" },
  { key: "glb10", fullName: "Raj Patel", username: "raj_p", bio: "Mumbai finance educator.", avatar: "photo-1463453094581-df63d5c0c3cf", affinities: ["Finance", "Trading", "Education"], region: "global", location: "Mumbai, India" },
  { key: "glb11", fullName: "Chloe Martin", username: "chloe_m", bio: "Paris photographer.", avatar: "photo-1544005313-94ddf0286df2", affinities: ["Photography", "Travel", "Design"], region: "global", location: "Paris, France" },
  { key: "glb12", fullName: "Mateo Alvarez", username: "mateo_a", bio: "Mexico City content creator.", avatar: "photo-1539571696357-5a69c17a67c6", affinities: ["Creator", "Entertainment", "Marketing"], region: "global", location: "Mexico City, Mexico" },
  { key: "glb13", fullName: "Hannah Lee", username: "hannah_l", bio: "Seoul UI systems designer.", avatar: "photo-1573496359142-b8d87734a5a2", affinities: ["Design", "Technology", "Education"], region: "global", location: "Seoul, South Korea" },
  { key: "glb14", fullName: "Oliver Schmidt", username: "oliver_s", bio: "Berlin data scientist.", avatar: "photo-1500648767791-00dcc994a43e", affinities: ["AI", "Technology", "Education"], region: "global", location: "Berlin, Germany" },
  { key: "glb15", fullName: "Isla Thompson", username: "isla_t", bio: "Sydney travel writer.", avatar: "photo-1524504388940-b1c17226555e", affinities: ["Travel", "Photography", "Creator"], region: "global", location: "Sydney, Australia" },
  { key: "glb16", fullName: "Diego Costa", username: "diego_c", bio: "Lisbon ecommerce operator.", avatar: "photo-1472099645785-5658abf4ff4e", affinities: ["Ecommerce", "Business", "Marketing"], region: "global", location: "Lisbon, Portugal" },
  { key: "glb17", fullName: "Freya Nielsen", username: "freya_n", bio: "Copenhagen wellness educator.", avatar: "photo-1554151228-14d9def656e4", affinities: ["Health", "Fitness", "Education"], region: "global", location: "Copenhagen, Denmark" },
  { key: "glb18", fullName: "Arjun Mehta", username: "arjun_m", bio: "Bangalore product manager.", avatar: "photo-1560250097-0b93528c311a", affinities: ["Technology", "Business", "Startups"], region: "global", location: "Bengaluru, India" },
  { key: "glb19", fullName: "Camille Dubois", username: "camille_d", bio: "Lyon gospel music collaborator.", avatar: "photo-1488426862026-3ee34a7d66df", affinities: ["Faith", "Music", "Creator"], region: "global", location: "Lyon, France" },
  { key: "glb20", fullName: "Noah Keller", username: "noah_k", bio: "Zurich sports analytics.", avatar: "photo-1492562080023-ab3db95bfbce", affinities: ["Sports", "Education", "Other"], region: "global", location: "Zurich, Switzerland" },
  { key: "glb21", fullName: "Lara Costa", username: "lara_c", bio: "Rio video editor.", avatar: "photo-1534528741775-53994a69daeb", affinities: ["Creator", "Entertainment", "Music"], region: "global", location: "Rio de Janeiro, Brazil" },
  { key: "glb22", fullName: "William Hayes", username: "will_h", bio: "Chicago affiliate marketer.", avatar: "photo-1496360167021-56a851459a08", affinities: ["Marketing", "Ecommerce", "Creator"], region: "global", location: "Chicago, USA" },
  { key: "glb23", fullName: "Anya Petrova", username: "anya_p", bio: "Warsaw language learning systems.", avatar: "photo-1580489944761-15a19d654956", affinities: ["Education", "Travel", "Other"], region: "global", location: "Warsaw, Poland" },
  { key: "glb24", fullName: "Kai Nakamura", username: "kai_n", bio: "Osaka open source maintainer.", avatar: "photo-1506277886164-e25aa3f4ef7f", affinities: ["Programming", "Technology", "Education"], region: "global", location: "Osaka, Japan" },
  { key: "glb25", fullName: "Maya Thompson", username: "maya_th", bio: "New York personal branding coach.", avatar: "photo-1529626455594-4ff0802cfb7e", affinities: ["Creator", "Marketing", "Business"], region: "global", location: "New York, USA" },
  { key: "glb26", fullName: "Felix Braun", username: "felix_b", bio: "Munich hardware-adjacent maker.", avatar: "photo-1507591064344-4c6ce005b128", affinities: ["Technology", "Startups", "Education"], region: "global", location: "Munich, Germany" },
  { key: "glb27", fullName: "Ines Moreau", username: "ines_m", bio: "Brussels landscape photographer.", avatar: "photo-1517841905240-472988babdf9", affinities: ["Photography", "Travel", "Design"], region: "global", location: "Brussels, Belgium" },
  { key: "glb28", fullName: "Omar Khalil", username: "omar_kh", bio: "Amman cloud architect.", avatar: "photo-1507003211169-0a1dd7228f2d", affinities: ["Technology", "Programming", "AI"], region: "global", location: "Amman, Jordan" },
  { key: "glb29", fullName: "Julia Santos", username: "julia_s", bio: "Porto food culture writer.", avatar: "photo-1544005313-94ddf0286df2", affinities: ["Other", "Travel", "Health"], region: "global", location: "Porto, Portugal" },
  { key: "glb30", fullName: "Leo Andersson", username: "leo_a", bio: "Oslo running coach.", avatar: "photo-1519345182560-3f2917c472ef", affinities: ["Fitness", "Sports", "Health"], region: "global", location: "Oslo, Norway" },
  { key: "glb31", fullName: "Priya Shah", username: "priya_s", bio: "Dubai product marketing.", avatar: "photo-1573496359142-b8d87734a5a2", affinities: ["Marketing", "Business", "Startups"], region: "global", location: "Dubai, UAE" },
  { key: "glb32", fullName: "Theo Martin", username: "theo_m", bio: "Amsterdam indie hacker.", avatar: "photo-1539571696357-5a69c17a67c6", affinities: ["Startups", "Programming", "Business"], region: "global", location: "Amsterdam, Netherlands" },
  { key: "glb33", fullName: "Ava Chen", username: "ava_chen", bio: "Hong Kong UI animator.", avatar: "photo-1494790108377-be9c29b29330", affinities: ["Design", "Creator", "Technology"], region: "global", location: "Hong Kong" },
  { key: "glb34", fullName: "Marcus Reed", username: "marcus_r", bio: "Denver cybersecurity habits.", avatar: "photo-1560250097-0b93528c311a", affinities: ["Technology", "Programming", "Other"], region: "global", location: "Denver, USA" },
  { key: "glb35", fullName: "Lina Ortega", username: "lina_o", bio: "Bogotá community manager.", avatar: "photo-1438761681033-6461ffad8d80", affinities: ["Creator", "Business", "Education"], region: "global", location: "Bogotá, Colombia" },
  { key: "glb36", fullName: "Harry Walsh", username: "harry_w", bio: "Dublin film discussion host.", avatar: "photo-1506794778202-cad84cf45f1d", affinities: ["Entertainment", "Creator", "Education"], region: "global", location: "Dublin, Ireland" },
  { key: "glb37", fullName: "Yara Haddad", username: "yara_h", bio: "Beirut digital nomad designer.", avatar: "photo-1531746020798-e6953c6e8e04", affinities: ["Design", "Travel", "Creator"], region: "global", location: "Beirut, Lebanon" },
  { key: "glb38", fullName: "Owen Fraser", username: "owen_f", bio: "Vancouver gaming sessions.", avatar: "photo-1500648767791-00dcc994a43e", affinities: ["Gaming", "Entertainment", "Technology"], region: "global", location: "Vancouver, Canada" },
  { key: "glb39", fullName: "Mila Novak", username: "mila_n", bio: "Prague books and learning systems.", avatar: "photo-1580489944761-15a19d654956", affinities: ["Education", "Other", "Faith"], region: "global", location: "Prague, Czechia" },
  { key: "glb40", fullName: "Sebastian Cruz", username: "seb_cruz", bio: "Buenos Aires retail operations.", avatar: "photo-1519085360753-af0119f7cbe7", affinities: ["Ecommerce", "Business", "Marketing"], region: "global", location: "Buenos Aires, Argentina" },
  { key: "glb41", fullName: "Nina Volkov", username: "nina_v", bio: "Helsinki prompt engineering practice.", avatar: "photo-1554151228-14d9def656e4", affinities: ["AI", "Technology", "Programming"], region: "global", location: "Helsinki, Finland" },
  { key: "glb42", fullName: "Jacob Price", username: "jacob_p", bio: "Atlanta leadership writing.", avatar: "photo-1472099645785-5658abf4ff4e", affinities: ["Business", "Education", "Other"], region: "global", location: "Atlanta, USA" },
  { key: "glb43", fullName: "Sienna Park", username: "sienna_p", bio: "Busan student project mentor.", avatar: "photo-1524504388940-b1c17226555e", affinities: ["Education", "Programming", "Design"], region: "global", location: "Busan, South Korea" },
  { key: "glb44", fullName: "Arthur Morel", username: "arthur_m", bio: "Nice worship music collaborator.", avatar: "photo-1506277886164-e25aa3f4ef7f", affinities: ["Faith", "Music", "Creator"], region: "global", location: "Nice, France" },
  { key: "glb45", fullName: "Greta Holm", username: "greta_h", bio: "Gothenburg event organizer.", avatar: "photo-1487412720507-e7ab37603c6f", affinities: ["Business", "Creator", "Other"], region: "global", location: "Gothenburg, Sweden" },
  { key: "glb46", fullName: "Victor Alves", username: "victor_a", bio: "Recife affiliate campaigns.", avatar: "photo-1496360167021-56a851459a08", affinities: ["Marketing", "Ecommerce", "Creator"], region: "global", location: "Recife, Brazil" },
  { key: "glb47", fullName: "Ivy Chen", username: "ivy_chen", bio: "Taipei illustration and critique.", avatar: "photo-1544005313-94ddf0286df2", affinities: ["Design", "Creator", "Education"], region: "global", location: "Taipei, Taiwan" },
  { key: "glb48", fullName: "Nathan Cole", username: "nathan_c", bio: "Seattle open source habits.", avatar: "photo-1463453094581-df63d5c0c3cf", affinities: ["Programming", "Technology", "Education"], region: "global", location: "Seattle, USA" },
  { key: "glb49", fullName: "Rosa Delgado", username: "rosa_d", bio: "Barcelona women in business peer counsel.", avatar: "photo-1534528741775-53994a69daeb", affinities: ["Business", "Startups", "Education"], region: "global", location: "Barcelona, Spain" },
  { key: "glb50", fullName: "Finn OConnor", username: "finn_o", bio: "Cork sports coaching notes.", avatar: "photo-1492562080023-ab3db95bfbce", affinities: ["Sports", "Fitness", "Education"], region: "global", location: "Cork, Ireland" },
];

function toSpec(s: Seed): EditorialPersonaSpec & { region: "africa" | "global"; location: string } {
  return {
    key: s.key,
    fullName: s.fullName,
    username: s.username,
    bio: `${s.bio} Based in ${s.location}.`,
    avatarUrl: avatar(s.avatar),
    affinities: s.affinities,
    region: s.region,
    location: s.location,
  };
}

export const REALITY_PERSONAS = [...AFRICAN, ...GLOBAL].map(toSpec);

export const REALITY_AFRICAN_RATIO =
  AFRICAN.length / (AFRICAN.length + GLOBAL.length);
