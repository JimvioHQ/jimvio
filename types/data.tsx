import {
    ShoppingCart,
    Link2,
    Clapperboard,
    Users,
    BarChart2,
    Banknote,
} from "lucide-react";
import type {
    FeatureItem,
    StepItem,
    WhyItem,
    TableRow,
    RightCard,
    CookieCard,
} from "@/types";

export const NAV_LINKS: { id: string; label: string }[] = [
    { id: "about", label: "About" },
    { id: "privacy", label: "Privacy Policy" },
    { id: "terms", label: "Terms of Service" },
    { id: "cookies", label: "Cookie Policy" },
];

export const STATS = [
    { num: "10k", suffix: "+", label: "Active Creators" },
    { num: "$1M", suffix: "+", label: "Paid to Creators" },
    { num: "50", suffix: "+", label: "Countries Served" },
    { num: "99.9", suffix: "%", label: "Platform Uptime" },
];

export const FEATURES: FeatureItem[] = [
    {
        icon: <ShoppingCart size={22} strokeWidth={1.6} />,
        title: "Global Marketplace",
        description:
            "Buy and sell physical and digital products worldwide. Integrated payment processing with verified vendor badges builds trust at scale.",
    },
    {
        icon: <Link2 size={22} strokeWidth={1.6} />,
        title: "Affiliate System",
        description:
            "Promote any Jimvio product and earn commissions up to 50%. Real-time dashboard, transparent payout history — no inventory required.",
    },
    {
        icon: <Clapperboard size={22} strokeWidth={1.6} />,
        title: "UGC & Clipping Campaigns",
        description:
            "Brands launch campaigns daily. Submit short-form content and earn per approval or per 1,000 verified views. No followers needed.",
    },
    {
        icon: <Users size={22} strokeWidth={1.6} />,
        title: "Niche Communities",
        description:
            "Spaces for buyers, sellers, and creators to network, share insights, and unlock exclusive group deals that benefit everyone.",
    },
    {
        icon: <BarChart2 size={22} strokeWidth={1.6} />,
        title: "Analytics Dashboard",
        description:
            "Complete performance analytics — earnings, click-through rates, campaign metrics, and affiliate conversions tracked live.",
    },
    {
        icon: <Banknote size={22} strokeWidth={1.6} />,
        title: "Secure Global Payouts",
        description:
            "Withdraw via Stripe, PayPal, bank transfer, or mobile money. Built for Africa, Southeast Asia, and beyond. 50+ countries.",
    },
];

export const STEPS: StepItem[] = [
    {
        number: "01",
        title: "Join Jimvio",
        description: "Create your free account in under 60 seconds. No credit card required. No hidden fees.",
    },
    {
        number: "02",
        title: "Pick Your Path",
        description: "Browse marketplace products to promote, or explore live brand campaigns tailored to your niche.",
    },
    {
        number: "03",
        title: "Promote or Create",
        description: "Share your unique affiliate link, or film and submit UGC content from any device — your phone is enough.",
    },
    {
        number: "04",
        title: "Earn & Withdraw",
        description: "Track earnings in real-time. Withdraw to your preferred payment method once you hit the $20 minimum.",
    },
];

export const WHY_ITEMS: WhyItem[] = [
    { title: "All-in-one login.", body: "Marketplace, affiliate, campaigns, and communities — no switching between apps or dashboards." },
    { title: "No followers required.", body: "Anyone can join a campaign and get paid from day one. Your phone is your studio." },
    { title: "Global payouts.", body: "Mobile money for Africa and Southeast Asia. Stripe, PayPal, and bank transfer everywhere else." },
    { title: "Real-time tracking.", body: "Every click, sale, and view tracked live with full transparency. No black-box commission systems." },
    { title: "Free to start.", body: "Zero setup fees, no credit card, no hidden subscription costs. Jimvio earns when you earn." },
    { title: "Verified trust.", body: "Verified vendors and creators at every layer. Brand campaigns launching daily across all niches." },
];

