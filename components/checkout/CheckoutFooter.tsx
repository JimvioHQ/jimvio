
"use client";

import { Headphones } from "lucide-react";

export function CheckoutFooter() {
    return (
        <div className="fixed bottom-0 inset-x-0 z-30 bg-slate-900 text-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4 text-[12px]">

                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-7 h-7 rounded-md bg-emerald-500/20 flex items-center justify-center shrink-0">
                        <svg className="h-3.5 w-3.5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                        </svg>
                    </div>
                    <p className="text-[12px] font-medium truncate">
                        Trusted by 10,000+ customers worldwide
                    </p>
                    <div className="hidden sm:flex items-center gap-1.5 shrink-0">
                        <div className="flex">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <svg key={i} className="h-3 w-3 text-amber-400 fill-current" viewBox="0 0 20 20">
                                    <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                                </svg>
                            ))}
                        </div>
                        <span className="font-bold tabular-nums">4.9/5</span>
                    </div>
                </div>

                <div className="flex items-center gap-2 text-[12px] shrink-0">
                    <Headphones className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="hidden md:inline">
                        Secure <span className="text-slate-400 mx-1">·</span>
                        Fast <span className="text-slate-400 mx-1">·</span>
                        Reliable <span className="text-slate-400 mx-1">·</span>
                        24/7 Support
                    </span>
                    <span className="md:hidden">24/7 Support</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse ml-1" />
                </div>
            </div>
        </div>
    );
}