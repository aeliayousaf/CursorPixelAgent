import type { AppSettings } from "../types/settings";
import type { PixelAgentEvent } from "@pixel-agent/shared";

export interface WalkerViewState {
  walking: boolean;
  facingLeft: boolean;
}

export interface DesktopApi {
  getSettings: () => Promise<AppSettings>;
  updateSettings: (partial: Partial<AppSettings>) => Promise<AppSettings>;
  onAgentEvent: (callback: (event: PixelAgentEvent) => void) => () => void;
  onSettingsUpdated: (callback: (settings: AppSettings) => void) => () => void;
  onOpenSettings: (callback: () => void) => () => void;
  onWalkerState: (callback: (state: WalkerViewState) => void) => () => void;
  setWalkerPaused: (paused: boolean) => void;
  hideWindow: () => void;
  quitApp: () => void;
  openContextMenu: () => void;
  notifyDragStart: () => void;
}

declare global {
  interface Window {
    pixelAgent: DesktopApi;
  }
}

export {};
