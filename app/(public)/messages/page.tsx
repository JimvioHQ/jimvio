"use client";

import React from "react";
import { MessagingScreen } from "@/components/community/messages/MessagingScreen";

export default function MessagesPage() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] pt-[var(--navbar-height)]">
      <MessagingScreen onNavigate={(screen) => console.log("Navigate to", screen)} />
    </div>
  );
}
