// "use client";

// import { useState } from "react";
// import { ArrowRight, Check, GlobeIcon, ShieldIcon, X } from "lucide-react";
// import {
//     ShoppingCart,
//     Link2,
//     Clapperboard,
//     Users,
//     BarChart2,
//     Banknote,
// } from "lucide-react";
// import { HeroBlobBackground } from "./ui/HeroBlobBackground";
// import { CtaSection } from "./sections/CtaSection";

// // ─── Types ────────────────────────────────────────────────────────────────────

// interface FeatureItem {
//     icon: React.ReactNode;
//     title: string;
//     description: string;
// }
// interface StepItem {
//     number: string;
//     title: string;
//     description: string;
// }
// interface WhyItem {
//     title: string;
//     body: string;
// }
// interface TableRow {
//     col1: string;
//     col2: string;
//     col3: string;
// }
// interface RightCard {
//     title: string;
//     description: string;
// }
// interface CookieCard {
//     name: string;
//     required: boolean;
//     description: string;
//     duration: string;
// }

// type ListVariant = "dash" | "check" | "cross";
// type PageId = "about" | "privacy" | "terms" | "cookies";

// // ─── Data ─────────────────────────────────────────────────────────────────────

// const STATS = [
//     { num: "10k", suffix: "+", label: "Active Creators" },
//     { num: "$1M", suffix: "+", label: "Paid to Creators" },
//     { num: "50", suffix: "+", label: "Countries Served" },
//     { num: "99.9", suffix: "%", label: "Platform Uptime" },
// ];

// const FEATURES: FeatureItem[] = [
//     {
//         icon: <ShoppingCart size={20} strokeWidth={1.6} />,
//         title: "Global Marketplace",
//         description:
//             "Buy and sell physical and digital products worldwide. Integrated payment processing with verified vendor badges builds trust at scale.",
//     },
//     {
//         icon: <Link2 size={20} strokeWidth={1.6} />,
//         title: "Affiliate System",
//         description:
//             "Promote any Jimvio product and earn commissions up to 50%. Real-time dashboard, transparent payout history — no inventory required.",
//     },
//     {
//         icon: <Clapperboard size={20} strokeWidth={1.6} />,
//         title: "UGC & Clipping Campaigns",
//         description:
//             "Brands launch campaigns daily. Submit short-form content and earn per approval or per 1,000 verified views. No followers needed.",
//     },
//     {
//         icon: <Users size={20} strokeWidth={1.6} />,
//         title: "Niche Communities",
//         description:
//             "Spaces for buyers, sellers, and creators to network, share insights, and unlock exclusive group deals that benefit everyone.",
//     },
//     {
//         icon: <BarChart2 size={20} strokeWidth={1.6} />,
//         title: "Analytics Dashboard",
//         description:
//             "Complete performance analytics — earnings, click-through rates, campaign metrics, and affiliate conversions tracked live.",
//     },
//     {
//         icon: <Banknote size={20} strokeWidth={1.6} />,
//         title: "Secure Global Payouts",
//         description:
//             "Withdraw via Stripe, PayPal, bank transfer, or mobile money. Built for Africa, Southeast Asia, and beyond. 50+ countries.",
//     },
// ];

// const STEPS: StepItem[] = [
//     {
//         number: "01",
//         title: "Join Jimvio",
//         description:
//             "Create your free account in under 60 seconds. No credit card required. No hidden fees.",
//     },
//     {
//         number: "02",
//         title: "Pick Your Path",
//         description:
//             "Browse marketplace products to promote, or explore live brand campaigns tailored to your niche.",
//     },
//     {
//         number: "03",
//         title: "Promote or Create",
//         description:
//             "Share your unique affiliate link, or film and submit UGC content from any device — your phone is enough.",
//     },
//     {
//         number: "04",
//         title: "Earn & Withdraw",
//         description:
//             "Track earnings in real-time. Withdraw to your preferred payment method once you hit the $20 minimum.",
//     },
// ];

// const WHY_ITEMS: WhyItem[] = [
//     {
//         title: "All-in-one login.",
//         body: "Marketplace, affiliate, campaigns, and communities — no switching between apps or dashboards.",
//     },
//     {
//         title: "No followers required.",
//         body: "Anyone can join a campaign and get paid from day one. Your phone is your studio.",
//     },
//     {
//         title: "Global payouts.",
//         body: "Mobile money for Africa and Southeast Asia. Stripe, PayPal, and bank transfer everywhere else.",
//     },
//     {
//         title: "Real-time tracking.",
//         body: "Every click, sale, and view tracked live with full transparency. No black-box commission systems.",
//     },
//     {
//         title: "Free to start.",
//         body: "Zero setup fees, no credit card, no hidden subscription costs. Jimvio earns when you earn.",
//     },
//     {
//         title: "Verified trust.",
//         body: "Verified vendors and creators at every layer. Brand campaigns launching daily across all niches.",
//     },
// ];

// const DATA_COLLECTION_ROWS: TableRow[] = [
//     { col1: "Account Data", col2: "Name, email, username, password", col3: "Authentication" },
//     { col1: "Profile Data", col2: "Bio, photo, country, social handles", col3: "Public creator profile" },
//     { col1: "Financial Data", col2: "Payout details, transaction history", col3: "Payments & payouts" },
//     { col1: "Usage Data", col2: "Pages visited, clicks, session duration", col3: "Analytics & improvement" },
//     { col1: "Content Data", col2: "Posts, campaign submissions, listings", col3: "Platform functionality" },
//     { col1: "Support Data", col2: "Tickets, messages, feedback", col3: "Customer support" },
// ];

// const DATA_SHARING_ROWS: TableRow[] = [
//     { col1: "Payment Processors", col2: "Execute transactions and payouts", col3: "Financial data only" },
//     { col1: "Analytics Providers", col2: "Understand platform usage", col3: "Anonymized usage data" },
//     { col1: "Cloud Infrastructure", col2: "Host platform data securely", col3: "Encrypted storage" },
//     { col1: "Legal Authorities", col2: "Comply with lawful requests", col3: "As required by law" },
// ];

// const PRIVACY_RIGHTS: RightCard[] = [
//     { title: "Right to Access", description: "Request a complete copy of all personal data we hold about you." },
//     { title: "Right to Rectification", description: "Correct any inaccurate or incomplete information in your profile." },
//     { title: "Right to Erasure", description: "Request full deletion of your account and all associated data." },
//     { title: "Right to Portability", description: "Export your data in a machine-readable format (JSON/CSV) anytime." },
//     { title: "Right to Object", description: "Opt out of marketing or non-essential data processing instantly." },
//     { title: "Right to Restrict", description: "Limit how we use your data during disputes or active verification." },
// ];

// const PRIVACY_USE_ITEMS = [
//     "Create and manage your account and platform access.",
//     "Process transactions, calculate commissions, and execute payouts reliably.",
//     "Verify creator and seller identity and prevent fraud and abuse.",
//     "Display relevant products, campaigns, and community recommendations.",
//     "Send transactional emails: account activity alerts, payout confirmations.",
//     "Send marketing communications — only with your explicit consent.",
//     "Analyze platform performance and continuously improve user experience.",
//     "Comply with legal obligations and respond to lawful law enforcement requests.",
// ];

// const SECURITY_ITEMS = [
//     "All data transmitted via TLS/SSL encryption — never in plaintext.",
//     "Passwords hashed with industry-standard bcrypt/Argon2 algorithms.",
//     "Payment details tokenized — never stored in plaintext on our systems.",
//     "Ongoing security audits and penetration testing by independent specialists.",
//     "Personal data accessible only to authorized personnel on a need-to-know basis.",
//     "Dedicated breach response team with documented incident response protocol.",
// ];

// const PROHIBITED_ITEMS = [
//     "Engaging in scams, fraud, deceptive practices, or any form of financial dishonesty.",
//     "Sending spam, unsolicited messages, or mass promotional communications.",
//     "Generating fake traffic, artificial clicks, bot activity, or fraudulent conversions.",
//     "Creating misleading promotions, fabricated earnings screenshots, or false income claims.",
//     "Infringing on intellectual property rights of any third party.",
//     "Selling counterfeit, illegal, stolen, or prohibited products on the marketplace.",
//     "Impersonating any person, brand, celebrity, or Jimvio representative.",
//     "Attempting to hack, reverse-engineer, scrape, or disrupt the platform.",
//     "Using the platform to facilitate money laundering or illegal financial activity.",
//     "Posting hate speech, discriminatory content, or content that promotes violence.",
//     "Sharing adult content, explicit material, or any content involving minors.",
//     "Engaging in harassment, bullying, or targeted abuse of any community member.",
// ];

// const COOKIE_CARDS: CookieCard[] = [
//     {
//         name: "Session Cookies",
//         required: true,
//         description:
//             "Maintain your login state while you navigate the platform. Essential for security and core functionality.",
//         duration: "Session end · Cannot be disabled",
//     },
//     {
//         name: "Security Cookies",
//         required: true,
//         description:
//             "Real-time fraud detection and account protection. Essential to keeping your account safe.",
//         duration: "Session end · Cannot be disabled",
//     },
//     {
//         name: "Preference Cookies",
//         required: false,
//         description:
//             "Remember your display settings, language preferences, and other platform customizations.",
//         duration: "1 year · Can be disabled in settings",
//     },
//     {
//         name: "Analytics (1st party)",
//         required: false,
//         description:
//             "Help us understand how creators and sellers use Jimvio so we can improve features over time.",
//         duration: "2 years · Can be disabled",
//     },
//     {
//         name: "Analytics (3rd party)",
//         required: false,
//         description:
//             "External traffic analysis tools that help us understand where visitors come from and how they interact.",
//         duration: "2 years · Can be disabled",
//     },
//     {
//         name: "Marketing Cookies",
//         required: false,
//         description:
//             "Enable personalized promotions and relevant campaign recommendations. Only set with your explicit consent.",
//         duration: "90 days · Consent required",
//     },
// ];

// // ─── Shared Components ────────────────────────────────────────────────────────



// function SectionHeading({ children }: { children: React.ReactNode }) {
//     return (
//         <h2 className="text-[clamp(30px,4vw,48px)] font-black tracking-[-0.035em] leading-[1.08] text-[var(--color-text-primary)] mb-5">
//             {children}
//         </h2>
//     );
// }

// function DataTable({ headers, rows }: { headers: string[]; rows: TableRow[] }) {
//     return (
//         <div className="border border-[var(--color-border)] rounded-[var(--radius-lg)] overflow-hidden mt-5 bg-[var(--color-surface)]">
//             <table className="w-full border-collapse text-sm">
//                 <thead>
//                     <tr className="border-b border-[var(--color-border)]">
//                         {headers.map((h) => (
//                             <th
//                                 key={h}
//                                 className="text-left px-4 py-2.5 home-section-eyebrow text-[var(--color-text-muted)]"
//                             >
//                                 {h}
//                             </th>
//                         ))}
//                     </tr>
//                 </thead>
//                 <tbody>
//                     {rows.map((row, i) => (
//                         <tr
//                             key={i}
//                             className={i < rows.length - 1 ? "border-b border-[var(--color-border)]" : ""}
//                         >
//                             <td className="px-4 py-3.5 font-medium text-[var(--color-text-primary)] leading-snug">
//                                 {row.col1}
//                             </td>
//                             <td className="px-4 py-3.5 font-light text-[var(--color-text-secondary)] leading-snug">
//                                 {row.col2}
//                             </td>
//                             <td className="px-4 py-3.5 font-light text-[var(--color-text-secondary)] leading-snug">
//                                 {row.col3}
//                             </td>
//                         </tr>
//                     ))}
//                 </tbody>
//             </table>
//         </div>
//     );
// }

