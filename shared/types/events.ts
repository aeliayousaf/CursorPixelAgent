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
  error?: string;
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
  ai_usage_update: "idle",
  warning: "alert",
  custom_message: "idle",
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
  ai_usage_update: "Token usage is getting high today.",
  warning: "Heads up — something needs attention.",
  custom_message: "Pixel Agent says hello!",
};

export function messageForEvent(event: PixelAgentEvent): string {
  const payloadMessage = event.payload?.message;
  if (typeof payloadMessage === "string" && payloadMessage.trim().length > 0) {
    return payloadMessage;
  }

  const branch = event.payload?.branch;
  if (event.type === "branch_changed" && typeof branch === "string") {
    return `You're on branch: ${branch}`;
  }

  return DEFAULT_EVENT_MESSAGES[event.type] ?? "Pixel Agent noticed an update.";
}