export const DATA_COLLECTION_ROWS: TableRow[] = [
    { col1: "Account Data", col2: "Name, email, username, password", col3: "Authentication" },
    { col1: "Profile Data", col2: "Bio, photo, country, social handles", col3: "Public creator profile" },
    { col1: "Financial Data", col2: "Payout details, transaction history", col3: "Payments & payouts" },
    { col1: "Usage Data", col2: "Pages visited, clicks, session duration", col3: "Analytics & improvement" },
    { col1: "Content Data", col2: "Posts, campaign submissions, listings", col3: "Platform functionality" },
    { col1: "Support Data", col2: "Tickets, messages, feedback", col3: "Customer support" },
];

export const DATA_SHARING_ROWS: TableRow[] = [
    { col1: "Payment Processors", col2: "Execute transactions and payouts", col3: "Financial data only" },
    { col1: "Analytics Providers", col2: "Understand platform usage", col3: "Anonymized usage data" },
    { col1: "Cloud Infrastructure", col2: "Host platform data securely", col3: "Encrypted storage" },
    { col1: "Legal Authorities", col2: "Comply with lawful requests", col3: "As required by law" },
];

export const PRIVACY_RIGHTS: RightCard[] = [
    { title: "Right to Access", description: "Request a complete copy of all personal data we hold about you." },
    { title: "Right to Rectification", description: "Correct any inaccurate or incomplete information in your profile." },
    { title: "Right to Erasure", description: "Request full deletion of your account and all associated data." },
    { title: "Right to Portability", description: "Export your data in a machine-readable format (JSON/CSV) anytime." },
    { title: "Right to Object", description: "Opt out of marketing or non-essential data processing instantly." },
    { title: "Right to Restrict", description: "Limit how we use your data during disputes or active verification." },
];

export const PRIVACY_USE_ITEMS = [
    "Create and manage your account and platform access.",
    "Process transactions, calculate commissions, and execute payouts reliably.",
    "Verify creator and seller identity and prevent fraud and abuse.",
    "Display relevant products, campaigns, and community recommendations.",
    "Send transactional emails: account activity alerts, payout confirmations.",
    "Send marketing communications — only with your explicit consent.",
    "Analyze platform performance and continuously improve user experience.",
    "Comply with legal obligations and respond to lawful law enforcement requests.",
];

export const SECURITY_ITEMS = [
    "All data transmitted via TLS/SSL encryption — never in plaintext.",
    "Passwords hashed with industry-standard bcrypt/Argon2 algorithms.",
    "Payment details tokenized — never stored in plaintext on our systems.",
    "Ongoing security audits and penetration testing by independent specialists.",
    "Personal data accessible only to authorized personnel on a need-to-know basis.",
    "Dedicated breach response team with documented incident response protocol.",
];

export const PROHIBITED_ITEMS = [
    "Engaging in scams, fraud, deceptive practices, or any form of financial dishonesty.",
    "Sending spam, unsolicited messages, or mass promotional communications.",
    "Generating fake traffic, artificial clicks, bot activity, or fraudulent conversions.",
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

export const COOKIE_CARDS: CookieCard[] = [
    {
        name: "Session Cookies",
        required: true,
        description: "Maintain your login state while you navigate the platform. Essential for security and core functionality.",
        duration: "Session end · Cannot be disabled",
    },
    {
        name: "Security Cookies",
        required: true,
        description: "Real-time fraud detection and account protection. Essential to keeping your account safe.",
        duration: "Session end · Cannot be disabled",
    },
    {
        name: "Preference Cookies",
        required: false,
        description: "Remember your display settings, language preferences, and other platform customizations.",
        duration: "1 year · Can be disabled in settings",
    },
    {
        name: "Analytics (1st party)",
        required: false,
        description: "Help us understand how creators and sellers use Jimvio so we can improve features over time.",
        duration: "2 years · Can be disabled",
    },
    {
        name: "Analytics (3rd party)",
        required: false,
        description: "External traffic analysis tools that help us understand where visitors come from and how they interact.",
        duration: "2 years · Can be disabled",
    },
    {
        name: "Marketing Cookies",
        required: false,
        description: "Enable personalized promotions and relevant campaign recommendations. Only set with your explicit consent.",
        duration: "90 days · Consent required",
    },
];