// const VARIANT_STYLES: Record<ListVariant, { char: string; className: string }> = {
//     dash: { char: "—", className: "text-[var(--color-accent)]" },
//     check: { char: "✓", className: "text-[var(--color-success)]" },
//     cross: { char: "✗", className: "text-[var(--color-danger)]" },
// };

// function LegalList({
//     items,
//     variant = "dash",
// }: {
//     items: string[];
//     variant?: ListVariant;
// }) {
//     const { char, className } = VARIANT_STYLES[variant];
//     return (
//         <ul className="flex flex-col gap-2.5 mt-2 list-none">
//             {items.map((item, i) => (
//                 <li
//                     key={i}
//                     className="flex items-start gap-3 text-sm text-[var(--color-text-secondary)] leading-relaxed font-light"
//                 >
//                     <span className={`${className} flex-shrink-0 mt-0.5`}>{char}</span>
//                     {item}
//                 </li>
//             ))}
//         </ul>
//     );
// }

// function HighlightBox({ children }: { children: React.ReactNode }) {
//     return (
//         <div className="mt-5 rounded-[var(--radius-md)] border border-[var(--color-accent)]/20 bg-[var(--color-accent-light)] px-6 py-5 text-sm text-[var(--color-accent)] leading-relaxed font-light">
//             {children}
//         </div>
//     );
// }

// function SectionBlock({ title, children }: { title: string; children: React.ReactNode }) {
//     return (
//         <div className="mb-14">
//             <h3 className="text-xl font-bold tracking-tight text-[var(--color-text-primary)] mb-5 pb-3.5 border-b border-[var(--color-border)]">
//                 {title}
//             </h3>
//             {children}
//         </div>
//     );
// }

// function LegalMeta({ tags }: { tags: Array<{ label: string; green?: boolean }> }) {
//     return (
//         <div className="flex items-center gap-2.5 flex-wrap">
//             {tags.map((tag) => (
//                 <span
//                     key={tag.label}
//                     className={`inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] px-3 py-1.5 text-xs font-medium border
//             ${tag.green
//                             ? "bg-[var(--color-success-light)] border-[var(--color-success)]/25 text-[var(--color-success)]"
//                             : "bg-[var(--color-surface-secondary)] border-[var(--color-border)] text-[var(--color-text-secondary)]"
//                         }`}
//                 >
//                     {tag.label}
//                 </span>
//             ))}
//         </div>
//     );
// }

// function LegalHero({
//     eyebrow,
//     titleLine1,
//     titleLine2,
//     tags,
// }: {
//     eyebrow: string;
//     titleLine1: string;
//     titleLine2: string;
//     tags: Array<{ label: string; green?: boolean }>;
// }) {
//     return (
//         <div className="pb-14 border-b border-[var(--color-border)] mb-14">
//             <Eyebrow>{eyebrow}</Eyebrow>
//             <h1 className="text-[clamp(32px,5vw,52px)] font-black tracking-[-0.04em] leading-none text-[var(--color-text-primary)] mb-6">
//                 {titleLine1}
//                 <br />
//                 <span className="text-[var(--color-accent)]">{titleLine2}</span>
//             </h1>
//             <LegalMeta tags={tags} />
//         </div>
//     );
// }



// const VALUEsS = [
//     {
//         title: "Creator-first",
//         body: "Every product decision starts with one question: does this help creators earn more?",
//         icon: (
//             <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
//                 <circle cx="10" cy="10" r="8" stroke="#fd5000" strokeWidth="1.5" />
//                 <path d="M7 10l2 2 4-4" stroke="#fd5000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
//             </svg>
//         ),
//     },
//     {
//         title: "Radical transparency",
//         body: "No hidden fees. No opaque policies. We publish our fee structure and changelog publicly.",
//         icon: (
//             <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
//                 <path d="M10 2l2 6h6l-5 3.5 2 6L10 14l-5 3.5 2-6L2 8h6z" stroke="#fd5000" strokeWidth="1.5" strokeLinejoin="round" />
//             </svg>
//         ),
//     },
//     {
//         title: "Borderless by default",
//         body: "Geography is not a reason to be excluded. We build for every creator, everywhere.",
//         icon: (
//             <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
//                 <path d="M10 2C5.6 2 2 5.6 2 10s3.6 8 8 8 8-3.6 8-8-3.6-8-8-8z" stroke="#fd5000" strokeWidth="1.5" />
//                 <path d="M2 10h16M10 2c-2 3-3 5-3 8s1 5 3 8M10 2c2 3 3 5 3 8s-1 5-3 8" stroke="#fd5000" strokeWidth="1.5" />
//             </svg>
//         ),
//     },
// ];


// // ─── Sub-components ───────────────────────────────────────────────────────────

// function Eyebrow({ children }: { children: React.ReactNode }) {
//     return (
//         <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[var(--color-accent)] mb-4">
//             {children}
//         </p>
//     );
// }

// function SectionDivider() {
//     return <div className="border-t border-[var(--color-border)] mx-4 sm:mx-6 lg:mx-8" />;
// }

// function CheckIcon() {
//     return (
//         <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true" className="flex-shrink-0 mt-0.5">
//             <circle cx="9" cy="9" r="8" fill="var(--color-accent-light)" stroke="rgba(253,80,0,.2)" strokeWidth="1" />
//             <path d="M5.5 9l2.5 2.5 4.5-4.5" stroke="#fd5000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
//         </svg>
//     );
// }

// // ─── Page ─────────────────────────────────────────────────────────────────────

// // ─── DATA — sourced from Jimvio_Complete_Official_Documentation.pdf (May 2026) ───

// const IMPACT_STATS = [
//     { value: "10,000+", label: "Active Creators" },
//     { value: "$1M+", label: "Paid to Creators" },
//     { value: "50+", label: "Countries Served" },
//     { value: "99.9%", label: "Uptime" },
// ];

// const COMMITMENTS = [
//     "Make earning online transparent, accessible, and rewarding for every creator and seller on the planet.",
//     "Build features guided by one question: Does this help our creators earn more?",
//     "Provide global payouts to 50+ countries — including mobile money for Africa and Southeast Asia.",
//     "Offer zero setup fees, no credit card required, and no hidden subscription costs.",
//     "Verify vendors and creators so trust is built into every layer of the platform.",
// ];

// const VALUES = [
//     {
//         title: "Borderless by Design",
//         icon: <GlobeIcon />, // swap for your actual icon component
//         body: "Jimvio was built from day one to be borderless — not as a feature, but as a founding principle. Creators in Kigali, Lagos, and Jakarta deserve the same tools as anyone else.",
//     },
//     {
//         title: "Radical Transparency",
//         icon: (
//             <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
//                 <path d="M10 2l2 6h6l-5 3.5 2 6L10 14l-5 3.5 2-6L2 8h6z" stroke="#fd5000" strokeWidth="1.5" strokeLinejoin="round" />
//             </svg>
//         ),
//         body: "Every click, sale, and view is tracked in real-time with full transparency. Our analytics dashboard puts creators in complete control of their data and earnings.",
//     },
//     {
//         title: "Trust at Every Layer",
//         icon: <ShieldIcon />, // swap for your actual icon component
//         body: "Verified vendors, GDPR & CCPA-compliant data handling, encrypted transactions, and a 24/7 Trust & Safety team — because a safe platform is a thriving platform.",
//     },
// ];

// // NOTE: No individual team members are listed in the official documentation.
// // The team section below uses only the verified claim from the PDF.
// // Remove or replace TEAM with real bios once officially published.
// const TEAM = []; // ← populate when official bios are available

// // ─── Component ───────────────────────────────────────────────────────────────

// function AboutPage() {
//     return (
//         <div className="animate-fade-in-up">

//             {/* ── Hero: Our Story ── */}
//             <section className="relative px-4 sm:px-6 lg:px-8 pt-24 pb-20 text-center overflow-hidden home-page-bg">
//                 <div className="home-hero-grid pointer-events-none absolute inset-0" />
//                 <HeroBlobBackground />

//                 <div className="relative z-10">
//                     <Eyebrow>Our story</Eyebrow>

//                     <h1 className="text-[clamp(36px,5.5vw,64px)] font-black leading-[1.05] tracking-[-0.04em] text-[var(--color-text-primary)] mb-6">
//                         We built Jimvio because
//                         <br />
//                         <span className="text-[var(--color-accent)]">creators deserved better.</span>
//                     </h1>

//                     <p className="text-base sm:text-lg font-light text-[var(--color-text-secondary)] max-w-[500px] mx-auto mb-10 leading-relaxed">
//                         We envisioned a world where any person — a student in Kigali, a designer in Lagos,
//                         a seller in Jakarta — can build a sustainable digital income without gatekeepers,
//                         massive budgets, or millions of followers. So we built Jimvio.
//                     </p>

//                     {/*
//                         Pills — only claims verified in the official documentation.
//                         Removed: "Remote-first team" (not in PDF).
//                         Kept:    "Founded 2023" (consistent with PDF context) and "50+ countries".
//                         Added:   "Free to start" (explicitly stated in PDF).
//                     */}
//                     <div className="flex items-center justify-center gap-2 flex-wrap">
//                         {[
//                             { label: "Founded 2023" },
//                             { label: "50+ countries served" },
//                             { label: "Free to start" },
//                         ].map((pill) => (
//                             <div
//                                 key={pill.label}
//                                 className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-[var(--color-border)] text-sm font-medium text-[var(--color-text-secondary)]"
//                                 style={{ background: "rgb(var(--color-surface) / 0.8)" }}
//                             >
//                                 {pill.label}
//                             </div>
//                         ))}
//                     </div>
//                 </div>
//             </section>

//             {/* ── Impact Stats — values match PDF cover page exactly ── */}
//             <div className="grid grid-cols-2 sm:grid-cols-4 border-y border-[var(--color-border)] divide-x divide-[var(--color-border)]">
//                 {IMPACT_STATS.map((s) => (
//                     <div key={s.label} className="bg-[var(--color-surface)] py-8 px-6 text-center">
//                         <div className="text-4xl font-black tracking-tight text-[var(--color-accent)] leading-none mb-1.5">
//                             {s.value}
//                         </div>
//                         <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
//                             {s.label}
//                         </div>
//                     </div>
//                 ))}
//             </div>

//             {/* ── Mission ── */}
//             <div className="section-padding container-max">
//                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-start">
//                     <div>
//                         <Eyebrow>Mission</Eyebrow>
//                         <h2 className="text-[clamp(24px,3.5vw,38px)] font-black leading-tight tracking-[-0.03em] text-[var(--color-text-primary)] mb-5">
//                             The creator economy should work for everyone.
//                         </h2>
//                         {/*
//                             Updated copy to match the PDF mission statement verbatim in spirit.
//                             Previous copy mentioned "Latin America" — the PDF vision only names
//                             Africa and Southeast Asia explicitly. Corrected below.
//                         */}
//                         <p className="text-base font-light text-[var(--color-text-secondary)] leading-relaxed mb-4">
//                             Most platforms were built for creators in the US and Europe. Everyone else was an
//                             afterthought — stuck with currency restrictions, blocked payment methods, and fees
//                             that made no sense.
//                         </p>
//                         <p className="text-base font-light text-[var(--color-text-secondary)] leading-relaxed">
//                             Jimvio was built from day one to be borderless. Not as a feature — as a founding
//                             principle. Our mission: make earning online transparent, accessible, and rewarding
//                             for every creator and seller on the planet.
//                         </p>
//                     </div>

//                     <div className="rounded-[var(--radius-xl)] border border-[var(--color-accent)]/15 p-7"
//                         style={{ background: "rgb(var(--color-accent-light) / 0.4)" }}>
//                         <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--color-accent)] mb-5">
//                             Our commitment
//                         </p>
//                         <div className="flex flex-col gap-4">
//                             {COMMITMENTS.map((item) => (
//                                 <div key={item} className="flex items-start gap-3">
//                                     <CheckIcon />
//                                     <p className="text-sm font-light text-[var(--color-text-secondary)] leading-relaxed">
//                                         {item}
//                                     </p>
//                                 </div>
//                             ))}
//                         </div>
//                     </div>
//                 </div>
//             </div>

