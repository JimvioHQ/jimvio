export interface FeatureItem {
    icon: React.ReactNode;
    title: string;
    description: string;
}

export interface StepItem {
    number: string;
    title: string;
    description: string;
}

export interface WhyItem {
    title: string;
    body: string;
}

export interface TableRow {
    col1: string;
    col2: string;
    col3: string;
}

export interface RightCard {
    title: string;
    description: string;
}

export interface CookieCard {
    name: string;
    required: boolean;
    description: string;
    duration: string;
}


// Shared types for HeroBanner — no server or client imports
export type HeroProduct = {
  id:                        string;
  name:                      string;
  slug:                      string;
  price:                     number;
  compare_at_price:          number | null;
  discount_label:            string | null;
  images:                    unknown;
  short_description:         string | null;
  affiliate_commission_rate: number | null;
  sale_count:                number | null;
  claimed_pct:               number | null;
  product_type:              string;
  rating:                    number | null;
  review_count:              number | null;
  is_featured?:              boolean | null;
  is_flash_deal?:            boolean | null;
};

export * from './checkout';
export * from './chat';
export * from './library';