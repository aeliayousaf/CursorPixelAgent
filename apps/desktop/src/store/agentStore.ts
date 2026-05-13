import {
  EVENT_ANIMATION_MAP,
  messageForEvent,
  type PixelAgentAnimation,
  type PixelAgentEvent,
} from "@pixel-agent/shared";

export interface AgentPresentation {
  animation: PixelAgentAnimation;
  message: string;
}

export function presentationForEvent(event: PixelAgentEvent): AgentPresentation {
  return {
    animation: EVENT_ANIMATION_MAP[event.type],
    message: messageForEvent(event),
  };
}