//             <SectionDivider />

//             {/* ── Values ── */}
//             <div className="section-padding container-max">
//                 <Eyebrow>Our values</Eyebrow>
//                 <h2 className="text-[clamp(22px,3vw,34px)] font-black tracking-[-0.03em] text-[var(--color-text-primary)] mb-3">
//                     What we believe in
//                 </h2>
//                 <p className="text-base font-light text-[var(--color-text-secondary)] max-w-md leading-relaxed mb-12">
//                     These aren't wall posters. They're the decisions we make every day when building Jimvio.
//                 </p>

//                 <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
//                     {VALUES.map((v) => (
//                         <div
//                             key={v.title}
//                             className="premium-card p-7 group hover:-translate-y-1 transition-transform duration-200"
//                         >
//                             <div className="w-10 h-10 rounded-[var(--radius-md)] bg-[var(--color-accent-light)] border border-[var(--color-accent)]/15 flex items-center justify-center mb-5">
//                                 {v.icon}
//                             </div>
//                             <h3 className="text-sm font-bold tracking-tight text-[var(--color-text-primary)] mb-2">
//                                 {v.title}
//                             </h3>
//                             <p className="text-sm font-light text-[var(--color-text-secondary)] leading-relaxed">
//                                 {v.body}
//                             </p>
//                         </div>
//                     ))}
//                 </div>
//             </div>

//             <SectionDivider />

//             {/* ── Team ── */}
//             {/*
//                 The official documentation does not list individual team members or confirm
//                 "18 people across 9 countries." The team grid and that hiring callout stat
//                 have been removed until official data is available.
//                 The hiring callout is preserved but the unverified headcount is removed.
//             */}
//             <div className="section-padding container-max">
//                 <Eyebrow>The team</Eyebrow>
//                 <h2 className="text-[clamp(22px,3vw,34px)] font-black tracking-[-0.03em] text-[var(--color-text-primary)] mb-3">
//                     Built by creators, for creators
//                 </h2>
//                 <p className="text-base font-light text-[var(--color-text-secondary)] max-w-md leading-relaxed mb-12">
//                     Our team has shipped products used by millions, built payment infrastructure across
//                     emerging markets, and yes — we've all tried to make money online ourselves.
//                 </p>

//                 {/* Hiring callout — headcount claim removed (not in official docs) */}
//                 <div className="flex items-center justify-between gap-4 px-6 py-4 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)]">
//                     <p className="text-sm font-light text-[var(--color-text-secondary)]">
//                         We're a <strong className="font-semibold text-[var(--color-text-primary)]">remote-first, globally distributed team.</strong> Always hiring.
//                     </p>
//                     <button className="btn-premium border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] hover:border-[var(--color-border-strong)] flex-shrink-0 gap-2 text-sm">
//                         See open roles
//                         <ArrowRight size={14} />
//                     </button>
//                 </div>
//             </div>

//             {/* ── CTA ── */}
//             <CtaSection />

//         </div>
//     );
// }

// // ─── Privacy Page ─────────────────────────────────────────────────────────────

// function PrivacyPage() {
//     return (
//         <div className="page-enter">
//             <div className="max-w-7xl mx-auto px-10 pt-20 pb-28">
//                 <LegalHero
//                     eyebrow="Legal"
//                     titleLine1="Privacy"
//                     titleLine2="Policy"
//                     tags={[
//                         { label: "Effective May 06, 2026" },
//                         { label: "✓ GDPR Compliant", green: true },
//                         { label: "✓ CCPA Compliant", green: true },
//                     ]}
//                 />

//                 <SectionBlock title="Our Commitment">
//                     <p className="text-[15px] text-[var(--color-text-secondary)] leading-[1.75] font-light mb-3.5">
//                         Jimvio is committed to protecting your privacy and handling your personal data with the
//                         highest standards of transparency and security.
//                     </p>
//                     <HighlightBox>
//                         Jimvio does not sell your personal data — ever. This is a core policy, not a legal
//                         technicality.
//                     </HighlightBox>
//                 </SectionBlock>

//                 <SectionBlock title="01 — Information We Collect">
//                     <DataTable headers={["Category", "Examples", "Purpose"]} rows={DATA_COLLECTION_ROWS} />
//                 </SectionBlock>

//                 <SectionBlock title="02 — How We Use Your Data">
//                     <LegalList items={PRIVACY_USE_ITEMS} />
//                 </SectionBlock>

//                 <SectionBlock title="03 — Data Sharing & Third Parties">
//                     <p className="text-[15px] text-[var(--color-text-secondary)] leading-[1.75] font-light mb-3.5">
//                         We share data only with trusted third parties essential to platform operations, and only
//                         to the extent strictly necessary. All partners are bound by data processing agreements.
//                     </p>
//                     <DataTable headers={["Recipient", "Purpose", "Data Shared"]} rows={DATA_SHARING_ROWS} />
//                 </SectionBlock>

//                 <SectionBlock title="04 — Your Privacy Rights">
//                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-5">
//                         {PRIVACY_RIGHTS.map((r) => (
//                             <div
//                                 key={r.title}
//                                 className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[14px] p-[22px_24px] transition-all duration-200 cursor-default hover:border-[var(--color-accent)]/25 hover:-translate-y-0.5"
//                             >
//                                 <div className="text-sm font-bold text-[var(--color-text-primary)] mb-1.5 tracking-[-0.015em]">
//                                     {r.title}
//                                 </div>
//                                 <p className="text-[13px] text-[var(--color-text-secondary)] leading-relaxed font-light">
//                                     {r.description}
//                                 </p>
//                             </div>
//                         ))}
//                     </div>
//                     <p className="mt-6 text-sm text-[var(--color-text-secondary)] font-light">
//                         To exercise any right, contact{" "}
//                         <span className="text-[var(--color-accent)] font-medium">info@jimvio.com</span> or go to
//                         Settings → Privacy. We respond within 30 days.
//                     </p>
//                 </SectionBlock>

//                 <SectionBlock title="05 — Data Security">
//                     <LegalList items={SECURITY_ITEMS} variant="check" />
//                 </SectionBlock>

//                 <SectionBlock title="06 — Data Retention">
//                     <p className="text-[15px] text-[var(--color-text-secondary)] leading-[1.75] font-light">
//                         We retain your data as long as your account is active or as required by law. Upon account
//                         deletion, personal data is removed within 90 days. Financial transaction records are
//                         retained for 7 years as required by international tax regulations. Anonymized analytics
//                         data may be retained indefinitely.
//                     </p>
//                 </SectionBlock>

//                 <p className="text-[13px] text-[var(--color-text-muted)] pt-10 border-t border-[var(--color-border)]">
//                     Questions about privacy? Contact us at info@jimvio.com · jimvio.com/privacy
//                 </p>
//             </div>
//         </div>
//     );
// }

// // ─── Terms Page ───────────────────────────────────────────────────────────────

// function TermsPage() {
//     return (
//         <div className="page-enter">
//             <div className="max-w-7xl mx-auto px-10 pt-20 pb-28">
//                 <LegalHero
//                     eyebrow="Legal"
//                     titleLine1="Terms of"
//                     titleLine2="Service"
//                     tags={[{ label: "Version 1.0" }, { label: "Effective May 06, 2026" }]}
//                 />

//                 <SectionBlock title="Agreement">
//                     <p className="text-[15px] text-[var(--color-text-secondary)] leading-[1.75] font-light">
//                         By accessing or using the Jimvio platform, you agree to be bound by these Terms of
//                         Service. This is a legally binding agreement between you and Jimvio. If you do not agree,
//                         you must not use the platform. We may update these Terms at any time; continued use
//                         constitutes acceptance.
//                     </p>
//                 </SectionBlock>

//                 <SectionBlock title="01 — Eligibility">
//                     <p className="text-[15px] text-[var(--color-text-secondary)] leading-[1.75] font-light mb-4">
//                         To use Jimvio, you must meet all of the following requirements:
//                     </p>
//                     <LegalList
//                         items={[
//                             "Be at least 18 years of age, or the age of majority in your jurisdiction.",
//                             "Have the legal capacity to enter into a binding contract under applicable law.",
//                             "Not be prohibited from using the platform under any local or international law.",
//                             "Provide accurate, complete, and up-to-date registration information at all times.",
//                             "Maintain the security and confidentiality of your account credentials.",
//                         ]}
//                     />
//                 </SectionBlock>

//                 <SectionBlock title="02 — Account Security">
//                     <p className="text-[15px] text-[var(--color-text-secondary)] leading-[1.75] font-light">
//                         You are solely responsible for maintaining the confidentiality of your account
//                         credentials. Notify Jimvio immediately at{" "}
//                         <span className="text-[var(--color-accent)] font-medium">info@jimvio.com</span> of any
//                         unauthorized access. You may not create multiple accounts, use bots to register, or
//                         transfer your account to another person without express written permission from Jimvio.
//                     </p>
//                 </SectionBlock>

//                 <SectionBlock title="03 — Prohibited Conduct">
//                     <p className="text-[15px] text-[var(--color-text-secondary)] leading-[1.75] font-light mb-4">
//                         The following conduct is strictly prohibited and may result in immediate account
//                         termination without notice:
//                     </p>
//                     <LegalList items={PROHIBITED_ITEMS} variant="cross" />
//                 </SectionBlock>

//                 <SectionBlock title="04 — Intellectual Property">
//                     <p className="text-[15px] text-[var(--color-text-secondary)] leading-[1.75] font-light">
//                         All Jimvio platform content, branding, code, and designs are the exclusive intellectual
//                         property of Jimvio. Users retain ownership of original content they create. By submitting
//                         content, users grant Jimvio a worldwide, royalty-free, non-exclusive license to use and
//                         display it in connection with platform operations. Unauthorized use of Jimvio's brand or
//                         trademarks is strictly prohibited.
//                     </p>
//                 </SectionBlock>

//                 <SectionBlock title="05 — Limitation of Liability">
//                     <p className="text-[15px] text-[var(--color-text-secondary)] leading-[1.75] font-light">
//                         To the maximum extent permitted by law, Jimvio shall not be liable for indirect,
//                         incidental, special, consequential, or punitive damages arising from your use of the
//                         platform. Jimvio's total aggregate liability shall not exceed amounts paid by you to
//                         Jimvio in the twelve months preceding the claim.
//                     </p>
//                 </SectionBlock>

//                 <SectionBlock title="06 — Governing Law & Disputes">
//                     <p className="text-[15px] text-[var(--color-text-secondary)] leading-[1.75] font-light">
//                         These Terms shall be governed by applicable international commercial law. Disputes shall
//                         first be subject to good faith negotiation between the parties. Unresolved disputes are
//                         submitted to binding arbitration. Nothing prevents either party from seeking urgent
//                         injunctive relief from a court of competent jurisdiction.
//                     </p>
//                 </SectionBlock>

//                 <p className="text-[13px] text-[var(--color-text-muted)] pt-10 border-t border-[var(--color-border)]">
//                     Legal inquiries: info@jimvio.com · jimvio.com/terms · Version 1.0 · May 06, 2026
//                 </p>
//             </div>
//         </div>
//     );
// }

// // ─── Cookies Page ─────────────────────────────────────────────────────────────

// function CookiesPage() {
//     return (
//         <div className="page-enter">
//             <div className="max-w-7xl mx-auto px-10 pt-20 pb-28">
//                 <LegalHero
//                     eyebrow="Legal"
//                     titleLine1="Cookie"
//                     titleLine2="Policy"
//                     tags={[
//                         { label: "Effective May 06, 2026" },
//                         { label: "✓ GDPR Compliant", green: true },
//                     ]}
//                 />

