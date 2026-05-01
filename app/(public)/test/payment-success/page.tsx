"use client";

import { useEffect, useState } from "react";

export default function SuccessPage() {
    const [status, setStatus] = useState("verifying...");
    const [tx, setTx] = useState<any>(null);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);

        const resp = params.get("resp");
        const transactionId = params.get("transaction_id");

        let id: string | null = null;

        try {
            // ✅ CASE 1: Flutterwave resp (YOUR CURRENT CASE)
            if (resp) {
                const decoded = JSON.parse(decodeURIComponent(resp));
                id = decoded?.data?.id;

                setTx(decoded.data);
            }

            // ✅ CASE 2: direct transaction_id (card flow)
            if (transactionId) {
                id = transactionId;
            }

            if (!id) {
                setStatus("No transaction found ❌");
                return;
            }

            // 🔍 VERIFY ON BACKEND (IMPORTANT)
            fetch(`/api/payments/verify/tx-1777650260646`)
                .then((res) => res.json())
                .then((data) => {
                    const result = data?.data;

                    console.log(data);

                    if (result?.status === "successful") {
                        setStatus("Payment successful ✅");
                    } else {
                        setStatus("Payment failed ❌");
                    }


                    setTx(result);
                })
                .catch(() => {
                    setStatus("Verification error ❌");
                });
        } catch (err) {
            console.error(err);
            setStatus("Invalid payment response ❌");
        }
    }, []);

    return (
        <div className="h-screen flex items-center justify-center bg-gray-50">
            <div className="bg-white p-6 rounded-xl shadow w-full max-w-md space-y-3">
                <h1 className="text-xl font-semibold">{status}</h1>

                {tx && (
                    <div className="text-sm space-y-1 text-gray-700">
                        <p><strong>Transaction ID:</strong> {tx.id}</p>
                        <p><strong>Status:</strong> {tx.status}</p>
                        <p><strong>Amount:</strong> {tx.amount} {tx.currency}</p>
                        <p><strong>Reference:</strong> {tx.txRef || tx.tx_ref}</p>
                    </div>
                )}
            </div>
        </div>
    );
}