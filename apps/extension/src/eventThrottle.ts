import type { PixelAgentEventType } from "@pixel-agent/shared";
import { EVENT_COOLDOWN_MS } from "@pixel-agent/shared";

export class EventThrottle {
  private readonly lastSent = new Map<string, number>();

  shouldSend(type: PixelAgentEventType, dedupeKey?: string): boolean {
    const key = dedupeKey ? `${type}:${dedupeKey}` : type;
    const cooldown = EVENT_COOLDOWN_MS[type] ?? 60_000;
    const last = this.lastSent.get(key) ?? 0;
    if (Date.now() - last < cooldown) {
      return false;
    }
    this.lastSent.set(key, Date.now());
    return true;
  }

  reset(type?: PixelAgentEventType): void {
    if (!type) {
      this.lastSent.clear();
      return;
    }
    for (const key of this.lastSent.keys()) {
      if (key === type || key.startsWith(`${type}:`)) {
        this.lastSent.delete(key);
      }
    }
  }
}
