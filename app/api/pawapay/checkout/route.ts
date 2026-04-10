import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: Request) {
  try {
    const apiToken = process.env.PAWAPAY_API_TOKEN?.trim();
    if (!apiToken) {
      return NextResponse.json({ error: "PAWAPAY_API_TOKEN is not configured" }, { status: 500 });
    }

    const isSandbox = process.env.PAWAPAY_ENV === "sandbox";
    const baseUrl = isSandbox ? "https://api.sandbox.pawapay.io" : "https://api.pawapay.io";

    console.log(`pawaPay: Initiation using API v2 [/v2/paymentpage] in ${process.env.PAWAPAY_ENV} mode`);

    const body = await request.json();
    let { amount, currency, orderId, country } = body;

    // Priority 1: Detect user's current physical location from IP
    let ipCountry = request.headers.get("x-vercel-ip-country") || request.headers.get("cf-ipcountry");
    console.log("pawaPay Headers Detection:", { 
      vercel: request.headers.get("x-vercel-ip-country"), 
      cf: request.headers.get("cf-ipcountry") 
    });
    
    // Fallback for Local Development
    if (!ipCountry || ipCountry === "undefined") {
       try {
         console.log("pawaPay: Attempting Geo-IP fallback fetch...");
         // Using ip-api.com (HTTP) as it's often faster for raw IP probes
         const geoRes = await fetch("http://ip-api.com/json", { cache: "no-store" });
         
         if (geoRes.ok) {
           const geo = await geoRes.json();
           console.log("pawaPay: Geo-IP Response:", geo);
           if (geo.countryCode) {
             ipCountry = geo.countryCode;
             console.log(`pawaPay: Local Dev Detected IP Location: ${ipCountry}`);
           }
         }
       } catch (err: any) {
         console.warn("pawaPay: Geo-IP detection failed:", err.message);
       }
    }

    if (ipCountry && ipCountry.length === 2 && ipCountry !== "undefined") {
       console.log(`pawaPay: Prioritizing physical location [${ipCountry}] over shipping region.`);
       country = ipCountry; 
    }

    if (!amount || !currency) {
      return NextResponse.json({ error: "Amount and currency are required" }, { status: 400 });
    }

    // pawaPay DOES NOT support USD for collection. We must convert to a local currency (e.g., RWF).
    if (currency.toUpperCase() === "USD") {
      const rate = Number(process.env.RWF_TO_USD_RATE) || 0.0008;
      const rwfAmount = amount / rate;
      amount = rwfAmount;
      currency = "RWF";
    }

    // 1. Determine Target Country (Alpha-3)
    const alpha2To3: Record<string, string> = {
      "RW": "RWA", "UG": "UGA", "ZM": "ZMB", "GH": "GHA", "NG": "NGA",
      "KE": "KEN", "ZA": "ZAF", "SN": "SEN", "CM": "CMR", "BJ": "BEN",
      "GA": "GAB", "CG": "COG", "CI": "CIV", "SL": "SLE", "TZ": "TZA",
      "MW": "MWI", "MZ": "MOZ", "LS": "LSO", "BF": "BFA"
    };

    if (country && country.length === 2) {
      country = alpha2To3[country.toUpperCase()] || country;
    }

    // 2. Map Country to Native Currency
    const countryToCurrency: Record<string, string> = {
      "RWA": "RWF", "UGA": "UGX", "ZMB": "ZMW", "GHA": "GHS", "NGA": "NGN",
      "KEN": "KES", "ZAF": "ZAR", "SLE": "SLE", "TZA": "TZS", "MWI": "MWK",
      "MOZ": "MZN", "LSO": "LSL", "SEN": "XOF", "CIV": "XOF", "BEN": "XOF",
      "BFA": "XOF", "CMR": "XAF", "GAB": "XAF", "COG": "XAF"
    };

    // Standardize country or infer from currency if not provided
    if (!country || country.length !== 3) {
      const currencyToCountry: Record<string, string> = {
        "RWF": "RWA", "UGX": "UGA", "ZMW": "ZMB", "GHS": "GHA", "NGN": "NGA",
        "KES": "KEN", "ZAR": "ZAF", "SLE": "SLE", "XOF": "SEN", "XAF": "CMR"
      };
      country = currencyToCountry[currency.toUpperCase()] || "RWA";
    }

    const nativeCurrency = countryToCurrency[country.toUpperCase()] || "RWF";

    // 3. Convert Amount if needed (Base everything on USD if possible)
    // In Jimvio, we usually have a rate in .env
    if (currency.toUpperCase() !== nativeCurrency) {
      // First convert input to USD (if it's RWF)
      let usdAmount = amount;
      if (currency.toUpperCase() === "RWF") {
        const rate = Number(process.env.RWF_TO_USD_RATE) || 0.0008;
        usdAmount = amount * rate;
      }

      // Then convert USD to target Native Currency
      // (Using rough current market rates as fallbacks for the demo if not in .env)
      const usdToNativeRates: Record<string, number> = {
        "RWF": 1250, "UGX": 3750, "ZMW": 25, "GHS": 12, "NGN": 1200,
        "KES": 150, "ZAR": 18, "SLE": 22, "TZS": 2500, "XOF": 600, "XAF": 600
      };

      const targetRate = usdToNativeRates[nativeCurrency] || 1;
      const convertedAmount = usdAmount * targetRate;

      console.log(`pawaPay: Converting ${amount} ${currency} to ${convertedAmount} ${nativeCurrency} for ${country}`);
      amount = convertedAmount;
      currency = nativeCurrency;
    }

    const depositId = uuidv4();

    // pawaPay requires a public HTTPS return URL.
    let appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://jimvio.com";
    if (appUrl.includes("localhost")) appUrl = "https://jimvio.com";

    const finalReturnUrl = `${appUrl}/checkout/success`;

    // Important: In v2/paymentpage, amount and currency are inside amountDetails.
    // reason must be between 1 and 50 characters.
    const payload = {
      depositId,
      returnUrl: finalReturnUrl,
      amountDetails: {
        amount: Math.round(amount).toString(), // v2 expects string here
        currency: currency.toUpperCase()
      },
      country: country.toUpperCase(), // MANDATORY field
      reason: `Order ${String(orderId || "Payment").substring(0, 40)}`,
    };

    console.log("pawaPay v2/paymentpage Payload:", JSON.stringify(payload, null, 2));

    const response = await fetch(`${baseUrl}/v2/paymentpage`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok || data.status === "REJECTED" || data.failureReason) {
      console.error("pawaPay v2/paymentpage Error:", JSON.stringify(data, null, 2));
      const errMsg = data.failureReason?.failureMessage || data.message || data.errorMessage || "pawaPay rejected the request";
      return NextResponse.json({
        error: "pawaPay session creation failed",
        message: errMsg,
        details: data
      }, { status: response.ok ? 400 : response.status });
    }

    // Response contains redirectUrl
    console.log("pawaPay v2/paymentpage Backend Success Data:", JSON.stringify(data, null, 2));
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("pawaPay backend handler error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
