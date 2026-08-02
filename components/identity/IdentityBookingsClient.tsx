"use client";

import { useCallback, useEffect, useState } from "react";
import { Calendar, CalendarClock, CheckCircle2, Clock, Inbox, Loader2, Send, XCircle } from "lucide-react";
import { toast } from "sonner";
import { getInitials } from "@/lib/utils";
import type { IdentityBooking, IdentityBookingStatus } from "@/lib/identity/types";
import { IdentityButton, IdentityCard, IdentityEmptyState, IdentityPill, cn } from "@/components/identity/identity-ui";

const STATUS_TONE: Record<IdentityBookingStatus, "neutral" | "success" | "warning" | "danger"> = {
  pending: "warning",
  accepted: "success",
  declined: "danger",
  cancelled: "neutral",
  completed: "neutral",
};

export function IdentityBookingsClient() {
  const [role, setRole] = useState<"creator" | "brand">("creator");
  const [bookings, setBookings] = useState<IdentityBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async (r: "creator" | "brand") => {
    setLoading(true);
    try {
      const res = await fetch(`/api/identity/bookings?role=${r}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load bookings");
      setBookings(json.bookings ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load bookings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(role);
  }, [role, load]);

  async function updateStatus(id: string, status: IdentityBookingStatus) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/identity/bookings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to update booking");
      setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, status } : b)));
      toast.success(status === "accepted" ? "Booking accepted" : "Booking declined");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update booking");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9A9388]">Jimvio Identity</p>
          <h1 className="font-[var(--font-identity-serif)] text-[26px] font-medium tracking-tight text-[#161512]">
            Booking inbox
          </h1>
        </div>
        <div className="flex gap-1 rounded-full bg-black/[0.04] p-1">
          <SegButton active={role === "creator"} onClick={() => setRole("creator")} icon={Inbox} label="Received" />
          <SegButton active={role === "brand"} onClick={() => setRole("brand")} icon={Send} label="Sent" />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-[#FF5A1F]" />
        </div>
      ) : bookings.length === 0 ? (
        <IdentityEmptyState
          icon={<CalendarClock className="h-6 w-6" />}
          title={role === "creator" ? "No booking requests yet" : "You haven't requested any bookings"}
          description={
            role === "creator"
              ? "Requests from brands to work with you will show up here."
              : "Visit a creator's profile and tap “Book” to get started."
          }
        />
      ) : (
        <div className="space-y-3">
          {bookings.map((b) => (
            <IdentityCard key={b.id} className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#FF5A1F] text-[13px] font-semibold text-white">
                  {b.counterparty?.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={b.counterparty.avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    getInitials(b.counterparty?.fullName || b.counterparty?.username || "?")
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[13.5px] font-semibold text-[#1C1B19]">{b.title}</p>
                    <IdentityPill tone={STATUS_TONE[b.status]}>{b.status}</IdentityPill>
                  </div>
                  <p className="text-[12px] text-[#9A9388]">
                    {role === "creator" ? "from " : "to "}
                    {b.counterparty?.fullName || b.counterparty?.username || "Jimvio member"}
                  </p>
                  {b.message && <p className="mt-1.5 text-[12.5px] leading-relaxed text-[#59544B]">{b.message}</p>}
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-[11.5px] text-[#9A9388]">
                    {b.scheduledAt && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> {new Date(b.scheduledAt).toLocaleString()}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {b.durationMinutes} min
                    </span>
                  </div>

                  {role === "creator" && b.status === "pending" && (
                    <div className="mt-3 flex gap-2">
                      <IdentityButton size="sm" onClick={() => updateStatus(b.id, "accepted")} loading={busyId === b.id}>
                        <CheckCircle2 className="h-3.5 w-3.5" /> Accept
                      </IdentityButton>
                      <IdentityButton
                        size="sm"
                        variant="outline"
                        onClick={() => updateStatus(b.id, "declined")}
                        loading={busyId === b.id}
                      >
                        <XCircle className="h-3.5 w-3.5" /> Decline
                      </IdentityButton>
                    </div>
                  )}
                </div>
              </div>
            </IdentityCard>
          ))}
        </div>
      )}
    </div>
  );
}

function SegButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12.5px] font-medium transition-colors",
        active ? "bg-white text-[#1C1B19] shadow-sm" : "text-[#7C766B]",
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}
