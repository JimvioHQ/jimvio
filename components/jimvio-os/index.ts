export { JimvioOSLoader } from "./JimvioOSLoader";
export { OsShell } from "./OsShell";
export { OsSidebar } from "./OsSidebar";
export { OsSearchBridge } from "./OsSearchBridge";
export { OsNotificationPanel } from "./OsNotificationPanel";
export { OsActivityFeed } from "./OsActivityFeed";
export { OsWorkspaceSwitcher } from "./OsWorkspaceSwitcher";
export { OsQuickCreate } from "./OsQuickCreate";
export { OsAiEntry } from "./OsAiEntry";
export { OsLauncher } from "./OsLauncher";
export { OsShortcuts } from "./OsShortcuts";
export { OsContextSync } from "./OsContextSync";
export { OsIcon } from "./OsIcon";

// Creator Commerce OS — persistent frame chrome
export { CreatorOsFrame } from "./CreatorOsFrame";
export { OsTopbar, type OsTopbarUser } from "./OsTopbar";
export { OsIntelligentSidebar } from "./OsIntelligentSidebar";
export { OsMorningBrief } from "./OsMorningBrief";
export { WorkspaceHome } from "./WorkspaceHome";
export { OsMissionControl } from "./OsMissionControl";
export { OsActivityCenter, type OsActivityFilter } from "./OsActivityCenter";
export {
  OsCard,
  OsPill,
  OsSectionTitle,
  OsSkeleton,
  OsDivider,
  OsIconBadge,
  OsEmptyState,
  OS_ACCENT,
  OS_BRAND_ACCENT,
  cn,
} from "./os-ui";

// Mission Control intelligence — Smart Pins, previews, layout, and status surfaces
export { SmartPins } from "./SmartPins";
export { QuickPreview } from "./QuickPreview";
export { OsStatusBar } from "./OsStatusBar";
export { OsAiDock } from "./OsAiDock";
export {
  InsightsSection,
  CalendarSection,
  ActivitySection,
} from "./MissionControlLower";
export { IntelligenceCore, type IntelligenceCoreProps } from "./IntelligenceCore";

// Jimvio Agent OS — specialized recommend-only AI coworkers
export {
  ExecutiveAgentWidget,
  AgentCard,
  AgentCenterView,
  type AgentCardProps,
  type ExecutiveAgentWidgetProps,
} from "./agents";

// Predictive Commerce Engine — advisory-only Mission Control widgets
export {
  BusinessHealthWidget,
  OpportunityEngineWidget,
  RiskEngineWidget,
  GrowthEngineWidget,
  BusinessDnaWidget,
  BusinessTimelineWidget,
  AgentCollaborationWidget,
  type BusinessHealthWidgetProps,
  type OpportunityEngineWidgetProps,
  type RiskEngineWidgetProps,
  type GrowthEngineWidgetProps,
  type BusinessDnaWidgetProps,
  type BusinessTimelineWidgetProps,
  type AgentCollaborationWidgetProps,
} from "./predictive";
