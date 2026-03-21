"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { UserPlus, UserMinus, PlusSquare } from "lucide-react";
import { toggleFollowVendor, getFollowStatus } from "@/lib/actions/marketplace";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

interface FollowButtonProps {
  vendorId: string;
  className?: string;
  variant?: "default" | "outline" | "secondary" | "ghost";
  /** e.g. "Follow" for influencers, "Follow Store" for marketplace */
  followLabel?: string;
}

export function FollowButton({ vendorId, className, variant = "outline", followLabel = "Follow Store" }: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function checkStatus() {
      const status = await getFollowStatus(vendorId);
      setIsFollowing(status);
      setInitialized(true);
    }
    checkStatus();
  }, [vendorId]);

  const handleFollow = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setLoading(true);
    const res = await toggleFollowVendor(vendorId);
    setLoading(false);

    if (res.success) {
      setIsFollowing(res.action === "followed");
      toast.success(res.action === "followed" ? "You are now following this store!" : "Unfollowed store.");
    } else {
      if (res.error === "Authentication required") {
        toast.error("Please sign in to follow stores.");
        router.push("/login?returnUrl=" + encodeURIComponent(window.location.pathname));
      } else {
        toast.error(res.error || "Failed to follow.");
      }
    }
  };

  if (!initialized) {
    return (
      <Button variant={variant} className={cn("font-black h-12 rounded-xl border-2 opacity-50", className)} disabled>
         <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
         Loading...
      </Button>
    );
  }

  return (
    <Button
      variant={isFollowing ? "secondary" : variant}
      className={cn(
        "font-black h-12 rounded-xl transition-all duration-300",
        !isFollowing && "bg-[#f97316] text-white hover:bg-[#ea580c] border-none shadow-lg shadow-[#f97316]/20 active:scale-95",
        isFollowing && "bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-600 hover:border-red-100 group",
        className
      )}
      onClick={handleFollow}
      disabled={loading}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          Syncing...
        </span>
      ) : isFollowing ? (
        <>
          <UserMinus className="mr-2 h-4 w-4 transition-transform group-hover:scale-110" />
          <span className="group-hover:hidden">Following</span>
          <span className="hidden group-hover:inline">Unfollow</span>
        </>
      ) : (
        <>
          <UserPlus className="mr-2 h-4 w-4" />
          {followLabel}
        </>
      )}
    </Button>
  );
}
