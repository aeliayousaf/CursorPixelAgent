import type { AppSettings } from "../types/settings";
import type { PixelAgentEvent } from "@pixel-agent/shared";
import type { WalkerState } from "./windowWalker";

export interface DesktopApi {
  getSettings: () => Promise<AppSettings>;
  updateSettings: (partial: Partial<AppSettings>) => Promise<AppSettings>;
  onAgentEvent: (callback: (event: PixelAgentEvent) => void) => () => void;
  onSettingsUpdated: (callback: (settings: AppSettings) => void) => () => void;
  onOpenSettings: (callback: () => void) => () => void;
  onWalkerState: (callback: (state: WalkerState) => void) => () => void;
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

import { contextBridge, ipcRenderer } from "electron";

const desktopApi: DesktopApi = {
  getSettings: () => ipcRenderer.invoke("settings:get"),
  updateSettings: (partial) => ipcRenderer.invoke("settings:update", partial),
  onAgentEvent: (callback) => {
    const listener = (_event: Electron.IpcRendererEvent, payload: PixelAgentEvent) => {
      callback(payload);
    };
    ipcRenderer.on("agent:event", listener);
    return () => ipcRenderer.removeListener("agent:event", listener);
  },
  onSettingsUpdated: (callback) => {
    const listener = (_event: Electron.IpcRendererEvent, payload: AppSettings) => {
      callback(payload);
    };
    ipcRenderer.on("settings:updated", listener);
    return () => ipcRenderer.removeListener("settings:updated", listener);
  },
  onOpenSettings: (callback) => {
    const listener = () => callback();
    ipcRenderer.on("ui:open-settings", listener);
    return () => ipcRenderer.removeListener("ui:open-settings", listener);
  },
  onWalkerState: (callback) => {
    const listener = (_event: Electron.IpcRendererEvent, payload: WalkerState) => {
      callback(payload);
    };
    ipcRenderer.on("walker:state", listener);
    return () => ipcRenderer.removeListener("walker:state", listener);
  },
  setWalkerPaused: (paused) => ipcRenderer.send("walker:set-paused", paused),
  hideWindow: () => ipcRenderer.send("window:hide"),
  quitApp: () => ipcRenderer.send("app:quit"),
  openContextMenu: () => ipcRenderer.send("context:open"),
  notifyDragStart: () => ipcRenderer.send("window:drag-start"),
};

contextBridge.exposeInMainWorld("pixelAgent", desktopApi);
