import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { convertFromUSD } from "@/lib/currency/rates";

export async function POST(request: Request) {
  try {
    const apiToken = process.env.PAWAPAY_API_TOKEN?.trim();
    if (!apiToken) {
      return NextResponse.json({ error: "PAWAPAY_API_TOKEN is not configured" }, { status: 500 });
    }

    const isSandbox = process.env.PAWAPAY_ENV === "sandbox";
    const baseUrl = isSandbox ? "https://api.sandbox.pawapay.io" : "https://api.pawapay.io";

    // console.log(`pawaPay: Initiation using API v2 [/v2/paymentpage] in ${process.env.PAWAPAY_ENV} mode`);

    const body = await request.json();
    let { amount, currency, orderId, country, returnUrl } = body;

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

    // Standardize country or infer from currency if not provided
    if (!country || country.length !== 3) {
      const currencyToCountry: Record<string, string> = {
        "RWF": "RWA", "UGX": "UGA", "ZMW": "ZMB", "GHS": "GHA", "NGN": "NGA",
        "KES": "KEN", "ZAR": "ZAF", "SLE": "SLE", "XOF": "SEN", "XAF": "CMR"
      };
      country = currencyToCountry[currency.toUpperCase()] || "RWA";
    }

    // 2. Map Country to Native Currency
    const countryToCurrency: Record<string, string> = {
      "RWA": "RWF", "UGA": "UGX", "ZMB": "ZMW", "GHA": "GHS", "NGA": "NGN",
      "KEN": "KES", "ZAF": "ZAR", "SLE": "SLE", "TZA": "TZS", "MWI": "MWK",
      "MOZ": "MZN", "LSO": "LSL", "SEN": "XOF", "CIV": "XOF", "BEN": "XOF",
      "BFA": "XOF", "CMR": "XAF", "GAB": "XAF", "COG": "XAF"
    };

    const nativeCurrency = countryToCurrency[country.toUpperCase()] || "RWF";

    // 3. Convert Amount (Base everything on USD)
    // pawaPay DOES NOT support USD for collection. We must convert to local currency.
    if (currency.toUpperCase() === "USD") {
      console.log(`pawaPay: Converting USD to ${nativeCurrency} using live rates.`);
      amount = await convertFromUSD(amount, nativeCurrency as any);
      currency = nativeCurrency;
    } else if (currency.toUpperCase() !== nativeCurrency) {
      console.log(`pawaPay cross-currency map missing. Charging natively in ${currency} instead of ${nativeCurrency}`);
      // Fallback: If Jimvio cart somehow sent Euro or similar, just charge the quantity as is.
      // Jimvio core prices are USD, so the first 'if' handles 99% of checkouts natively.
    }

    const depositId = uuidv4();

    // pawaPay requires a public HTTPS return URL.
    // NOTE: For local development, this must be an ngrok or public URL for webhooks to work,
    // but the redirect itself should respect the environment.
    let appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://jimvio.com";

    const finalReturnUrl = `${appUrl}/checkout/success?order=${orderId}&order_tracking_id=${depositId}`;

    // Important: In v2/paymentpage, amount and currency are inside amountDetails.
    // reason must be between 1 and 50 characters.
    // pawaPay MANDATES an absolute HTTPS return URL for session creation.
    // In production, pawaPay VALIDATES the domain and often requires an EXACT match with whitelisted URLs.
    let finalUrl = returnUrl || finalReturnUrl;
    
    // Safety 1: Force HTTPS
    if (finalUrl.startsWith("http://")) {
      finalUrl = finalUrl.replace("http://", "https://");
    }

    // Safety 2: Domain & Protocol Compliance
    if (!isSandbox) {
      // Production mode requirements:
      // 1. Remove localhost/port (replace with jimvio.com)
      // 2. Remove query parameters (pawaPay often fails on dynamic query strings if not whitelisted as wildcards)
      finalUrl = finalUrl.replace(/localhost(:\d+)?/, "jimvio.com").replace(/127\.0\.0\.1(:\d+)?/, "jimvio.com");
      
      // Optionally strip query params to ensure whitelisting success
      if (finalUrl.includes("?")) {
        console.warn("pawaPay: Stripping query parameters for Production API compatibility.");
        finalUrl = finalUrl.split("?")[0];
      }
    }

    const payload = {
      depositId,
      returnUrl: finalUrl,
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

    // Update order with payment provider
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    await supabase.from("orders").update({
      payment_provider: "pawapay",
      gateway_used: "pawapay",
      pawapay_deposit_id: depositId,
    }).eq("id", orderId);

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("pawaPay backend handler error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
