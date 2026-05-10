import { ActivityItem, Campaign, Community, Product, QuickAction, TickerItem } from "@/types/dashboard";

export const ACTIVITY_ITEMS: ActivityItem[] = [
  {
    icon: "sale",
    iconBg: "#e9f9ef",
    title: "New sale from your link",
    sub: "You earned $24.50",
    time: "2m ago",
    amount: "+$24.50",
    positive: true,
  },
  {
    icon: "check",
    iconBg: "#ede9ff",
    title: "Campaign submission approved",
    sub: "Skincare Routine – UGC Campaign",
    time: "15m ago",
    amount: "+$35.00",
    positive: true,
  },
  {
    icon: "payout",
    iconBg: "#fff3ee",
    title: "Payout initiated",
    sub: "Withdrawal to PayPal",
    time: "1h ago",
    amount: "-$320.00",
    positive: false,
  },
  {
    icon: "member",
    iconBg: "#f0f4ff",
    title: "New community member",
    sub: "Sarah joined your community",
    time: "2h ago",
    amount: null,
    positive: null,
  },
];

export const TOP_CAMPAIGNS: Campaign[] = [
  {
    name: "Nike UGC Campaign",
    badges: ["UGC", "Beginner"],
    earn: "$1,200",
    joined: 124,
    progress: 80,
    imageColor: "#1a1a1a",
    imageInitial: "N",
    id: ""
  },
  {
    name: "Skincare Routine",
    badges: ["UGC", "Easy"],
    earn: "$850",
    joined: 89,
    progress: 60,
    imageColor: "#f9a8d4",
    imageInitial: "S",
    id: ""
  },
];

export const TRENDING_PRODUCTS: Product[] = [
  {
    name: "Canon EOS M50 Mark II",
    category: "Electronics",
    price: "$599.00",
    commission: "12% Commission",
    sold: "1.2k sold",
    imageColor: "#e8e8e8",
    id: ""
  },
  {
    name: "Smart Watch Series 8",
    category: "Accessories",
    price: "$199.00",
    commission: "15% Commission",
    sold: "892 sold",
    imageColor: "#dbeafe",
    id: ""
  },
];

export const COMMUNITIES: Community[] = [
  {
    name: "Content Creators Hub",
    initial: "C",
    color: "#fd5000",
    members: "2.4k",
    online: "134 online",
    lastMessage: "Sarah: New viral strategy dropped",
    time: "2m ago",
    unread: 1,
  },
  {
    name: "Entrepreneur Marketing Net.",
    initial: "E",
    color: "#8b5cf6",
    members: "1.8k",
    online: "98 online",
    lastMessage: "Mike: Let's collaborate!",
    time: "15m ago",
    unread: 0,
  },
  {
    name: "Digital Marketing Pros",
    initial: "D",
    color: "#3b82f6",
    members: "3.1k",
    online: "156 online",
    lastMessage: "Jen: New tool recommendation",
    time: "1h ago",
    unread: 0,
  },
];

export const TICKER_ITEMS: TickerItem[] = [
  { text: "Kevin earned $84", time: "1m ago" },
  { text: "New UGC campaign launched", time: "2m ago" },
  { text: "Sarah joined Tech Creators Hub", time: "3m ago" },
  { text: "Mike earned $120", time: "4m ago" },
  { text: "New product added by Alex", time: "5m ago" },
  { text: "Campaign goal reached by Emma", time: "6m ago" },
  { text: "Nike UGC Campaign trending now", time: "7m ago" },
];

export const QUICK_ACTIONS: QuickAction[] = [
  {
    label: "Create Affiliate Link",
    sub: "Promote any product",
    accentColor: "#fd5000",
    bgColor: "#fff3ee",
  },
  {
    label: "Join Campaign",
    sub: "Earn with UGC content",
    accentColor: "#8b5cf6",
    bgColor: "#ede9ff",
  },
  {
    label: "Browse Products",
    sub: "Find products to promote",
    accentColor: "#30a46c",
    bgColor: "#e9f9ef",
  },
  {
    label: "Create Post",
    sub: "Share with your audience",
    accentColor: "#0284c7",
    bgColor: "#e0f2fe",
  },
  {
    label: "Request Withdrawal",
    sub: "Withdraw your earnings",
    accentColor: "#fd5000",
    bgColor: "#fff3ee",
  },
];

export const EARNINGS_LABELS = [
  "May 1", "May 4", "May 7", "May 10", "May 13",
  "May 16", "May 19", "May 22", "May 25", "May 28", "May 31",
];

export const EARNINGS_DATASETS = [
  {
    label: "Affiliate",
    data: [180, 220, 260, 310, 370, 450, 520, 580, 620, 680, 740],
    color: "#fd5000",
    amount: "$620.00",
  },
  {
    label: "UGC Campaigns",
    data: [80, 110, 140, 190, 230, 280, 340, 390, 420, 480, 520],
    color: "#8b5cf6",
    amount: "$420.00",
  },
  {
    label: "Marketplace",
    data: [40, 55, 70, 90, 100, 120, 150, 160, 170, 190, 210],
    color: "#3b82f6",
    amount: "$180.00",
  },
  {
    label: "Communities",
    data: [10, 15, 20, 30, 40, 55, 60, 65, 70, 75, 90],
    color: "#30a46c",
    amount: "$80.00",
  },
];