//                 <SectionBlock title="What Are Cookies?">
//                     <p className="text-[15px] text-[var(--color-text-secondary)] leading-[1.75] font-light mb-3.5">
//                         Cookies are small text files placed on your device when you visit a website. They help
//                         websites remember your preferences, maintain login sessions, and analyze usage patterns to
//                         improve the product experience.
//                     </p>
//                     <p className="text-[15px] text-[var(--color-text-secondary)] leading-[1.75] font-light">
//                         Jimvio uses cookies to keep you signed in, remember your settings, understand how our
//                         platform is used, and show you relevant content. You are always in control of
//                         non-essential cookies.
//                     </p>
//                 </SectionBlock>

//                 <SectionBlock title="Cookies We Use">
//                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-5">
//                         {COOKIE_CARDS.map((c) => (
//                             <div
//                                 key={c.name}
//                                 className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[14px] p-[22px_24px] transition-colors duration-200 hover:border-[var(--color-border-strong)]"
//                             >
//                                 <div className="flex items-center justify-between mb-2.5">
//                                     <span className="text-[15px] font-bold text-[var(--color-text-primary)] tracking-[-0.02em]">
//                                         {c.name}
//                                     </span>
//                                     <span
//                                         className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full tracking-[0.04em] ${c.required
//                                             ? "bg-[rgba(253,80,0,0.12)] text-[#fd6a20]"
//                                             : "bg-[rgba(0,0,0,0.05)] text-[var(--color-text-muted)]"
//                                             }`}
//                                     >
//                                         {c.required ? "Required" : "Optional"}
//                                     </span>
//                                 </div>
//                                 <p className="text-[13px] text-[var(--color-text-secondary)] leading-relaxed font-light mb-2.5">
//                                     {c.description}
//                                 </p>
//                                 <p className="text-[12px] text-[var(--color-text-muted)]">{c.duration}</p>
//                             </div>
//                         ))}
//                     </div>
//                 </SectionBlock>

//                 <SectionBlock title="Your Cookie Choices">
//                     <p className="text-[15px] text-[var(--color-text-secondary)] leading-[1.75] font-light mb-4">
//                         You are always in control. Manage your preferences at any time:
//                     </p>
//                     <LegalList
//                         items={[
//                             "Go to Settings → Privacy → Cookie Preferences inside your Jimvio account.",
//                             "Visit jimvio.com/cookie-settings at any time — no login required.",
//                             "Adjust your browser settings to block or delete cookies at the device level.",
//                         ]}
//                     />
//                     <HighlightBox>
//                         Disabling required cookies (Session and Security) will prevent you from logging in and
//                         using the platform. All other cookies are fully optional and can be toggled independently.
//                     </HighlightBox>
//                 </SectionBlock>

//                 <SectionBlock title="Third-Party Cookies">
//                     <p className="text-[15px] text-[var(--color-text-secondary)] leading-[1.75] font-light">
//                         Some third-party services we use — such as analytics providers and payment processors —
//                         may set their own cookies on your device. These are governed by the respective
//                         third-party privacy policies. Jimvio ensures all partners are bound by data processing
//                         agreements that meet our privacy standards.
//                     </p>
//                 </SectionBlock>

//                 <SectionBlock title="Policy Updates">
//                     <p className="text-[15px] text-[var(--color-text-secondary)] leading-[1.75] font-light">
//                         We may update this Cookie Policy from time to time to reflect changes in our practices or
//                         applicable regulations. We will notify you of any significant changes by posting a notice
//                         on the platform or via email. Continued use of Jimvio after the effective date constitutes
//                         acceptance of the revised policy.
//                     </p>
//                 </SectionBlock>

//                 <p className="text-[13px] text-[var(--color-text-muted)] pt-10 border-t border-[var(--color-border)]">
//                     Cookie questions? Contact info@jimvio.com · Manage: jimvio.com/cookie-settings
//                 </p>
//             </div>
//         </div>
//     );
// }

// export { AboutPage, PrivacyPage, TermsPage, CookiesPage }

"use client";

import { ArrowRight, GlobeIcon, ShieldIcon } from "lucide-react";
import {
    ShoppingCart,
    Link2,
    Clapperboard,
    Users,
    BarChart2,
    Banknote,
} from "lucide-react";
import { HeroBlobBackground } from "./ui/HeroBlobBackground";
import { CtaSection } from "./sections/CtaSection";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FeatureItem {
    icon: React.ReactNode;
    title: string;
    description: string;
}
interface StepItem {
    number: string;
    title: string;
    description: string;
}
interface WhyItem {
    title: string;
    body: string;
}
interface TableRow {
    col1: string;
    col2: string;
    col3: string;
}
interface TableRow4 {
    col1: string;
    col2: string;
    col3: string;
    col4: string;
}
interface RightCard {
    title: string;
    description: string;
}
interface CookieCard {
    name: string;
    required: boolean;
    description: string;
    duration: string;
    optOut: string;
}

type ListVariant = "dash" | "check" | "cross";

// ─── DATA ─────────────────────────────────────────────────────────────────────
// All values sourced from: Jimvio_Complete_Official_Documentation.pdf · May 2026
// Section references noted inline.

// § About (PDF p.2) — used in hero stats bar on all pages
// FIX: was "10k" in STATS and "10,000+" in IMPACT_STATS — normalized to one source of truth.
const PLATFORM_STATS = [
    { value: "10,000+", label: "Active Creators" },
    { value: "$1M+", label: "Paid to Creators" },
    { value: "50+", label: "Countries Served" },
    { value: "99.9%", label: "Platform Uptime" },
];

// § About (PDF p.3) — core platform features table
const FEATURES: FeatureItem[] = [
    {
        icon: <ShoppingCart size={20} strokeWidth={1.6} />,
        title: "Global Marketplace",
        description:
            "Buy and sell physical and digital products worldwide. Integrated payment processing with verified vendor badges builds trust at scale.",
    },
    {
        icon: <Link2 size={20} strokeWidth={1.6} />,
        title: "Affiliate System",
        description:
            "Promote any Jimvio product and earn commissions up to 50%. Real-time dashboard, transparent payout history — no inventory required.",
    },
    {
        icon: <Clapperboard size={20} strokeWidth={1.6} />,
        title: "UGC & Clipping Campaigns",
        description:
            "Brands launch campaigns daily. Submit short-form content and earn per approval or per 1,000 verified views. No followers needed.",
    },
    {
        icon: <Users size={20} strokeWidth={1.6} />,
        title: "Niche Communities",
        description:
            "Spaces for buyers, sellers, and creators to network, share insights, and unlock exclusive group deals that benefit everyone.",
    },
    {
        icon: <BarChart2 size={20} strokeWidth={1.6} />,
        title: "Analytics Dashboard",
        description:
            "Complete performance analytics — earnings, click-through rates, campaign metrics, and affiliate conversions tracked live.",
    },
    {
        icon: <Banknote size={20} strokeWidth={1.6} />,
        title: "Secure Global Payouts",
        description:
            "Withdraw via Stripe, PayPal, bank transfer, or mobile money. Built for Africa, Southeast Asia, and beyond — 50+ countries.",
    },
];

// § About (PDF p.3) — how it works steps
const STEPS: StepItem[] = [
    {
        number: "01",
        title: "Join Jimvio",
        description:
            "Create your free account in under 60 seconds. No credit card required. No hidden fees.",
    },
    {
        number: "02",
        title: "Pick Your Path",
        description:
            "Browse marketplace products to promote, or explore live brand campaigns tailored to your niche.",
    },
    {
        number: "03",
        title: "Promote or Create",
        description:
            "Share your unique affiliate link, or film and submit UGC content from any device — your phone is enough.",
    },
    {
        number: "04",
        title: "Earn & Withdraw",
        // FIX: added "$20 minimum" — explicitly stated in PDF p.9 and p.19
        description:
            "Track earnings in real-time. Withdraw to your preferred payment method once you hit the $20 minimum threshold.",
    },
];

// § About (PDF p.3) — what makes Jimvio different
const WHY_ITEMS: WhyItem[] = [
    {
        title: "All-in-one login.",
        body: "Marketplace, affiliate, campaigns, and communities — no switching between apps or dashboards.",
    },
    {
        title: "No followers required.",
        body: "Anyone can join a campaign and get paid from day one. Your phone is your studio.",
    },
    {
        title: "Global payouts.",
        // FIX: PDF p.3 names Africa and Southeast Asia specifically — Latin America removed
        body: "Mobile money for Africa and Southeast Asia. Stripe, PayPal, and bank transfer everywhere else.",
    },
    {
        title: "Real-time tracking.",
        body: "Every click, sale, and view tracked live with full transparency. No black-box commission systems.",
    },
    {
        title: "Free to start.",
        body: "Zero setup fees, no credit card, no hidden subscription costs. Jimvio earns when you earn.",
    },
    {
        title: "Verified trust.",
        body: "Verified vendors and creators at every layer. Brand campaigns launching daily across all niches.",
    },
];

// § About page — impact stats & commitments
const IMPACT_STATS = PLATFORM_STATS; // single source of truth

const COMMITMENTS = [
    // PDF p.2 mission statement
    "Make earning online transparent, accessible, and rewarding for every creator and seller on the planet.",
    // PDF p.2 core question
    "Build features guided by one question: Does this help our creators earn more?",
    // PDF p.2-3
    "Provide global payouts to 50+ countries — including mobile money for Africa and Southeast Asia.",
    // PDF p.3
    "Offer zero setup fees, no credit card required, and no hidden subscription costs.",
    // PDF p.2-3
    "Verify vendors and creators so trust is built into every layer of the platform.",
];

const VALUES = [
    {
        title: "Borderless by Design",
        icon: <GlobeIcon size={20} />,
        // PDF p.2 vision statement
        body: "We envision a world where any person — a student in Kigali, a designer in Lagos, a seller in Jakarta — can build sustainable digital income without gatekeepers or millions of followers.",
    },
    {
        title: "Radical Transparency",
        icon: (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M10 2l2 6h6l-5 3.5 2 6L10 14l-5 3.5 2-6L2 8h6z" stroke="#fd5000" strokeWidth="1.5" strokeLinejoin="round" />
            </svg>
        ),
        // PDF p.2 & p.3 analytics dashboard
        body: "Every click, sale, and view is tracked in real-time with full transparency. Our analytics dashboard puts creators in complete control of their data and earnings.",
    },
    {
        title: "Trust at Every Layer",
        icon: <ShieldIcon size={20} />,
        // PDF p.5 security + p.20 safety policy
        body: "Verified vendors, GDPR & CCPA-compliant data handling, encrypted transactions, and a 24/7 Trust & Safety team — because a safe platform is a thriving one.",
    },
];

// ─── Affiliate Program Data (PDF p.9) ─────────────────────────────────────────
// ADDED: was entirely missing from component

const AFFILIATE_COMMISSION_ROWS: TableRow4[] = [
    { col1: "Digital Products", col2: "Up to 50%", col3: "Set by seller", col4: "Shown on product page" },
    { col1: "Physical Products", col2: "5% – 30%", col3: "Varies by seller/margin", col4: "" },
    { col1: "SaaS / Subscriptions", col2: "Up to 40% recurring", col3: "Earned on each renewal", col4: "" },
    { col1: "Exclusive Campaigns", col2: "Fixed rate / milestone", col3: "Defined per campaign brief", col4: "" },
];

const AFFILIATE_OBLIGATIONS = [
    "Disclose your affiliate relationship clearly in all promotional content.",
    "Promote products accurately — never make false claims about features, pricing, or results.",
    "Never generate fake clicks, artificial traffic, or fraudulent conversions.",
    "Do not use spam, unsolicited emails, or paid traffic in violation of platform rules.",
    "Do not promote products through misleading landing pages, cookie stuffing, or ad hijacking.",
    "Comply with all applicable advertising and FTC disclosure guidelines.",
];

