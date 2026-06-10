export const PIXEL_AGENT_WS_PORT = 47321;

export const PIXEL_AGENT_EVENT_TYPES = [
  "cursor_opened",
  "workspace_opened",
  "git_dirty",
  "git_clean",
  "git_commit_created",
  "git_push_started",
  "git_push_success",
  "git_push_failed",
  "branch_changed",
  "build_error",
  "test_failed",
  "merge_conflict",
  "unsaved_files",
  "stale_branch",
  "language_focus",
  "no_commits_today",
  "long_session",
  "ai_usage_update",
  "warning",
  "custom_message",
] as const;

export type PixelAgentEventType = (typeof PIXEL_AGENT_EVENT_TYPES)[number];

export type PixelAgentAnimation =
  | "idle"
  | "happy"
  | "alert"
  | "thinking"
  | "sleeping";

export interface PixelAgentEventPayload {
  repo?: string;
  branch?: string;
  message?: string;
  workspace?: string;
  usagePercent?: number;
  spendUsd?: number;
  requestsToday?: number;
  usageTrend?: string;
  error?: string;
  language?: string;
  unsavedCount?: number;
  sessionMinutes?: number;
  moodDelta?: number;
  priority?: number;
  updateStatusOnly?: boolean;
  action?: "refresh_usage" | "mute";
  muteUntil?: string;
  [key: string]: unknown;
}

export interface PixelAgentEvent {
  type: PixelAgentEventType;
  source: string;
  timestamp: string;
  payload?: PixelAgentEventPayload;
}

export function isPixelAgentEventType(value: unknown): value is PixelAgentEventType {
  return (
    typeof value === "string" &&
    (PIXEL_AGENT_EVENT_TYPES as readonly string[]).includes(value)
  );
}

export function isPixelAgentEvent(value: unknown): value is PixelAgentEvent {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<PixelAgentEvent>;
  return (
    isPixelAgentEventType(candidate.type) &&
    typeof candidate.source === "string" &&
    typeof candidate.timestamp === "string"
  );
}

export const EVENT_ANIMATION_MAP: Record<PixelAgentEventType, PixelAgentAnimation> = {
  cursor_opened: "happy",
  workspace_opened: "happy",
  git_dirty: "thinking",
  git_clean: "idle",
  git_commit_created: "happy",
  git_push_started: "thinking",
  git_push_success: "happy",
  git_push_failed: "alert",
  branch_changed: "thinking",
  build_error: "alert",
  test_failed: "alert",
  merge_conflict: "alert",
  unsaved_files: "thinking",
  stale_branch: "thinking",
  language_focus: "idle",
  no_commits_today: "thinking",
  long_session: "thinking",
  ai_usage_update: "idle",
  warning: "alert",
  custom_message: "idle",
};

/** Higher number = more important; can interrupt lower-priority bubbles. */
export const EVENT_PRIORITY: Record<PixelAgentEventType, number> = {
  merge_conflict: 95,
  test_failed: 90,
  build_error: 90,
  git_push_failed: 85,
  warning: 80,
  git_push_success: 75,
  git_commit_created: 70,
  long_session: 65,
  no_commits_today: 60,
  stale_branch: 55,
  unsaved_files: 50,
  custom_message: 48,
  git_push_started: 45,
  branch_changed: 40,
  workspace_opened: 35,
  cursor_opened: 35,
  git_dirty: 25,
  language_focus: 20,
  git_clean: 15,
  ai_usage_update: 10,
};

/** Minimum ms between repeat bubbles of the same type. */
export const EVENT_COOLDOWN_MS: Partial<Record<PixelAgentEventType, number>> = {
  git_dirty: 300_000,
  git_clean: 300_000,
  language_focus: 600_000,
  unsaved_files: 300_000,
  long_session: 1_800_000,
  no_commits_today: 3_600_000,
  stale_branch: 3_600_000,
  warning: 600_000,
  ai_usage_update: 300_000,
};

export const DEFAULT_EVENT_MESSAGES: Partial<Record<PixelAgentEventType, string>> = {
  cursor_opened: "Cursor is open. Let's build something great!",
  workspace_opened: "New workspace loaded. I'm ready to help.",
  git_dirty: "You have uncommitted changes.",
  git_clean: "Working tree is clean. Nice!",
  git_commit_created: "Commit saved. Great progress!",
  git_push_started: "Pushing your changes...",
  git_push_success: "Nice push! Your code is live.",
  git_push_failed: "Push failed. Want to check the error?",
  branch_changed: "Branch changed. Fresh context!",
  build_error: "Build failed. Want to check the error?",
  test_failed: "Tests failed. Time to investigate.",
  merge_conflict: "Merge conflict detected. Careful!",
  unsaved_files: "You have unsaved files open.",
  stale_branch: "This branch hasn't moved in a while.",
  language_focus: "Deep in code mode.",
  no_commits_today: "No commits yet today. Ship something!",
  long_session: "Long coding session. Maybe commit soon?",
  ai_usage_update: "Token usage updated.",
  warning: "Heads up — something needs attention.",
  custom_message: "Pixel Agent says hello!",
};

export function messageForEvent(event: PixelAgentEvent): string {
  const payloadMessage = event.payload?.message;
  if (typeof payloadMessage === "string" && payloadMessage.trim().length > 0) {
    return payloadMessage;
  }

  const branch = event.payload?.branch;
  const repo = event.payload?.repo;
  const repoShort = repo ? repo.split(/[\\/]/).pop() : null;

  switch (event.type) {
    case "branch_changed":
      return branch ? `You're on branch: ${branch}` : DEFAULT_EVENT_MESSAGES.branch_changed!;
    case "git_commit_created":
      return branch
        ? `Commit saved on ${branch}. Great progress!`
        : DEFAULT_EVENT_MESSAGES.git_commit_created!;
    case "git_push_success":
      return branch
        ? `Nice push on ${branch}! Your code is live.`
        : DEFAULT_EVENT_MESSAGES.git_push_success!;
    case "git_dirty":
      return branch
        ? `Uncommitted changes on ${branch}.`
        : DEFAULT_EVENT_MESSAGES.git_dirty!;
    case "unsaved_files": {
      const count = event.payload?.unsavedCount;
      return typeof count === "number"
        ? `You have ${count} unsaved file${count === 1 ? "" : "s"}.`
        : DEFAULT_EVENT_MESSAGES.unsaved_files!;
    }
    case "language_focus": {
      const lang = event.payload?.language;
      return lang ? `Lots of ${lang} today.` : DEFAULT_EVENT_MESSAGES.language_focus!;
    }
    case "long_session": {
      const mins = event.payload?.sessionMinutes;
      return typeof mins === "number"
        ? `You've been coding for ${mins} minutes. Maybe commit soon?`
        : DEFAULT_EVENT_MESSAGES.long_session!;
    }
    case "stale_branch":
      return branch
        ? `Branch ${branch} looks stale. Rebase or merge?`
        : DEFAULT_EVENT_MESSAGES.stale_branch!;
    case "no_commits_today":
      return repoShort
        ? `No commits in ${repoShort} today yet.`
        : DEFAULT_EVENT_MESSAGES.no_commits_today!;
    default:
      break;
  }

  return DEFAULT_EVENT_MESSAGES[event.type] ?? "Pixel Agent noticed an update.";
}
