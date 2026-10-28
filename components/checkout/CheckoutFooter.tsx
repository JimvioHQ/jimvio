"use client";

import { Headphones } from "lucide-react";

export function CheckoutFooter() {
    return (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-slate-900/95 text-white backdrop-blur-md">
            <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 text-[12px] sm:px-6 lg:px-8">

                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-7 h-7 rounded-md bg-emerald-500/20 flex items-center justify-center shrink-0">
                        <svg className="h-3.5 w-3.5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                        </svg>
                    </div>
                    <p className="text-[12px] font-medium truncate">
                        Secure checkout <span className="text-slate-400 mx-1">·</span> Buyer Protection on eligible orders
                    </p>
                </div>

                <div className="flex items-center gap-2 text-[12px] shrink-0">
                    <Headphones className="h-3.5 w-3.5 text-emerald-400" />
                    <a href="/help/contact" className="hover:underline">Contact support</a>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse ml-1" />
                </div>
            </div>
        </div>
    );
}