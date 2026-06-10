import Store from "electron-store";
import { PIXEL_AGENT_WS_PORT } from "@pixel-agent/shared";
import type { AppSettings } from "../types/settings";

const defaults: AppSettings = {
  alwaysOnTop: true,
  characterScale: 1,
  muteSounds: false,
  theme: "classic",
  launchAtStartup: false,
  cursorApiKey: "",
  teamId: "",
  usagePollIntervalMs: 300_000,
  wsPort: PIXEL_AGENT_WS_PORT,
  mutedUntil: 0,
};

export class SettingsStore {
  private readonly store = new Store<AppSettings>({
    name: "pixel-agent-settings",
    defaults,
  });

  get(): AppSettings {
    const stored = { ...defaults, ...this.store.store };
    return {
      ...stored,
      cursorApiKey: stored.cursorApiKey.trim(),
      teamId: stored.teamId.trim(),
    };
  }

  update(partial: Partial<AppSettings>): AppSettings {
    const normalized: Partial<AppSettings> = { ...partial };
    if (typeof normalized.cursorApiKey === "string") {
      normalized.cursorApiKey = normalized.cursorApiKey.trim();
    }
    if (typeof normalized.teamId === "string") {
      normalized.teamId = normalized.teamId.trim();
    }

    for (const [key, value] of Object.entries(normalized)) {
      if (value !== undefined) {
        this.store.set(key as keyof AppSettings, value as AppSettings[keyof AppSettings]);
      }
    }
    return this.get();
  }
}

export type { AppSettings };
