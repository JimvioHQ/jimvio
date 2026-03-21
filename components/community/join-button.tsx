"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { joinCommunity, leaveCommunity } from "@/lib/actions/community";
import { toast } from "sonner";
import { UserPlus, LogOut, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface JoinCommunityButtonProps {
  communityId: string;
  isMember: boolean;
  isOwner: boolean;
  price?: number | null;
  className?: string;
}

export function JoinCommunityButton({ communityId, isMember, isOwner, price, className }: JoinCommunityButtonProps) {
  const router = useRouter();
  const [member, setMember] = useState(isMember);
  const [isPending, startTransition] = useTransition();

  if (isOwner) {
    return (
      <Button variant="outline" disabled className={cn("rounded-2xl font-bold", className)}>
        You own this community
      </Button>
    );
  }

  const handleClick = () => {
    startTransition(async () => {
      if (member) {
        const res = await leaveCommunity(communityId);
        if (res.success) {
          setMember(false);
          router.refresh();
          toast.success("You left the community", {
            description: "You can rejoin anytime.",
            icon: "👋",
          });
        } else {
          toast.error(res.error || "Failed to leave");
        }
      } else {
        const res = await joinCommunity(communityId);
        if (res.success) {
          setMember(true);
          router.refresh();
          toast.success("Welcome to the community! 🎉", {
            description: "You now have full access to all posts and discussions.",
          });
        } else {
          toast.error(res.error || "Failed to join");
        }
      }
    });
  };

  return (
    <Button
      onClick={handleClick}
      disabled={isPending}
      className={cn(
        "rounded-2xl font-black transition-all duration-300",
        member
          ? "bg-white/10 text-white border border-white/20 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30"
          : "bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white shadow-xl shadow-[var(--color-accent)]/20 hover:shadow-2xl hover:scale-[1.02]",
        className
      )}
    >
      {isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : member ? (
        <>
          <LogOut className="h-4 w-4 mr-2" />
          Leave Community
        </>
      ) : (
        <>
          <UserPlus className="h-4 w-4 mr-2" />
          {price ? `Join – ${price.toLocaleString()} RWF/mo` : "Join Free"}
        </>
      )}
    </Button>
  );
}
