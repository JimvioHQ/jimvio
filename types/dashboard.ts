export interface StatCard {
  label: string;
  value: string;
  change: string;
  up: boolean;
  chartColor: string;
  data: number[];
}

export interface ActivityItem {
  icon: string;
  iconBg: string;
  title: string;
  sub: string;
  time: string;
  amount: string | null;
  positive: boolean | null;
}

export interface Campaign {
  id: string;
  slug?: string | null;
  name: string;
  badges: string[];
  earn: string;
  joined: number;
  progress: number;
  imageUrl?: string | null;
  imageColor: string;
  imageInitial: string;
  endsAt?: string | null;
}

export interface Product {
  id: string;
  slug?: string | null;
  name: string;
  category: string;
  price: string;
  commission: string;
  sold: string;
  imageUrl?: string | null;
  imageColor: string;
}

export interface Community {
  id?: string;
  slug?: string | null;
  name: string;
  initial: string;
  color: string;
  members: string;
  online: string;
  lastMessage: string;
  time: string;
  unread: number;
  avatarUrl?: string;
}

export interface TickerItem {
  text: string;
  time: string;
}

export interface QuickAction {
  label: string;
  sub: string;
  accentColor: string;
  bgColor: string;
}
