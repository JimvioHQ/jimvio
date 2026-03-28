import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { validateAfriPayCallback } from "@/lib/afripay/afripay";

export async function POST(req: NextRequest) {
  try {
    // SECURITY RULE 3: ALways use HTTPS (done natively by Vercel/NextJS deployment)
    
    // Parse incoming payload
    const body = await req.json();
    
    // STEP 8: LOGGING (Debugging webhook callbacks)
    console.log("[AfriPay Callback]: Received POST payload", JSON.stringify(body));

    // STEP 5: HANDLE CALLBACK (Extract required fields)
    const { status, amount, transaction_ref, client_token } = body;

    // STEP 4: VALIDATE INCOMING DATA
    if (!status || !amount || !transaction_ref || !client_token) {
      console.error("[AfriPay Callback]: Missing required fields.");
      // STEP 7: Always return 200 OK to AfriPay even if bad data, to prevent webhook retries
      return NextResponse.json({ success: false, message: "Missing fields" }, { status: 200 }); 
    }

    // Initialize Supabase Admin strictly for backend operations (Service Role)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY! // Bypass RLS for webhook
    );

    // STEP 5.1: Find order using client_token (which is our order_id)
    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("id, total_amount, payment_status")
      .eq("id", client_token)
      .single();

    if (orderError || !order) {
       console.error(`[AfriPay Callback]: Order not found for token: ${client_token}`);
       return NextResponse.json({ success: false, message: "Order not found" }, { status: 200 });
    }

    // STEP 5.2: Check if already PAID (prevent duplicates)
    if (order.payment_status === "completed" || order.payment_status === "paid") {
       console.log(`[AfriPay Callback]: Order ${client_token} is already paid. Ignored.`);
       return NextResponse.json({ success: true, message: "Already processed" }, { status: 200 });
    }

    // STEP 6: VALIDATION (Compare amounts)
    // Coerce both to numbers to ensure we don't fail on "RWF 500" vs 500 string mismatches
    const paidAmountCasted = parseFloat(String(amount));
    const orderAmountCasted = parseFloat(String(order.total_amount));

    if (paidAmountCasted < orderAmountCasted) {
       console.error(`[AfriPay Callback]: Amount Mismatch! Paid: ${paidAmountCasted}, Expected: ${orderAmountCasted}`);
       // Could mark as 'failed' or 'partial', but spec says "Reject if mismatch"
       await supabaseAdmin.from("orders").update({ payment_status: "failed", notes: "AfriPay Amount Mismatch: Paid less than required." }).eq("id", client_token);
       return NextResponse.json({ success: false, message: "Amount mismatch detected" }, { status: 200 });
    }

    // STEP 5.3: If SUCCESS: mark order as PAID
    if (String(status).toUpperCase() === "SUCCESS") {
       const { error: updateError } = await supabaseAdmin
         .from("orders")
         .update({
            payment_status: "completed",
            afripay_reference: transaction_ref, // Saving tracking reference
            paid_at: new Date().toISOString()
         })
         .eq("id", client_token);
         
       if (updateError) {
          console.error("[AfriPay Callback]: DB Update Failed", updateError);
          return NextResponse.json({ success: false, message: "Internal update failed" }, { status: 200 });
       }
       
       console.log(`[AfriPay Callback]: Success! Order ${client_token} marked as PAID.`);
       // Optionally append to transactions table here if required by Jimvio's architecture.
    } else {
       // e.g. status == "FAILED" or "CANCELLED"
       await supabaseAdmin
         .from("orders")
         .update({ payment_status: "failed" })
         .eq("id", client_token);
       
       console.log(`[AfriPay Callback]: Payment was not successful. Updated status to failed.`);
    }

    // STEP 7: RESPONSE (Always 200 OK)
    return NextResponse.json({ success: true, message: "Callback processed" }, { status: 200 });

  } catch (error: any) {
    console.error("[AfriPay Callback]: Unhandled Fatal Error:", error.message);
    // Even on server failure, 200 OK stops AfriPay from trying again 1000 times
    return NextResponse.json({ success: false, message: "Server error" }, { status: 200 });
  }
}
