export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    console.log("VERIFY KEY:", id);

    const isNumericId = /^\d+$/.test(id);

    const key = isNumericId ? id : id.toUpperCase();

    try {
        let url = "";

        if (isNumericId) {
            url = `https://api.flutterwave.com/v3/transactions/${key}/verify`;
        }
        else {
            url = `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${key}`;
        }

        const res = await fetch(url, {
            headers: {
                Authorization: `Bearer ${process.env.FLW_SECRET_KEY}`,
            },
        });

        const result = await res.json();

        console.log("Flutterwave verify result:", result);

        if (!res.ok || result.status !== "success") {
            return Response.json(
                {
                    status: "error",
                    message: result.message || "Verification failed",
                },
                { status: 400 }
            );
        }

        const tx = result.data;

        return Response.json({
            status: tx.status?.toLowerCase(),
            data: {
                id: tx.id,
                tx_ref: tx.tx_ref,
                amount: tx.amount,
                currency: tx.currency,
                status: tx.status,
                payment_type: tx.payment_type,
            },
        });
    } catch (error) {
        console.error("VERIFY ERROR:", error);

        return Response.json(
            {
                status: "error",
                message: "Server error during verification",
            },
            { status: 500 }
        );
    }
}