// ─── Seller Fees (PDF p.11) ───────────────────────────────────────────────────
// ADDED: was entirely missing from component

const SELLER_FEES_ROWS: TableRow[] = [
    { col1: "Platform Transaction Fee", col2: "5% – 10% of sale price", col3: "Deducted from seller earnings" },
    { col1: "Payment Processing", col2: "2.9% + $0.30", col3: "Standard payment processor fee" },
    { col1: "Affiliate Commission", col2: "Set by seller", col3: "Paid to affiliates from seller proceeds" },
    { col1: "Payout Processing", col2: "Free above $50 threshold", col3: "Small fee for same-day payouts" },
];

// ─── Campaign Payment Models (PDF p.13) ───────────────────────────────────────
// ADDED: was entirely missing from component

const CAMPAIGN_PAYMENT_ROWS: TableRow4[] = [
    { col1: "UGC — Per Submission", col2: "Fixed rate per approved content", col3: "Within 14 days of approval", col4: "" },
    { col1: "UGC — Performance", col2: "Bonus per view/engagement milestone", col3: "Monthly, based on analytics", col4: "" },
    { col1: "Clipping — Per View", col2: "Earnings per 1,000 verified views", col3: "Monthly payout", col4: "" },
    { col1: "Clipping — Fixed", col2: "One-time payment per clip published", col3: "Within 14 days of verification", col4: "" },
];

const CAMPAIGN_CREATOR_OBLIGATIONS = [
    "Submit only original content that you have full rights to.",
    "Follow the campaign brief exactly — do not deviate from required format, length, or guidelines.",
    "Do not use AI-generated content unless explicitly permitted in the brief.",
    "Do not submit content that contains copyrighted material (music, footage) without proper licensing.",
    "Do not plagiarize or steal content from other creators.",
    "Disclose that content is brand-sponsored per FTC and applicable advertising guidelines.",
    "Do not submit the same content to multiple competing campaigns.",
    "Do not artificially inflate views, likes, or engagement metrics.",
];

// ─── Community Guidelines (PDF p.15-16) ───────────────────────────────────────
// ADDED: enforcement table was entirely missing

const COMMUNITY_ENCOURAGED = [
    "Authentic content that genuinely reflects your experience with products or campaigns.",
    "Transparent disclosure of affiliate relationships and sponsored content.",
    "Constructive and respectful engagement with other community members.",
    "Supporting fellow creators — sharing knowledge, tips, and opportunities.",
    "Honest reviews, realistic earnings examples, and factual product claims.",
];

const COMMUNITY_PROHIBITED_ROWS: TableRow[] = [
    { col1: "Hate Speech", col2: "Content attacking individuals based on race, ethnicity, religion, gender, sexual orientation, or disability.", col3: "Suspension / Ban" },
    { col1: "Fake Earnings", col2: "Fabricated earnings screenshots, manipulated dashboards, or misleading income claims.", col3: "Suspension / Ban" },
    { col1: "Impersonation", col2: "Pretending to be another creator, brand, celebrity, or Jimvio employee.", col3: "Strike / Suspension" },
    { col1: "Illegal Products", col2: "Promoting, listing, or linking to products or services illegal in any jurisdiction.", col3: "Suspension / Ban" },
    { col1: "Harmful Spam", col2: "Mass-sending promotional messages, unsolicited DMs, or low-quality content to inflate metrics.", col3: "Warning / Strike" },
    { col1: "Misinformation", col2: "Spreading false claims about products, earnings potential, or platform capabilities.", col3: "Warning / Strike" },
    { col1: "Harassment & Bullying", col2: "Targeting, threatening, or persistently harassing other users in any form.", col3: "Suspension / Ban" },
    { col1: "Adult Content", col2: "Sharing sexual, graphic, or age-restricted content on the platform.", col3: "Permanent Ban" },
    { col1: "Privacy Violations", col2: "Sharing personal information of others without consent (doxxing).", col3: "Permanent Ban" },
    { col1: "Fake Reviews", col2: "Posting fake product reviews or coordinating review manipulation campaigns.", col3: "Strike / Suspension" },
];

// ADDED: enforcement levels table (PDF p.15-16)
const ENFORCEMENT_ROWS: TableRow[] = [
    { col1: "Warning", col2: "Notification + content removal", col3: "First minor violation" },
    { col1: "Strike", col2: "Temporary restriction on posting", col3: "Repeat minor violations" },
    { col1: "Suspension", col2: "Account locked for 7–30 days", col3: "Serious violations" },
    { col1: "Permanent Ban", col2: "Account permanently terminated", col3: "Severe or repeated violations" },
];

// ─── Prohibited Products (PDF p.17-18) ───────────────────────────────────────
// ADDED: was entirely missing — different from PROHIBITED_ITEMS (which is conduct)

const PROHIBITED_PRODUCTS = {
    illegal: [
        "Controlled substances, narcotics, or paraphernalia.",
        "Weapons, firearms, or ammunition (where prohibited by law).",
        "Counterfeit goods, fake currency, or forged documents.",
        "Stolen property or goods obtained through illegal means.",
        "Items violating international trade sanctions or embargoes.",
    ],
    harmful: [
        "Products that pose a risk to user health and safety without proper certification.",
        "Unregulated dietary supplements making false medical claims.",
        "Dangerous chemicals, toxins, or explosive materials.",
        "Devices designed to intercept communications or surveillance without consent.",
    ],
    adult: [
        "Adult content, pornographic material, or explicit services.",
        "Alcohol, tobacco, and vaping products (requires age verification & local compliance).",
        "Gambling services, betting tools, or lottery schemes.",
    ],
    digitalFraud: [
        "Get-rich-quick schemes, pyramid schemes, or Ponzi structures.",
        "Fake social media followers, fake reviews, or engagement bots.",
        "Hacking tools, malware, spyware, or exploit kits.",
        "Phishing kits, credential theft tools, or impersonation services.",
        "AI-generated fake identity documents or verification bypasses.",
    ],
    ip: [
        "Counterfeit branded goods (fake designer items, unauthorized replicas).",
        "Pirated software, cracked applications, or unauthorized digital content.",
        "Unauthorized use of copyrighted music, film, or written content.",
        "NFT scams or fraudulent digital asset offerings.",
    ],
    jurisdictional: [
        "Medical devices without required regulatory approvals.",
        "Financial products without proper licensing (unlicensed investment advice).",
        "Services that vary in legality across jurisdictions — sellers are responsible for compliance.",
    ],
};

// ─── Refund Policy (PDF p.19) ─────────────────────────────────────────────────
// ADDED: was entirely missing from component

const REFUND_ROWS: TableRow4[] = [
    { col1: "Digital Products", col2: "72 hours", col3: "If file is defective or not as described", col4: "" },
    { col1: "Physical Products", col2: "30 days", col3: "If damaged, incorrect, or not delivered", col4: "" },
    { col1: "Subscriptions", col2: "24 hours", col3: "After first billing only — no refund on renewals", col4: "" },
    { col1: "Campaign Earnings", col2: "Non-refundable", col3: "Once content is approved and paid", col4: "" },
];

const PAYOUT_POLICY_ITEMS = [
    // PDF p.19 — all items
    "Payouts are processed on a NET-30 basis (30 days after confirmed sale).",
    "Minimum payout threshold: $20 USD (or local currency equivalent).",
    "Payout methods: Stripe, PayPal, bank transfer, or local mobile money (country-dependent).",
    "Earnings on hold pending fraud review are not eligible for payout until cleared.",
    "Tax withholding applies as required by your country's tax regulations.",
    "Failed payouts due to incorrect banking details are the account holder's responsibility.",
    "Jimvio does not charge a fee for standard monthly payouts.",
];

// ─── Privacy Data (PDF p.4-6) ─────────────────────────────────────────────────

const DATA_COLLECTION_ROWS: TableRow[] = [
    // FIX: added missing "Cookie & Tracking" row from PDF p.4
    { col1: "Account Data", col2: "Name, email, username, password", col3: "Authentication" },
    { col1: "Profile Data", col2: "Bio, photo, country, social handles", col3: "Public creator profile" },
    { col1: "Financial Data", col2: "Payout details, transaction history", col3: "Payments & payouts" },
    { col1: "Usage Data", col2: "Pages visited, clicks, session duration", col3: "Analytics & improvement" },
    { col1: "Content Data", col2: "Posts, campaign submissions, listings", col3: "Platform functionality" },
    { col1: "Support Data", col2: "Tickets, messages, feedback", col3: "Customer support" },
    { col1: "Cookie & Tracking", col2: "Session cookies, analytics cookies, preference data", col3: "UX optimization" },
];

const DATA_SHARING_ROWS: TableRow[] = [
    { col1: "Payment Processors", col2: "Execute transactions and payouts", col3: "Financial data only" },
    { col1: "Analytics Providers", col2: "Understand platform usage", col3: "Anonymized usage data" },
    { col1: "Cloud Infrastructure", col2: "Host platform data securely", col3: "Encrypted storage" },
    { col1: "Legal Authorities", col2: "Comply with lawful requests", col3: "As required by law" },
];

const PRIVACY_RIGHTS: RightCard[] = [
    { title: "Right to Access", description: "Request a complete copy of all personal data we hold about you." },
    { title: "Right to Rectification", description: "Correct any inaccurate or incomplete information in your profile." },
    { title: "Right to Erasure", description: "Request full deletion of your account and all associated data." },
    { title: "Right to Portability", description: "Export your data in a machine-readable format (JSON/CSV) anytime." },
    { title: "Right to Object", description: "Opt out of marketing or non-essential data processing instantly." },
    // FIX: was "Right to Restrict" — PDF says "Right to Restrict Processing"
    { title: "Right to Restrict Processing", description: "Limit how we use your data during disputes or active verification." },
    // ADDED: "Right to Withdraw Consent" — present in PDF p.5, missing from component
    { title: "Right to Withdraw Consent", description: "Revoke consent for non-essential data processing at any time." },
];

const PRIVACY_USE_ITEMS = [
    "Create and manage your account and platform access.",
    "Process transactions, calculate commissions, and execute payouts reliably.",
    "Verify creator and seller identity and prevent fraud and abuse.",
    "Display relevant products, campaigns, and community recommendations.",
    "Send transactional emails: account activity alerts, payout confirmations.",
    "Send marketing communications — only with your explicit consent.",
    "Analyze platform performance and continuously improve user experience.",
    "Comply with legal obligations and respond to lawful law enforcement requests.",
    // ADDED: missing from component, present in PDF p.4
    "Detect and prevent violations of our Terms of Service.",
];

const SECURITY_ITEMS = [
    "All data transmitted via TLS/SSL encryption — never in plaintext.",
    "Passwords hashed with industry-standard bcrypt/Argon2 algorithms.",
    "Payment details tokenized — never stored in plaintext on our systems.",
    "Ongoing security audits and penetration testing by independent specialists.",
    "Personal data accessible only to authorized personnel on a need-to-know basis.",
    "Dedicated breach response team with documented incident response protocol.",
];

// ─── Terms Data (PDF p.7-8) ───────────────────────────────────────────────────

const PROHIBITED_CONDUCT_ITEMS = [
    "Engaging in scams, fraud, deceptive practices, or any form of financial dishonesty.",
    "Sending spam, unsolicited messages, or mass promotional communications.",
    "Generating fake traffic, artificial clicks, bot activity, or fraudulent affiliate conversions.",
    "Creating misleading promotions, fabricated earnings screenshots, or false income claims.",
    "Infringing on intellectual property rights of any third party.",
    "Selling counterfeit, illegal, stolen, or prohibited products on the marketplace.",
    "Impersonating any person, brand, celebrity, or Jimvio representative.",
    "Attempting to hack, reverse-engineer, scrape, or disrupt the platform.",
    "Using the platform to facilitate money laundering or illegal financial activity.",
    "Posting hate speech, discriminatory content, or content that promotes violence.",
    "Sharing adult content, explicit material, or any content involving minors.",
    "Engaging in harassment, bullying, or targeted abuse of any community member.",
];

