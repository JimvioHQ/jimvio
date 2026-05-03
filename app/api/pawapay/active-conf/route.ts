import { NextResponse } from "next/server";

export async function GET() {
  try {
    const apiToken = process.env.PAWAPAY_API_TOKEN;
    if (!apiToken) {
      return NextResponse.json({ error: "PAWAPAY_API_TOKEN is not configured" }, { status: 500 });
    }

    const isSandbox = process.env.PAWAPAY_ENV === "sandbox";
    const baseUrl = isSandbox ? "https://api.sandbox.pawapay.io" : "https://api.pawapay.io";

    console.log(`pawaPay active-conf: Fetching from ${baseUrl}/v2/active-conf`);

    const response = await fetch(`${baseUrl}/v2/active-conf`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiToken}`,
      },
    });

    console.log(`pawaPay active-conf: Status ${response.status}`);
    console.log(`pawaPay active-conf: Cache-Control ${response.headers.get("cache-control")}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json({ error: "Failed to fetch pawaPay configuration", details: errorData }, { status: response.status });
    }

    const text = await response.text();
    console.log(`pawaPay active-conf response body:`, text);

    if (!text) {
      return NextResponse.json([]);
    }

    const data = JSON.parse(text);
    const configs = Array.isArray(data) ? data : (data.countries || []);
    return NextResponse.json(configs);
  } catch (error: any) {
    console.error("pawaPay active-conf error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
