import { NextResponse } from "next/server";

const configured = Boolean(
  process.env.BINANCEPAY_API_KEY &&
  process.env.BINANCEPAY_SITE_ID &&
  process.env.BINANCEPAY_PRIVATE_KEY
);

export async function POST(request: Request) {
  if (!configured) {
    return NextResponse.json(
      {
        error: "Binance Pay is not configured.",
        message: "This payment method is unavailable right now.",
      },
      { status: 503 }
    );
  }

  try {
    const payload = await request.json();

    return NextResponse.json(
      {
        error: { code: "BINANCEPAY_UNAVAILABLE" },
        message:
          "Binance Pay is temporarily unavailable. Please choose another payment method.",
        payload,
      },
      { status: 503 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: { code: "INVALID_REQUEST_PAYLOAD" },
        message: "Invalid payment request. Please try again.",
      },
      { status: 400 }
    );
  }
}
