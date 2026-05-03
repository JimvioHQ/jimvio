import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: Request) {
  try {
    const apiToken = process.env.PAWAPAY_API_TOKEN;
    if (!apiToken) {
      return NextResponse.json({ error: "PAWAPAY_API_TOKEN is not configured" }, { status: 500 });
    }

    const body = await request.json();
    const { amount, currency, correspondent, phoneNumber, statementDescription } = body;

    if (!amount || !currency || !correspondent || !phoneNumber) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const depositId = uuidv4();

    const payload = {
      depositId,
      amount: amount.toString(),
      currency,
      correspondent,
      payer: {
        type: "MSISDN",
        address: {
          value: phoneNumber,
        },
      },
      statementDescription: statementDescription || "Jimvio Payment",
    };

    const isSandbox = process.env.PAWAPAY_ENV === "sandbox";
    const baseUrl = isSandbox ? "https://api.sandbox.pawapay.io" : "https://api.pawapay.io";

    const response = await fetch(`${baseUrl}/v2/deposits`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json({ error: "pawaPay deposit failed", details: data }, { status: response.status });
    }

    return NextResponse.json({ ...data, depositId });
  } catch (error: any) {
    console.error("pawaPay deposit error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