// ─── DMCA Procedure (PDF p.20-21) ────────────────────────────────────────────
// ADDED: was entirely missing from component

const DMCA_REQUIRED_FIELDS = [
    "Your full legal name and contact information.",
    "A description of the copyrighted work you claim has been infringed.",
    "The URL or location of the allegedly infringing content on Jimvio.",
    "A statement that you have a good faith belief the use is not authorized.",
    "A statement, under penalty of perjury, that the information is accurate.",
    "Your physical or electronic signature.",
];

// ─── Cookie Data (PDF p.21) ───────────────────────────────────────────────────
// FIX: added missing "optOut" field to match PDF cookie table

const COOKIE_CARDS: CookieCard[] = [
    {
        name: "Session Cookies",
        required: true,
        description: "Maintain your login state while you navigate the platform. Essential for security and core functionality.",
        duration: "Session end",
        optOut: "Cannot be disabled — essential",
    },
    {
        name: "Security Cookies",
        required: true,
        description: "Real-time fraud detection and account protection. Essential to keeping your account safe.",
        duration: "Session end",
        optOut: "Cannot be disabled — essential",
    },
    {
        name: "Preference Cookies",
        required: false,
        description: "Remember your display settings, language preferences, and other platform customizations.",
        duration: "1 year",
        optOut: "Yes — can be disabled in settings",
    },
    {
        name: "Analytics (1st party)",
        required: false,
        description: "Help us understand how creators and sellers use Jimvio so we can improve features over time.",
        duration: "2 years",
        optOut: "Yes — can be disabled",
    },
    {
        name: "Analytics (3rd party)",
        required: false,
        description: "External traffic analysis tools that help us understand where visitors come from.",
        duration: "2 years",
        optOut: "Yes — can be disabled",
    },
    {
        name: "Marketing Cookies",
        required: false,
        description: "Enable personalized promotions and relevant campaign recommendations. Only set with your explicit consent.",
        duration: "90 days",
        // FIX: PDF says "Yes — Consent" specifically for marketing cookies
        optOut: "Yes — explicit consent required",
    },
];

// ─── Advertising Standards (PDF p.20) ────────────────────────────────────────
// ADDED: was entirely missing from component

const ADVERTISING_STANDARDS = [
    "All ads and promotional content must be truthful and non-deceptive.",
    "Ads must be clearly labeled as 'Sponsored' or 'Ad' where applicable.",
    "No bait-and-switch advertising — the advertised offer must be the actual offer.",
    "Comparative advertising must be factually accurate and not disparaging.",
    "Ads targeting minors are prohibited.",
    "Ads for prohibited products (per Prohibited Products policy) are not permitted.",
    "Political advertising requires pre-approval and enhanced verification.",
];

const CREATOR_DISCLOSURE_ITEMS = [
    "Clearly disclose any material connection to a brand per FTC guidelines.",
    // PDF p.20: acceptable disclosure labels
    "Acceptable disclosures: #ad, #sponsored, #partner, or 'Paid partnership with [Brand]'.",
    "Disclosures must be prominent and not buried in hashtags or fine print.",
];

// ─── Shared UI Components ─────────────────────────────────────────────────────

function Eyebrow({ children }: { children: React.ReactNode }) {
    return (
        <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[var(--color-accent)] mb-4">
            {children}
        </p>
    );
}

function SectionDivider() {
    return <div className="border-t border-[var(--color-border)] mx-4 sm:mx-6 lg:mx-8" />;
}

function CheckIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true" className="flex-shrink-0 mt-0.5">
            <circle cx="9" cy="9" r="8" fill="var(--color-accent-light)" stroke="rgba(253,80,0,.2)" strokeWidth="1" />
            <path d="M5.5 9l2.5 2.5 4.5-4.5" stroke="#fd5000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
    return (
        <h2 className="text-[clamp(30px,4vw,48px)] font-black tracking-[-0.035em] leading-[1.08] text-[var(--color-text-primary)] mb-5">
            {children}
        </h2>
    );
}

