export type GitStatusState = "dirty" | "clean" | "unknown";

export interface AgentStatusSnapshot {
  repo: string | null;
  branch: string | null;
  gitStatus: GitStatusState;
  lastEventLabel: string | null;
  lastEventAt: string | null;
  lastExtensionAt: string | null;
  connectionStatus: "connected" | "waiting";
  usageSummary: string | null;
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
};

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
): AgentStatusSnapshot {
  const next: AgentStatusSnapshot = {
    ...previous,
    lastEventLabel:
      event.type === "ai_usage_update" && event.payload?.updateStatusOnly
        ? previous.lastEventLabel
        : event.type.replaceAll("_", " "),
    lastEventAt:
      event.type === "ai_usage_update" && event.payload?.updateStatusOnly
        ? previous.lastEventAt
        : event.timestamp,
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

  if (event.type === "git_dirty") {
    next.gitStatus = "dirty";
  } else if (event.type === "git_clean") {
    next.gitStatus = "clean";
  }

  if (event.type === "ai_usage_update") {
    if (typeof event.payload?.message === "string") {
      next.usageSummary = event.payload.message;
    } else if (typeof event.payload?.usagePercent === "number") {
      next.usageSummary = `Usage at ${event.payload.usagePercent}%`;
    }
  }

  return next;
}
