import { NextResponse } from "next/server";

export async function POST(req: Request) {
    const body = await req.json();

    const res = await fetch("https://api.flutterwave.com/v3/payments", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${process.env.FLW_SECRET_KEY}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            tx_ref: `tx-${Date.now()}`,
            amount: body.amount,
            currency: "RWF",
            redirect_url: "http://localhost:3000/payment-success",
            customer: {
                email: body.email,
            },
        }),
    });

    const data = await res.json();

    return NextResponse.json({
        link: data.data.link,
    });
}