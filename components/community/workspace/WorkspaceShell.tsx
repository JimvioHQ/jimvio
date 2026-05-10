// components/workspace/WorkspaceShell.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { WorkspaceTopBar } from "./WorkspaceTopBar";
import { WorkspaceLeftNav } from "./WorkspaceLeftNav";
import { WorkspaceBottomNav } from "./WorkspaceBottomNav";
import { WorkspaceRightRail } from "./WorkspaceRightRail";
import { FeedSection } from "./sections/FeedSection";
import { MissionsSection } from "./sections/MissionsSection";
import { MembersSection } from "./sections/MembersSection";
import { SpacesSection } from "./sections/SpacesSection";
import { LiveSection } from "./sections/LiveSection";
import { EventsSection } from "./sections/EventsSection";
import { ResourcesSection } from "./sections/ResourcesSection";
import { CoursesSection } from "./sections/course-section";
import type {
    WorkspaceCommunity,
    WorkspaceRole,
    WorkspaceSection,
    WorkspaceView,
} from "@/types/workspace";

interface Props {
    community: WorkspaceCommunity;
    currentUserId: string;
    role: WorkspaceRole;
    isAdmin: boolean;
    isOwner: boolean;
    initialSection: string;
    initialView: WorkspaceView;
}

const SECTION_LIST: WorkspaceSection[] = [
    "feed", "spaces", "live", "missions", "courses", "events", "members", "resources",
];

function isValidSection(s: string): s is WorkspaceSection {
    return SECTION_LIST.includes(s as WorkspaceSection);
}

export function WorkspaceShell({
    community,
    currentUserId,
    role,
    isAdmin,
    isOwner,
    initialSection,
    initialView,
}: Props) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [section, setSection] = useState<WorkspaceSection>(
        isValidSection(initialSection) ? initialSection : "feed"
    );
    const [view, setView] = useState<WorkspaceView>(initialView);

    // Sync section/view to URL without full navigation
    const updateUrl = (next: { section?: WorkspaceSection; view?: WorkspaceView }) => {
        const params = new URLSearchParams(searchParams.toString());
        if (next.section) params.set("section", next.section);
        if (next.view) {
            if (next.view === "admin") params.set("view", "admin");
            else params.delete("view");
        }
        const qs = params.toString();
        router.replace(`/communities/${community.slug}/workspace${qs ? `?${qs}` : ""}`, { scroll: false });
    };

    const handleSectionChange = (s: WorkspaceSection) => {
        setSection(s);
        updateUrl({ section: s });
    };

    const handleViewToggle = () => {
        if (!isAdmin) return;
        const next: WorkspaceView = view === "admin" ? "member" : "admin";
        setView(next);
        updateUrl({ view: next });
    };

    // Render the active section
    const sectionProps = { community, currentUserId, role, view, isAdmin, isOwner };

    const sectionMap: Record<WorkspaceSection, React.ReactNode> = {
        feed: <FeedSection {...sectionProps} />,
        missions: <MissionsSection {...sectionProps} />,
        members: <MembersSection {...sectionProps} />,
        spaces: <SpacesSection />,
        live: <LiveSection />,
        courses: <CoursesSection />,
        events: <EventsSection />,
        resources: <ResourcesSection />,
    };

    return (
        <div className="min-h-screen  bg-bg font-[family-name:var(--font-dm-sans)]">
            <WorkspaceTopBar
                community={community}
                section={section}
                view={view}
                isAdmin={isAdmin}
                onViewToggle={handleViewToggle}
            />

            {/* Desktop: 3-column. Mobile: stacked, nav on bottom. */}
            <div className="max-w-[1400px] mx-auto px-4 lg:px-6 pb-24 lg:pb-6">
                <div className="lg:grid lg:grid-cols-[220px_1fr_320px] lg:gap-6 pt-4">
                    {/* Desktop side nav */}
                    <aside className="hidden lg:block">
                        <WorkspaceLeftNav
                            section={section}
                            view={view}
                            onSectionChange={handleSectionChange}
                            isAdmin={isAdmin}
                        />
                    </aside>

                    {/* Main content */}
                    <main className="min-w-0">
                        {sectionMap[section]}
                    </main>

                    {/* Desktop right rail */}
                    <aside className="hidden lg:block">
                        <WorkspaceRightRail community={community} />
                    </aside>
                </div>
            </div>

            {/* Mobile bottom nav */}
            <WorkspaceBottomNav
                section={section}
                onSectionChange={handleSectionChange}
            />
        </div>
    );
}