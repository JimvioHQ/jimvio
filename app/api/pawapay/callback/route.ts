import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log("pawaPay webhook received:", body);

    // pawaPay usually sends an array of events or a single object depending on version/config
    const events = Array.isArray(body) ? body : [body];

    const supabase = await createClient();

    for (const event of events) {
      const { depositId, status, rejectionReason } = event;

      if (!depositId) continue;

      // Update order/payment status in database based on depositId
      // This part depends on how you link depositId to your orders
      // For now, we log and return success to pawaPay
      
      console.log(`Payment Update: Deposit ${depositId} is now ${status}`);
      if (rejectionReason) {
        console.log(`Rejection Reason: ${rejectionReason}`);
      }
      
      // Example update (uncomment and adjust if you have a payments table)
      /*
      await supabase
        .from("payments")
        .update({ status: status.toLowerCase(), updated_at: new Date().toISOString() })
        .eq("external_id", depositId);
      */
    }

    return NextResponse.json({ status: "ACCEPTED" });
  } catch (error: any) {
    console.error("pawaPay webhook error:", error);
    // Even if processing fails, we usually want to return 200 to acknowledge receipt 
    // but here we return 500 for internal tracking if needed
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
