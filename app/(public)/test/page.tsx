"use client";

import { useState } from "react";

export default function PaymentPage() {
    const [method, setMethod] = useState<"momo" | "card">("momo");
    const [phone, setPhone] = useState("");
    const [amount, setAmount] = useState(1000);
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState("");

    const handleMoMo = async () => {
        setLoading(true);
        setError("");
        setResult(null);

        try {
            const res = await fetch("/api/payments/momo", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    phone,
                    amount,
                    email,
                    name: "Test User",
                }),
            });

            const data = await res.json();

            // ❌ API error
            if (!res.ok) {
                throw new Error(data.message || "Payment failed");
            }

            // 🔁 REDIRECT FLOW (IMPORTANT)
            if (data.type === "redirect") {
                window.location.href = data.url;
                return;
            }

            // ✅ SUCCESS FLOW
            if (data.type === "success") {
                setResult({
                    transactionId: data.transactionId,
                    status: data.status,
                });
                return;
            }

            throw new Error("Unexpected response");
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCard = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/payments/card", {
                method: "POST",
                body: JSON.stringify({ amount, email }),
            });

            const data = await res.json();

            window.location.href = data.link; // redirect to Flutterwave
        } catch (err: any) {
            setError("Card payment failed");
        } finally {
            setLoading(false);
        }
    };

    {
        result && (
            <div className="bg-green-50 p-3 rounded text-sm">
                <p><strong>ID:</strong> {result.transactionId}</p>
                <p><strong>Status:</strong> {result.status}</p>
                <p className="text-xs text-gray-600">
                    Check your phone to confirm payment.
                </p>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex justify-center items-center bg-gray-50">
            <div className="bg-white p-6 rounded-xl shadow w-full max-w-md space-y-4">
                <h2 className="text-lg font-semibold">Payment</h2>

                {/* Toggle */}
                <div className="flex gap-2">
                    <button
                        onClick={() => setMethod("momo")}
                        className={`flex-1 p-2 rounded ${method === "momo" ? "bg-black text-white" : "bg-gray-100"
                            }`}
                    >
                        MTN MoMo
                    </button>
                    <button
                        onClick={() => setMethod("card")}
                        className={`flex-1 p-2 rounded ${method === "card" ? "bg-black text-white" : "bg-gray-100"
                            }`}
                    >
                        Card
                    </button>
                </div>

                {/* Inputs */}
                {method === "momo" && (
                    <input
                        placeholder="25078XXXXXXX"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full p-3 border rounded"
                    />
                )}

                <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="w-full p-3 border rounded"
                />

                <input
                    placeholder="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full p-3 border rounded"
                />

                {/* Action */}
                <button
                    onClick={method === "momo" ? handleMoMo : handleCard}
                    disabled={loading}
                    className="w-full bg-black text-white py-3 rounded"
                >
                    {loading ? "Processing..." : "Pay"}
                </button>

                {/* Result */}
                {result && method === "momo" && (
                    <div className="bg-green-50 p-3 rounded text-sm">
                        <p>ID: {result.transactionId}</p>
                        <p>Status: {result.status}</p>
                        <p>Check your phone to confirm</p>
                    </div>
                )}

                {error && <p className="text-red-500 text-sm">{error}</p>}
            </div>
        </div>
    );
}