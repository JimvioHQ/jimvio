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
export * from './checkout';
export * from './chat';
export * from './library';