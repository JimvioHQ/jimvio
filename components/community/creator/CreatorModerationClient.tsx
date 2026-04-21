"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, MoreVertical, Shield, Trash2, UserX } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

type Member = {
  id: string;
  user_id: string;
  role: string;
  status: string;
  profile: {
    full_name: string | null;
    avatar_url: string | null;
    username: string | null;
  } | null;
};

export function CreatorModerationClient({
  communityId,
  members: initialMembers,
}: {
  communityId: string;
  members: Member[];
}) {
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [actionType, setActionType] = useState<"suspend" | "remove" | null>(null);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAction = async (member: Member, type: "suspend" | "remove") => {
    setSelectedMember(member);
    setActionType(type);
    setReason("");
    setError(null);
  };

  const confirmAction = async () => {
    if (!selectedMember || !actionType) return;

    setLoading(true);
    setError(null);

    try {
      if (actionType === "suspend") {
        const res = await fetch(
          `/api/community-memberships/${selectedMember.id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "suspend",
              reason: reason || null,
            }),
          }
        );

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to suspend member");
        }

        setMembers((prev) =>
          prev.map((m) =>
            m.id === selectedMember.id ? { ...m, status: "banned" } : m
          )
        );
      } else if (actionType === "remove") {
        const res = await fetch(
          `/api/community-memberships/${selectedMember.id}`,
          {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
          }
        );

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to remove member");
        }

        setMembers((prev) =>
          prev.filter((m) => m.id !== selectedMember.id)
        );
      }

      setSelectedMember(null);
      setActionType(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const unsuspendMember = async (member: Member) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/community-memberships/${member.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "unsuspend",
          }),
        }
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to unsuspend member");
      }

      setMembers((prev) =>
        prev.map((m) =>
          m.id === member.id ? { ...m, status: "active" } : m
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-zinc-900 dark:text-white mb-4">Moderation</h2>
        <p className="text-sm text-zinc-500 mb-6">
          Manage community members, suspend inappropriate behavior, and maintain a healthy community.
        </p>
      </div>

      <div className="rounded-lg border border-zinc-200/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200/60 bg-zinc-50/50">
                <th className="text-left px-4 py-3 font-bold text-zinc-700 dark:text-zinc-300">Member</th>
                <th className="text-left px-4 py-3 font-bold text-zinc-700 dark:text-zinc-300">Role</th>
                <th className="text-left px-4 py-3 font-bold text-zinc-700 dark:text-zinc-300">Status</th>
                <th className="text-right px-4 py-3 font-bold text-zinc-700 dark:text-zinc-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr
                  key={member.id}
                  className="border-b border-zinc-200/60 hover:bg-zinc-50/30 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage
                          src={member.profile?.avatar_url || ""}
                          alt={member.profile?.full_name || "Member"}
                        />
                        <AvatarFallback>
                          {(member.profile?.full_name || "M")[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium text-zinc-900 dark:text-white">
                          {member.profile?.full_name || member.profile?.username || "Unknown"}
                        </span>
                        {member.profile?.username && (
                          <span className="text-xs text-zinc-500">@{member.profile.username}</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-bold uppercase text-zinc-600 bg-zinc-100/60 px-2 py-1 rounded">
                      {member.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "text-xs font-bold uppercase px-2 py-1 rounded",
                        member.status === "active"
                          ? "text-emerald-700 bg-emerald-100/60"
                          : member.status === "banned"
                            ? "text-red-700 bg-red-100/60"
                            : "text-zinc-600 bg-zinc-100/60"
                      )}
                    >
                      {member.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                        >
                          <MoreVertical className="h-4 w-4" />
                          <span className="sr-only">Member actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {member.status === "banned" ? (
                          <DropdownMenuItem
                            onClick={() => unsuspendMember(member)}
                            disabled={loading}
                          >
                            <Shield className="h-4 w-4 mr-2" />
                            Unsuspend
                          </DropdownMenuItem>
                        ) : (
                          <>
                            <DropdownMenuItem
                              onClick={() => handleAction(member, "suspend")}
                              disabled={loading}
                              className="text-orange-600"
                            >
                              <AlertCircle className="h-4 w-4 mr-2" />
                              Suspend
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleAction(member, "remove")}
                              disabled={loading}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Remove
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={!!actionType} onOpenChange={() => actionType ? setActionType(null) : null}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === "suspend"
                ? "Suspend Member"
                : actionType === "remove"
                  ? "Remove Member"
                  : ""}
            </DialogTitle>
            <DialogDescription>
              {actionType === "suspend"
                ? `This will prevent ${selectedMember?.profile?.full_name || "this member"} from accessing the community.`
                : actionType === "remove"
                  ? `This will remove ${selectedMember?.profile?.full_name || "this member"} from the community permanently.`
                  : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300 block mb-2">
                Reason (optional)
              </label>
              <Textarea
                placeholder="Explain why you're taking this action..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="min-h-24"
                disabled={loading}
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="flex gap-3 justify-end pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setActionType(null)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant={actionType === "remove" ? "destructive" : "default"}
                onClick={confirmAction}
                disabled={loading}
              >
                {loading ? "Processing..." : actionType === "suspend" ? "Suspend" : "Remove"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
