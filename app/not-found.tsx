"use client"
import { NotFoundState } from "@/components/empty-states/not-found-state";
import { Search, Users, HelpCircle } from "lucide-react";

export default function NotFound() {
  return (
    <NotFoundState
      variant="page"
      quickLinks={[
        { label: "Browse products", href: "/marketplace", icon: Search },
        { label: "Communities", href: "/communities", icon: Users },
        { label: "Get help", href: "/help", icon: HelpCircle },
      ]}
    />
  );
}