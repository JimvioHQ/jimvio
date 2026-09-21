export const SUPPORTED_CURRENCIES = {
  RWF: { name: "Rwandan Franc", symbol: "RWF", country: "Rwanda", gateway: "flutterwave" },
  KES: { name: "Kenyan Shilling", symbol: "KSh", country: "Kenya", gateway: "nowpayments" },
  UGX: { name: "Ugandan Shilling", symbol: "USh", country: "Uganda", gateway: "nowpayments" },
  TZS: { name: "Tanzanian Shilling", symbol: "TSh", country: "Tanzania", gateway: "nowpayments" },
  NGN: { name: "Nigerian Naira", symbol: "₦", country: "Nigeria", gateway: "flutterwave" },
  GHS: { name: "Ghanaian Cedi", symbol: "GH₵", country: "Ghana", gateway: "flutterwave" },
  USD: { name: "US Dollar", symbol: "$", country: "Global", gateway: "nowpayments" },
  EUR: { name: "Euro", symbol: "€", country: "Europe", gateway: "stripe" },
  GBP: { name: "British Pound", symbol: "£", country: "United Kingdom", gateway: "stripe" },
} as const;

export type CurrencyCode = keyof typeof SUPPORTED_CURRENCIES;

export const BASE_CURRENCY: CurrencyCode = "USD";
