export const SUPPORTED_CURRENCIES = {
  RWF: { name: "Rwandan Franc", symbol: "RWF", country: "Rwanda", gateway: "afripay" },
  KES: { name: "Kenyan Shilling", symbol: "KSh", country: "Kenya", gateway: "pesapal" },
  UGX: { name: "Ugandan Shilling", symbol: "USh", country: "Uganda", gateway: "pesapal" },
  TZS: { name: "Tanzanian Shilling", symbol: "TSh", country: "Tanzania", gateway: "pesapal" },
  NGN: { name: "Nigerian Naira", symbol: "₦", country: "Nigeria", gateway: "pawapay" },
  GHS: { name: "Ghanaian Cedi", symbol: "GH₵", country: "Ghana", gateway: "pawapay" },
  USD: { name: "US Dollar", symbol: "$", country: "Global", gateway: "nowpayments" },
} as const;

export type CurrencyCode = keyof typeof SUPPORTED_CURRENCIES;

export const BASE_CURRENCY: CurrencyCode = "USD";
