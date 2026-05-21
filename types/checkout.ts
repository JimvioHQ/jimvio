export type CJShippingOption = {
    optionId: string;
    channelId: string;
    name: string;
    arrivalDays: string;
    priceUSD: number;
};

interface CheckoutExperienceProps {
    orders: CartOrder[];
    profile: { full_name: string | null; email: string | null; phone: string | null } | null;
    mode?: "cart" | "community";
    preferredMethod?: string | null;
}


export type CartItem = {
    id: string;
    product_name: string;
    product_image: string | null;
    quantity: number;
    unit_price: number;
    total_price: number;
    product_type?: string;
    pricing_type?: string;
    billing_period?: string;
    product_source?: "vendor" | "shopify" | "cj";
    variant_id?: string;
    cj_vid?: string;
    cj_pid?: string;
    cj_sku?: string;
    variant_weight?: number;
    variant_length?: number;
    variant_width?: number;
    variant_height?: number;
    source_metadata?: {
        cj_vid?: string;
        cj_pid?: string;
        cj_sku?: string;
        cj_weight?: number;
        [key: string]: unknown;
    };
};

export type CartOrder = {
    id: string;
    vendor_id: string | null;
    total_amount: number;
    subtotal: number;
    shipping_amount: number | null;
    currency: string | null;
    status: string;
    payment_status: string;
    order_items: CartItem[];
    vendors: { business_name: string; avatar_url?: string } | null;
    integration_source?: string;
    metadata?: unknown;
    shipping_address?: {
        firstName?: string;
        lastName?: string;
        email?: string;
        phone?: string;
        address1?: string;
        address2?: string;
        city?: string;
        country?: string;
        country_code?: string;
        zip?: string;
    } | null;
    cj_shipping_method?: string | null;
    cj_supplier_cost?: number | null;
};


export interface PaymentApiResponse {
   redirectUrl?: string;
   approvalUrl?: string;
   invoiceUrl?: string;
   redirectURL?: string;
   error?: string | { code: string; details?: unknown };
   message?: string;
}