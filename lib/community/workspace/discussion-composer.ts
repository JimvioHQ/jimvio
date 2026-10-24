export type DiscussionComposerGate =
  | { kind: "compose" }
  | {
      kind: "join" | "subscribe" | "sign-in" | "restricted";
      title: string;
      description: string;
      actionLabel?: string;
    };

/**
 * Composer gate for a Space discussion.
 * Active members post when the channel policy allows it.
 * Signed-in non-members of a member discussion are asked to join or subscribe.
 * Announcement-only and explicit publisher restrictions stay closed.
 */
export function discussionComposerGate(input: {
  userId?: string | null;
  membershipStatus?: string | null;
  isStaff?: boolean;
  canPublish: boolean;
  isFree: boolean | null;
  memberDiscussion: boolean;
}): DiscussionComposerGate {
  const status = input.membershipStatus ?? null;
  const active = status === "active";
  const staff = Boolean(input.isStaff);
  if (input.userId && (active || staff) && status !== "cancelled" && input.canPublish) {
    return { kind: "compose" };
  }
  if (!input.userId) {
    return {
      kind: "sign-in",
      title: "Sign in to participate",
      description: "Sign in to send messages in this Space.",
      actionLabel: "Sign in",
    };
  }
  if (!active && !staff && input.memberDiscussion) {
    if (input.isFree === false) {
      return {
        kind: "subscribe",
        title: "Membership required",
        description: "Subscribe to this community to send messages in this discussion.",
        actionLabel: "View plans",
      };
    }
    return {
      kind: "join",
      title: "Join to participate",
      description: "Members can send messages in this discussion.",
      actionLabel: "Join community",
    };
  }
  return {
    kind: "restricted",
    title: "Posting is restricted",
    description: "Only authorized publishers can post in this channel.",
  };
}
