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
};

export class SettingsStore {
  private readonly store = new Store<AppSettings>({
    name: "pixel-agent-settings",
    defaults,
  });

  get(): AppSettings {
    return { ...defaults, ...this.store.store };
  }

  update(partial: Partial<AppSettings>): AppSettings {
    for (const [key, value] of Object.entries(partial)) {
      if (value !== undefined) {
        this.store.set(key as keyof AppSettings, value as AppSettings[keyof AppSettings]);
      }
    }
    return this.get();
  }
}

export type { AppSettings };
