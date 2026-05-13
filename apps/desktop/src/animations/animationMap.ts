import type { PixelAgentAnimation } from "@pixel-agent/shared";

export const ANIMATION_CLASS_MAP: Record<PixelAgentAnimation, string> = {
  idle: "animate-idle",
  happy: "animate-happy",
  alert: "animate-alert",
  thinking: "animate-thinking",
  sleeping: "animate-sleeping",
};

export const ANIMATION_LABELS: Record<PixelAgentAnimation, string> = {
  idle: "Idle",
  happy: "Happy",
  alert: "Alert",
  thinking: "Thinking",
  sleeping: "Sleeping",
};
