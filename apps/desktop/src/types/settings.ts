export interface AppSettings {
  alwaysOnTop: boolean;
  characterScale: number;
  muteSounds: boolean;
  theme: "classic" | "sunset" | "forest";
  launchAtStartup: boolean;
  cursorApiKey: string;
  teamId: string;
  usagePollIntervalMs: number;
  wsPort: number;
  mutedUntil: number;
}