function DataTable({ headers, rows }: { headers: string[]; rows: TableRow[] }) {
    return (
        <div className="border border-[var(--color-border)] rounded-[var(--radius-lg)] overflow-hidden mt-5 bg-[var(--color-surface)]">
            <table className="w-full border-collapse text-sm">
                <thead>
                    <tr className="border-b border-[var(--color-border)]">
                        {headers.map((h) => (
                            <th key={h} className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
                                {h}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, i) => (
                        <tr key={i} className={i < rows.length - 1 ? "border-b border-[var(--color-border)]" : ""}>
                            <td className="px-4 py-3.5 font-medium text-[var(--color-text-primary)] leading-snug">{row.col1}</td>
                            <td className="px-4 py-3.5 font-light text-[var(--color-text-secondary)] leading-snug">{row.col2}</td>
                            <td className="px-4 py-3.5 font-light text-[var(--color-text-secondary)] leading-snug">{row.col3}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function DataTable4({ headers, rows }: { headers: string[]; rows: TableRow4[] }) {
    return (
        <div className="border border-[var(--color-border)] rounded-[var(--radius-lg)] overflow-hidden mt-5 bg-[var(--color-surface)]">
            <table className="w-full border-collapse text-sm">
                <thead>
                    <tr className="border-b border-[var(--color-border)]">
                        {headers.map((h) => (
                            <th key={h} className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
                                {h}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, i) => (
                        <tr key={i} className={i < rows.length - 1 ? "border-b border-[var(--color-border)]" : ""}>
                            <td className="px-4 py-3.5 font-medium text-[var(--color-text-primary)] leading-snug">{row.col1}</td>
                            <td className="px-4 py-3.5 font-light text-[var(--color-text-secondary)] leading-snug">{row.col2}</td>
                            <td className="px-4 py-3.5 font-light text-[var(--color-text-secondary)] leading-snug">{row.col3}</td>
                            {row.col4 && <td className="px-4 py-3.5 font-light text-[var(--color-text-secondary)] leading-snug">{row.col4}</td>}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

const VARIANT_STYLES: Record<ListVariant, { char: string; className: string }> = {
    dash: { char: "—", className: "text-[var(--color-accent)]" },
    check: { char: "✓", className: "text-[var(--color-success)]" },
    cross: { char: "✗", className: "text-[var(--color-danger)]" },
};

function LegalList({ items, variant = "dash" }: { items: string[]; variant?: ListVariant }) {
    const { char, className } = VARIANT_STYLES[variant];
    return (
        <ul className="flex flex-col gap-2.5 mt-2 list-none">
            {items.map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-[var(--color-text-secondary)] leading-relaxed font-light">
                    <span className={`${className} flex-shrink-0 mt-0.5`}>{char}</span>
                    {item}
                </li>
            ))}
        </ul>
    );
}

function HighlightBox({ children }: { children: React.ReactNode }) {
    return (
        <div className="mt-5 rounded-[var(--radius-md)] border border-[var(--color-accent)]/20 bg-[var(--color-accent-light)] px-6 py-5 text-sm text-[var(--color-accent)] leading-relaxed font-light">
            {children}
        </div>
    );
}

function SectionBlock({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="mb-14">
            <h3 className="text-xl font-bold tracking-tight text-[var(--color-text-primary)] mb-5 pb-3.5 border-b border-[var(--color-border)]">
                {title}
            </h3>
            {children}
        </div>
    );
}

function LegalMeta({ tags }: { tags: Array<{ label: string; green?: boolean }> }) {
    return (
        <div className="flex items-center gap-2.5 flex-wrap">
            {tags.map((tag) => (
                <span
                    key={tag.label}
                    className={`inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] px-3 py-1.5 text-xs font-medium border
                        ${tag.green
                            ? "bg-[var(--color-success-light)] border-[var(--color-success)]/25 text-[var(--color-success)]"
                            : "bg-[var(--color-surface-secondary)] border-[var(--color-border)] text-[var(--color-text-secondary)]"
                        }`}
                >
                    {tag.label}
                </span>
            ))}
        </div>
    );
}

function LegalHero({
    eyebrow, titleLine1, titleLine2, tags,
}: {
    eyebrow: string;
    titleLine1: string;
    titleLine2: string;
    tags: Array<{ label: string; green?: boolean }>;
}) {
    return (
        <div className="pb-14 border-b border-[var(--color-border)] mb-14">
            <Eyebrow>{eyebrow}</Eyebrow>
            <h1 className="text-[clamp(32px,5vw,52px)] font-black tracking-[-0.04em] leading-none text-[var(--color-text-primary)] mb-6">
                {titleLine1}
                <br />
                <span className="text-[var(--color-accent)]">{titleLine2}</span>
            </h1>
            <LegalMeta tags={tags} />
        </div>
    );
}

// ─── About Page ───────────────────────────────────────────────────────────────

function AboutPage() {
    return (
        <div className="animate-fade-in-up">
            {/* ── Hero ── */}
            <section className="relative px-4 sm:px-6 lg:px-8 pt-24 pb-20 text-center overflow-hidden home-page-bg">
                <div className="home-hero-grid pointer-events-none absolute inset-0" />
                <HeroBlobBackground />
                <div className="relative z-10">
                    <Eyebrow>Our story</Eyebrow>
                    <h1 className="text-[clamp(36px,5.5vw,64px)] font-black leading-[1.05] tracking-[-0.04em] text-[var(--color-text-primary)] mb-6">
                        We built Jimvio because
                        <br />
                        <span className="text-[var(--color-accent)]">creators deserved better.</span>
                    </h1>
                    <p className="text-base sm:text-lg font-light text-[var(--color-text-secondary)] max-w-[500px] mx-auto mb-10 leading-relaxed">
                        We envisioned a world where any person — a student in Kigali, a designer in Lagos,
                        a seller in Jakarta — can build a sustainable digital income without gatekeepers,
                        massive budgets, or millions of followers. So we built Jimvio.
                    </p>
                    {/* Pills: only PDF-verified claims */}
                    <div className="flex items-center justify-center gap-2 flex-wrap">
                        {[
                            { label: "Founded 2023" },
                            { label: "50+ countries served" },
                            { label: "Free to start" },
                        ].map((pill) => (
                            <div
                                key={pill.label}
                                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-[var(--color-border)] text-sm font-medium text-[var(--color-text-secondary)]"
                                style={{ background: "rgb(var(--color-surface) / 0.8)" }}
                            >
                                {pill.label}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Impact Stats — single source: PLATFORM_STATS ── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 border-y border-[var(--color-border)] divide-x divide-[var(--color-border)]">
                {IMPACT_STATS.map((s) => (
                    <div key={s.label} className="bg-[var(--color-surface)] py-8 px-6 text-center">
                        <div className="text-4xl font-black tracking-tight text-[var(--color-accent)] leading-none mb-1.5">
                            {s.value}
                        </div>
                        <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
                            {s.label}
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Mission ── */}
            <div className="section-padding container-max">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-start">
                    <div>
                        <Eyebrow>Mission</Eyebrow>
                        <h2 className="text-[clamp(24px,3.5vw,38px)] font-black leading-tight tracking-[-0.03em] text-[var(--color-text-primary)] mb-5">
                            The creator economy should work for everyone.
                        </h2>
                        <p className="text-base font-light text-[var(--color-text-secondary)] leading-relaxed mb-4">
                            Most platforms were built for creators in the US and Europe. Everyone else was an
                            afterthought — stuck with currency restrictions, blocked payment methods, and fees
                            that made no sense.
                        </p>
                        <p className="text-base font-light text-[var(--color-text-secondary)] leading-relaxed">
                            Jimvio was built from day one to be borderless. Not as a feature — as a founding
                            principle. Our mission: make earning online transparent, accessible, and rewarding
                            for every creator and seller on the planet.
                        </p>
                    </div>
                    <div
                        className="rounded-[var(--radius-xl)] border border-[var(--color-accent)]/15 p-7"
                        style={{ background: "rgb(var(--color-accent-light) / 0.4)" }}
                    >
                        <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--color-accent)] mb-5">
                            Our commitment
                        </p>
                        <div className="flex flex-col gap-4">
                            {COMMITMENTS.map((item) => (
                                <div key={item} className="flex items-start gap-3">
                                    <CheckIcon />
                                    <p className="text-sm font-light text-[var(--color-text-secondary)] leading-relaxed">{item}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <SectionDivider />

            {/* ── Values ── */}
            <div className="section-padding container-max">
                <Eyebrow>Our values</Eyebrow>
                <h2 className="text-[clamp(22px,3vw,34px)] font-black tracking-[-0.03em] text-[var(--color-text-primary)] mb-3">
                    What we believe in
                </h2>
                <p className="text-base font-light text-[var(--color-text-secondary)] max-w-md leading-relaxed mb-12">
                    These aren't wall posters. They're the decisions we make every day when building Jimvio.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                    {VALUES.map((v) => (
                        <div
                            key={v.title}
                            className="premium-card p-7 group hover:-translate-y-1 transition-transform duration-200"
                        >
                            <div className="w-10 h-10 rounded-[var(--radius-md)] bg-[var(--color-accent-light)] border border-[var(--color-accent)]/15 flex items-center justify-center mb-5">
                                {v.icon}
                            </div>
                            <h3 className="text-sm font-bold tracking-tight text-[var(--color-text-primary)] mb-2">{v.title}</h3>
                            <p className="text-sm font-light text-[var(--color-text-secondary)] leading-relaxed">{v.body}</p>
                        </div>
                    ))}
                </div>
            </div>

            <SectionDivider />

            {/* ── Team ── */}
            {/* No individual bios in official documentation — section preserved with verified copy only */}
            <div className="section-padding container-max">
                <Eyebrow>The team</Eyebrow>
                <h2 className="text-[clamp(22px,3vw,34px)] font-black tracking-[-0.03em] text-[var(--color-text-primary)] mb-3">
                    Built by creators, for creators
                </h2>
                <p className="text-base font-light text-[var(--color-text-secondary)] max-w-md leading-relaxed mb-12">
                    We exist to make earning online accessible to everyone — regardless of location, audience
                    size, or background. Every feature we ship is guided by one question: does this help
                    creators earn more?
                </p>
                {/* Headcount "18 people / 9 countries" removed — not in official docs */}
                <div className="flex items-center justify-between gap-4 px-6 py-4 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)]">
                    <p className="text-sm font-light text-[var(--color-text-secondary)]">
                        We're a{" "}
                        <strong className="font-semibold text-[var(--color-text-primary)]">
                            globally distributed, remote-first team.
                        </strong>{" "}
                        Always hiring.
                    </p>
                    <button className="btn-premium border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] hover:border-[var(--color-border-strong)] flex-shrink-0 gap-2 text-sm">
                        See open roles
                        <ArrowRight size={14} />
                    </button>
                </div>
            </div>

            <CtaSection />
        </div>
    );
}

// ─── Privacy Page ─────────────────────────────────────────────────────────────

function PrivacyPage() {
    return (
        <div className="page-enter">
            <div className="max-w-7xl mx-auto px-10 pt-20 pb-28">
                <LegalHero
                    eyebrow="Legal"
                    titleLine1="Privacy"
                    titleLine2="Policy"
                    tags={[
                        { label: "Effective May 06, 2026" },
                        { label: "✓ GDPR Compliant", green: true },
                        { label: "✓ CCPA Compliant", green: true },
                    ]}
                />

                <SectionBlock title="Our Commitment">
                    <p className="text-[15px] text-[var(--color-text-secondary)] leading-[1.75] font-light mb-3.5">
                        Jimvio is committed to protecting your privacy and handling your personal data with the
                        highest standards of transparency and security.
                    </p>
                    <HighlightBox>
                        Jimvio does not sell your personal data — ever. This is a core policy, not a legal technicality.
                    </HighlightBox>
                </SectionBlock>

                <SectionBlock title="01 — Information We Collect">
                    {/* FIX: now includes Cookie & Tracking row */}
                    <DataTable headers={["Category", "Examples", "Purpose"]} rows={DATA_COLLECTION_ROWS} />
                </SectionBlock>

                <SectionBlock title="02 — How We Use Your Data">
                    {/* FIX: now includes "Detect and prevent ToS violations" */}
                    <LegalList items={PRIVACY_USE_ITEMS} />
                </SectionBlock>

                <SectionBlock title="03 — Data Sharing & Third Parties">
                    <p className="text-[15px] text-[var(--color-text-secondary)] leading-[1.75] font-light mb-3.5">
                        We share data only with trusted third parties essential to platform operations, and only
                        to the extent strictly necessary. All partners are bound by data processing agreements.
                    </p>
                    <DataTable headers={["Recipient", "Purpose", "Data Shared"]} rows={DATA_SHARING_ROWS} />
                </SectionBlock>

                <SectionBlock title="04 — Your Privacy Rights">
                    {/* FIX: now includes Right to Withdraw Consent */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-5">
                        {PRIVACY_RIGHTS.map((r) => (
                            <div
                                key={r.title}
                                className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[14px] p-[22px_24px] transition-all duration-200 cursor-default hover:border-[var(--color-accent)]/25 hover:-translate-y-0.5"
                            >
                                <div className="text-sm font-bold text-[var(--color-text-primary)] mb-1.5 tracking-[-0.015em]">
                                    {r.title}
                                </div>
                                <p className="text-[13px] text-[var(--color-text-secondary)] leading-relaxed font-light">
                                    {r.description}
                                </p>
                            </div>
                        ))}
                    </div>
                    <p className="mt-6 text-sm text-[var(--color-text-secondary)] font-light">
                        To exercise any right, contact{" "}
                        <span className="text-[var(--color-accent)] font-medium">info@jimvio.com</span> or go to
                        Settings → Privacy. We respond within 30 days.
                    </p>
                </SectionBlock>

                <SectionBlock title="05 — Data Security">
                    <LegalList items={SECURITY_ITEMS} variant="check" />
                </SectionBlock>

                <SectionBlock title="06 — Data Retention">
                    <p className="text-[15px] text-[var(--color-text-secondary)] leading-[1.75] font-light">
                        We retain your data as long as your account is active or as required by law. Upon account
                        deletion, personal data is removed within 90 days. Financial transaction records are
                        retained for 7 years as required by international tax regulations. Anonymized analytics
                        data may be retained indefinitely.
                    </p>
                </SectionBlock>

                <p className="text-[13px] text-[var(--color-text-muted)] pt-10 border-t border-[var(--color-border)]">
                    Questions? Contact us at info@jimvio.com · jimvio.com/privacy
                </p>
            </div>
        </div>
    );
}

// ─── Terms Page ───────────────────────────────────────────────────────────────

function TermsPage() {
    return (
        <div className="page-enter">
            <div className="max-w-7xl mx-auto px-10 pt-20 pb-28">
                <LegalHero
                    eyebrow="Legal"
                    titleLine1="Terms of"
                    titleLine2="Service"
                    tags={[{ label: "Version 1.0" }, { label: "Effective May 06, 2026" }]}
                />

                <SectionBlock title="Agreement">
                    <p className="text-[15px] text-[var(--color-text-secondary)] leading-[1.75] font-light">
                        By accessing or using the Jimvio platform, you agree to be bound by these Terms of
                        Service. This is a legally binding agreement between you and Jimvio. If you do not agree,
                        you must not use the platform. We may update these Terms at any time; continued use
                        constitutes acceptance.
                    </p>
                </SectionBlock>

                <SectionBlock title="01 — Eligibility">
                    <LegalList
                        items={[
                            "Be at least 18 years of age, or the age of majority in your jurisdiction.",
                            "Have the legal capacity to enter into a binding contract under applicable law.",
                            "Not be prohibited from using the platform under any local or international law.",
                            "Provide accurate, complete, and up-to-date registration information at all times.",
                            "Maintain the security and confidentiality of your account credentials.",
                        ]}
                    />
                </SectionBlock>

                <SectionBlock title="02 — Account Security">
                    <p className="text-[15px] text-[var(--color-text-secondary)] leading-[1.75] font-light">
                        You are solely responsible for maintaining the confidentiality of your account
                        credentials. Notify Jimvio immediately at{" "}
                        <span className="text-[var(--color-accent)] font-medium">info@jimvio.com</span> of any
                        unauthorized access. You may not create multiple accounts, use bots to register, or
                        transfer your account without express written permission.
                    </p>
                </SectionBlock>

                <SectionBlock title="03 — Prohibited Conduct">
                    <LegalList items={PROHIBITED_CONDUCT_ITEMS} variant="cross" />
                </SectionBlock>

                <SectionBlock title="04 — Intellectual Property">
                    <p className="text-[15px] text-[var(--color-text-secondary)] leading-[1.75] font-light">
                        All Jimvio platform content, branding, code, and designs are the exclusive intellectual
                        property of Jimvio. Users retain ownership of original content they create. By submitting
                        content, users grant Jimvio a worldwide, royalty-free, non-exclusive license to use and
                        display it in connection with platform operations.
                    </p>
                </SectionBlock>

                <SectionBlock title="05 — Limitation of Liability">
                    <p className="text-[15px] text-[var(--color-text-secondary)] leading-[1.75] font-light">
                        To the maximum extent permitted by law, Jimvio shall not be liable for indirect,
                        incidental, special, consequential, or punitive damages arising from your use of the
                        platform. Jimvio's total aggregate liability shall not exceed amounts paid by you to
                        Jimvio in the twelve months preceding the claim.
                    </p>
                </SectionBlock>

                <SectionBlock title="06 — Governing Law & Disputes">
                    <p className="text-[15px] text-[var(--color-text-secondary)] leading-[1.75] font-light">
                        These Terms shall be governed by applicable international commercial law. Disputes shall
                        first be subject to good faith negotiation. Unresolved disputes are submitted to binding
                        arbitration. Nothing prevents either party from seeking urgent injunctive relief from a
                        court of competent jurisdiction.
                    </p>
                </SectionBlock>

                {/* ADDED: Seller & Creator section from PDF p.11-12 */}
                <SectionBlock title="07 — Seller & Creator Rules">
                    <p className="text-[15px] text-[var(--color-text-secondary)] leading-[1.75] font-light mb-5">
                        Sellers must complete identity verification and be legally authorized to sell listed
                        products. Sellers must be 18+ and agree to the Seller Terms. Platform fees apply to all
                        transactions:
                    </p>
                    <DataTable
                        headers={["Fee Type", "Amount", "Notes"]}
                        rows={SELLER_FEES_ROWS}
                    />
                    <p className="mt-6 text-[15px] text-[var(--color-text-secondary)] leading-[1.75] font-light">
                        Creators may monetize through campaigns, affiliate commissions, direct product sales, and
                        community memberships. KYC (Know Your Customer) verification is required before receiving
                        payouts above applicable thresholds.
                    </p>
                </SectionBlock>

                {/* ADDED: Affiliate commission structure from PDF p.9 */}
                <SectionBlock title="08 — Affiliate Program">
                    <p className="text-[15px] text-[var(--color-text-secondary)] leading-[1.75] font-light mb-5">
                        Affiliates earn commissions by promoting products via unique tracking links.
                        Commissions are tracked in real-time and paid on a NET-30 schedule.
                        Attribution uses a 30-day cookie window. Self-referrals are never eligible.
                    </p>
                    <DataTable4
                        headers={["Category", "Commission Rate", "Notes", ""]}
                        rows={AFFILIATE_COMMISSION_ROWS}
                    />
                    <div className="mt-5">
                        <LegalList items={AFFILIATE_OBLIGATIONS} />
                    </div>
                </SectionBlock>

                <p className="text-[13px] text-[var(--color-text-muted)] pt-10 border-t border-[var(--color-border)]">
                    Legal inquiries: info@jimvio.com · jimvio.com/terms · Version 1.0 · May 06, 2026
                </p>
            </div>
        </div>
    );
}

// ─── Cookies Page ─────────────────────────────────────────────────────────────

function CookiesPage() {
    return (
        <div className="page-enter">
            <div className="max-w-7xl mx-auto px-10 pt-20 pb-28">
                <LegalHero
                    eyebrow="Legal"
                    titleLine1="Cookie"
                    titleLine2="Policy"
                    tags={[
                        { label: "Effective May 06, 2026" },
                        { label: "✓ GDPR Compliant", green: true },
                    ]}
                />

                <SectionBlock title="What Are Cookies?">
                    <p className="text-[15px] text-[var(--color-text-secondary)] leading-[1.75] font-light">
                        Cookies are small text files placed on your device when you visit a website. They help
                        websites remember your preferences, maintain login sessions, and analyze usage patterns.
                        Jimvio uses cookies to keep you signed in, remember your settings, understand how the
                        platform is used, and show you relevant content. You are always in control of
                        non-essential cookies.
                    </p>
                </SectionBlock>

                <SectionBlock title="Cookies We Use">
                    {/* FIX: cards now show optOut field from PDF */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-5">
                        {COOKIE_CARDS.map((c) => (
                            <div
                                key={c.name}
                                className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[14px] p-[22px_24px] transition-colors duration-200 hover:border-[var(--color-border-strong)]"
                            >
                                <div className="flex items-center justify-between mb-2.5">
                                    <span className="text-[15px] font-bold text-[var(--color-text-primary)] tracking-[-0.02em]">
                                        {c.name}
                                    </span>
                                    <span
                                        className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full tracking-[0.04em] ${c.required
                                                ? "bg-[rgba(253,80,0,0.12)] text-[#fd6a20]"
                                                : "bg-[rgba(0,0,0,0.05)] text-[var(--color-text-muted)]"
                                            }`}
                                    >
                                        {c.required ? "Required" : "Optional"}
                                    </span>
                                </div>
                                <p className="text-[13px] text-[var(--color-text-secondary)] leading-relaxed font-light mb-2.5">
                                    {c.description}
                                </p>
                                <p className="text-[12px] text-[var(--color-text-muted)] mb-1">
                                    Duration: {c.duration}
                                </p>
                                <p className="text-[12px] text-[var(--color-text-muted)]">
                                    Opt-out: {c.optOut}
                                </p>
                            </div>
                        ))}
                    </div>
                </SectionBlock>

                <SectionBlock title="Your Cookie Choices">
                    <p className="text-[15px] text-[var(--color-text-secondary)] leading-[1.75] font-light mb-4">
                        You are always in control. Manage your preferences at any time:
                    </p>
                    <LegalList
                        items={[
                            "Go to Settings → Privacy → Cookie Preferences inside your Jimvio account.",
                            "Visit jimvio.com/cookie-settings at any time — no login required.",
                            "Adjust your browser settings to block or delete cookies at the device level.",
                        ]}
                    />
                    <HighlightBox>
                        Disabling required cookies (Session and Security) will prevent you from logging in and
                        using the platform. All other cookies are fully optional and can be toggled independently.
                    </HighlightBox>
                </SectionBlock>

                <SectionBlock title="Third-Party Cookies">
                    <p className="text-[15px] text-[var(--color-text-secondary)] leading-[1.75] font-light">
                        Some third-party services — such as analytics providers and payment processors — may set
                        their own cookies on your device. These are governed by the respective third-party privacy
                        policies. Jimvio ensures all partners are bound by data processing agreements that meet
                        our privacy standards.
                    </p>
                </SectionBlock>

                {/* ADDED: Advertising standards from PDF p.20 */}
                <SectionBlock title="Advertising & Creator Disclosure Standards">
                    <p className="text-[15px] text-[var(--color-text-secondary)] leading-[1.75] font-light mb-4">
                        All promotional content on Jimvio must meet these advertising standards:
                    </p>
                    <LegalList items={ADVERTISING_STANDARDS} />
                    <p className="text-[15px] text-[var(--color-text-secondary)] leading-[1.75] font-light mt-6 mb-3">
                        Creator disclosure requirements (FTC & international regulations):
                    </p>
                    <LegalList items={CREATOR_DISCLOSURE_ITEMS} variant="check" />
                </SectionBlock>

                {/* ADDED: DMCA procedure from PDF p.20-21 */}
                <SectionBlock title="Copyright & DMCA">
                    <p className="text-[15px] text-[var(--color-text-secondary)] leading-[1.75] font-light mb-4">
                        Jimvio respects intellectual property rights. To file a copyright infringement notice,
                        submit the following to{" "}
                        <span className="text-[var(--color-accent)] font-medium">copyright@jimvio.com</span>:
                    </p>
                    <LegalList items={DMCA_REQUIRED_FIELDS} />
                    <p className="text-[15px] text-[var(--color-text-secondary)] leading-[1.75] font-light mt-5">
                        Users with repeated valid copyright violations will have their accounts permanently
                        terminated. Jimvio maintains a strike-based system aligned with DMCA safe harbor
                        provisions. If you believe your content was removed in error, you may file a
                        counter-notice and content will be restored after the required waiting period.
                    </p>
                </SectionBlock>

                <SectionBlock title="Policy Updates">
                    <p className="text-[15px] text-[var(--color-text-secondary)] leading-[1.75] font-light">
                        We may update this Cookie Policy to reflect changes in our practices or applicable
                        regulations. We will notify you of significant changes via platform notice or email.
                        Continued use after the effective date constitutes acceptance.
                    </p>
                </SectionBlock>

                <p className="text-[13px] text-[var(--color-text-muted)] pt-10 border-t border-[var(--color-border)]">
                    Cookie questions? Contact info@jimvio.com · Manage: jimvio.com/cookie-settings ·
                    Copyright: copyright@jimvio.com
                </p>
            </div>
        </div>
    );
}

// ─── Refund & Payout Page (PDF p.19) — NEW ────────────────────────────────────
// ADDED: entire page was missing — PDF devotes a full section to this

function RefundPayoutPage() {
    return (
        <div className="page-enter">
            <div className="max-w-7xl mx-auto px-10 pt-20 pb-28">
                <LegalHero
                    eyebrow="Legal"
                    titleLine1="Refund &"
                    titleLine2="Payout Policy"
                    tags={[{ label: "Effective May 06, 2026" }]}
                />

                <SectionBlock title="Buyer Refund Policy">
                    <DataTable4
                        headers={["Product Type", "Refund Window", "Conditions", ""]}
                        rows={REFUND_ROWS}
                    />
                </SectionBlock>

                <SectionBlock title="Seller & Creator Payout Policy">
                    <LegalList items={PAYOUT_POLICY_ITEMS} />
                </SectionBlock>

                <SectionBlock title="Chargeback & Dispute Resolution">
                    <p className="text-[15px] text-[var(--color-text-secondary)] leading-[1.75] font-light">
                        In the event of a buyer chargeback, Jimvio will temporarily hold associated seller
                        earnings pending resolution. Sellers may submit evidence to dispute chargebacks through
                        the dashboard. Excessive chargebacks (above 1% of monthly volume) may result in account
                        review.
                    </p>
                </SectionBlock>

                <p className="text-[13px] text-[var(--color-text-muted)] pt-10 border-t border-[var(--color-border)]">
                    Questions? Contact info@jimvio.com · jimvio.com/refunds-payouts
                </p>
            </div>
        </div>
    );
}

// ─── Community Guidelines Page (PDF p.15-16) — NEW ───────────────────────────
// ADDED: entire page was missing

function CommunityPage() {
    return (
        <div className="page-enter">
            <div className="max-w-7xl mx-auto px-10 pt-20 pb-28">
                <LegalHero
                    eyebrow="Community"
                    titleLine1="Community"
                    titleLine2="Guidelines"
                    tags={[{ label: "Effective May 06, 2026" }]}
                />

                <SectionBlock title="What We Encourage">
                    <LegalList items={COMMUNITY_ENCOURAGED} variant="check" />
                </SectionBlock>

                <SectionBlock title="Strictly Prohibited">
                    <DataTable
                        headers={["Violation", "Description", "Enforcement"]}
                        rows={COMMUNITY_PROHIBITED_ROWS}
                    />
                </SectionBlock>

                <SectionBlock title="Enforcement Levels">
                    <DataTable
                        headers={["Level", "Action", "Trigger"]}
                        rows={ENFORCEMENT_ROWS}
                    />
                    <p className="mt-5 text-sm text-[var(--color-text-secondary)] font-light">
                        Use the 'Report' button on any content, profile, or message to flag violations. Our
                        moderation team reviews all reports within 48 hours. For urgent safety concerns, contact{" "}
                        <span className="text-[var(--color-accent)] font-medium">safety@jimvio.com</span>.
                    </p>
                </SectionBlock>

                <p className="text-[13px] text-[var(--color-text-muted)] pt-10 border-t border-[var(--color-border)]">
                    Safety concerns: safety@jimvio.com · jimvio.com/community-guidelines
                </p>
            </div>
        </div>
    );
}

// ─── Prohibited Products Page (PDF p.17-18) — NEW ────────────────────────────
// ADDED: entire page was missing

function ProhibitedProductsPage() {
    return (
        <div className="page-enter">
            <div className="max-w-7xl mx-auto px-10 pt-20 pb-28">
                <LegalHero
                    eyebrow="Policy"
                    titleLine1="Prohibited"
                    titleLine2="Products & Services"
                    tags={[{ label: "Effective May 06, 2026" }]}
                />

                <HighlightBox>
                    Listings violating this policy are removed immediately without notice. Repeat violations
                    result in permanent account termination and may be reported to relevant authorities.
                </HighlightBox>

                <div className="mt-10">
                    <SectionBlock title="Illegal Items">
                        <LegalList items={PROHIBITED_PRODUCTS.illegal} variant="cross" />
                    </SectionBlock>
                    <SectionBlock title="Harmful & Dangerous Products">
                        <LegalList items={PROHIBITED_PRODUCTS.harmful} variant="cross" />
                    </SectionBlock>
                    <SectionBlock title="Adult & Restricted Content">
                        <LegalList items={PROHIBITED_PRODUCTS.adult} variant="cross" />
                    </SectionBlock>
                    <SectionBlock title="Digital Fraud & Scams">
                        <LegalList items={PROHIBITED_PRODUCTS.digitalFraud} variant="cross" />
                    </SectionBlock>
                    <SectionBlock title="Intellectual Property Violations">
                        <LegalList items={PROHIBITED_PRODUCTS.ip} variant="cross" />
                    </SectionBlock>
                    <SectionBlock title="Restricted by Jurisdiction">
                        <LegalList items={PROHIBITED_PRODUCTS.jurisdictional} variant="cross" />
                    </SectionBlock>
                </div>

                <p className="text-[13px] text-[var(--color-text-muted)] pt-10 border-t border-[var(--color-border)]">
                    Report a listing: info@jimvio.com · jimvio.com/prohibited-products
                </p>
            </div>
        </div>
    );
}

export {
    AboutPage,
    PrivacyPage,
    TermsPage,
    CookiesPage,
    RefundPayoutPage,
    CommunityPage,
    ProhibitedProductsPage,
};