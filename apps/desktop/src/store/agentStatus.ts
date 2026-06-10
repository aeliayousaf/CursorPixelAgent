import type { MoodLevel } from "./moodStore";

export type GitStatusState = "dirty" | "clean" | "unknown";

export interface RecentEventEntry {
  type: string;
  message: string;
  at: string;
}

export interface AgentStatusSnapshot {
  repo: string | null;
  branch: string | null;
  gitStatus: GitStatusState;
  lastEventLabel: string | null;
  lastEventAt: string | null;
  lastExtensionAt: string | null;
  connectionStatus: "connected" | "waiting";
  usageSummary: string | null;
  usageTrend: string | null;
  activeLanguage: string | null;
  unsavedCount: number | null;
  mood: MoodLevel;
  moodScore: number;
  recentEvents: RecentEventEntry[];
}

export const INITIAL_AGENT_STATUS: AgentStatusSnapshot = {
  repo: null,
  branch: null,
  gitStatus: "unknown",
  lastEventLabel: null,
  lastEventAt: null,
  lastExtensionAt: null,
  connectionStatus: "waiting",
  usageSummary: null,
  usageTrend: null,
  activeLanguage: null,
  unsavedCount: null,
  mood: "neutral",
  moodScore: 0,
  recentEvents: [],
};

const MAX_RECENT_EVENTS = 5;

function repoLabel(repoPath: string | undefined): string | null {
  if (!repoPath) {
    return null;
  }
  const parts = repoPath.split(/[\\/]/);
  return parts[parts.length - 1] ?? repoPath;
}

export function applyEventToAgentStatus(
  previous: AgentStatusSnapshot,
  event: import("@pixel-agent/shared").PixelAgentEvent,
  moodLevel?: MoodLevel,
  moodScore?: number,
): AgentStatusSnapshot {
  const updateStatusOnly =
    event.type === "ai_usage_update" && event.payload?.updateStatusOnly === true;

  const message =
    typeof event.payload?.message === "string" && event.payload.message.trim().length > 0
      ? event.payload.message
      : event.type.replaceAll("_", " ");

  const recentEvents = updateStatusOnly
    ? previous.recentEvents
    : [
        { type: event.type, message, at: event.timestamp },
        ...previous.recentEvents,
      ].slice(0, MAX_RECENT_EVENTS);

  const next: AgentStatusSnapshot = {
    ...previous,
    recentEvents,
    lastEventLabel: updateStatusOnly ? previous.lastEventLabel : event.type.replaceAll("_", " "),
    lastEventAt: updateStatusOnly ? previous.lastEventAt : event.timestamp,
    mood: moodLevel ?? previous.mood,
    moodScore: moodScore ?? previous.moodScore,
  };

  if (event.source === "cursor-extension") {
    next.connectionStatus = "connected";
    next.lastExtensionAt = event.timestamp;
  }

  if (typeof event.payload?.repo === "string") {
    next.repo = repoLabel(event.payload.repo) ?? event.payload.repo;
  }

  if (typeof event.payload?.branch === "string") {
    next.branch = event.payload.branch;
  }

  if (typeof event.payload?.language === "string") {
    next.activeLanguage = event.payload.language;
  }

  if (typeof event.payload?.unsavedCount === "number") {
    next.unsavedCount = event.payload.unsavedCount;
  }

  if (event.type === "git_dirty") {
    next.gitStatus = "dirty";
  } else if (event.type === "git_clean") {
    next.gitStatus = "clean";
  }

  if (event.type === "ai_usage_update") {
    if (typeof event.payload?.message === "string") {
      next.usageSummary = event.payload.message;
    }
    if (typeof event.payload?.usageTrend === "string") {
      next.usageTrend = event.payload.usageTrend;
    }
  }

  return next;
}
