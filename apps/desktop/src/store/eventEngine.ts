import {
  EVENT_PRIORITY,
  type PixelAgentAnimation,
  type PixelAgentEvent,
  type PixelAgentEventType,
} from "@pixel-agent/shared";
import { presentationForEvent } from "./agentStore";

export interface EventPresentation {
  animation: PixelAgentAnimation;
  message: string;
  priority: number;
  playSound: "happy" | "alert" | "none";
  moodDelta: number;
}

const ALERT_TYPES = new Set<PixelAgentEventType>([
  "merge_conflict",
  "test_failed",
  "build_error",
  "git_push_failed",
  "warning",
]);

const HAPPY_TYPES = new Set<PixelAgentEventType>([
  "git_commit_created",
  "git_push_success",
  "cursor_opened",
  "workspace_opened",
]);

export class EventEngine {
  private readonly cooldowns = new Map<PixelAgentEventType, number>();
  private currentPriority = 0;
  private currentBubbleUntil = 0;

  evaluate(event: PixelAgentEvent, muted: boolean): {
    showBubble: boolean;
    presentation: EventPresentation;
  } {
    const presentation = this.buildPresentation(event);
    const updateStatusOnly =
      event.type === "ai_usage_update" && event.payload?.updateStatusOnly === true;

    if (updateStatusOnly) {
      return { showBubble: false, presentation };
    }

    if (muted && presentation.priority < 80) {
      return { showBubble: false, presentation };
    }

    const now = Date.now();
    const cooldownUntil = this.cooldowns.get(event.type) ?? 0;
    if (now < cooldownUntil && presentation.priority < 85) {
      return { showBubble: false, presentation };
    }

    if (now < this.currentBubbleUntil && presentation.priority <= this.currentPriority) {
      return { showBubble: false, presentation };
    }

    this.cooldowns.set(event.type, now + getCooldownMs(event.type));
    this.currentPriority = presentation.priority;
    this.currentBubbleUntil = now + 5_000;

    return { showBubble: true, presentation };
  }

  resetBubbleLock(): void {
    this.currentBubbleUntil = 0;
    this.currentPriority = 0;
  }

  private buildPresentation(event: PixelAgentEvent): EventPresentation {
    const base = presentationForEvent(event);
    const priority = EVENT_PRIORITY[event.type] ?? 30;
    let moodDelta = 0;
    if (typeof event.payload?.moodDelta === "number") {
      moodDelta = event.payload.moodDelta;
    } else if (HAPPY_TYPES.has(event.type)) {
      moodDelta = 1;
    } else if (ALERT_TYPES.has(event.type)) {
      moodDelta = -2;
    }

    let playSound: EventPresentation["playSound"] = "none";
    if (HAPPY_TYPES.has(event.type)) {
      playSound = "happy";
    } else if (ALERT_TYPES.has(event.type)) {
      playSound = "alert";
    }

    return {
      animation: base.animation,
      message: base.message,
      priority,
      playSound,
      moodDelta,
    };
  }
}

function getCooldownMs(type: PixelAgentEventType): number {
  const map: Partial<Record<PixelAgentEventType, number>> = {
    git_dirty: 300_000,
    git_clean: 300_000,
    language_focus: 600_000,
    unsaved_files: 300_000,
    long_session: 1_800_000,
    warning: 600_000,
  };
  return map[type] ?? 120_000;
}
