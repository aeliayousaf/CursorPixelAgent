import { app, BrowserWindow, ipcMain, Menu, Tray, nativeImage } from "electron";
import path from "node:path";
import { EventWebSocketServer } from "./websocketServer";
import { SettingsStore, type AppSettings } from "./settingsStore";
import { CursorApiService } from "../services/cursorApi";

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let wsServer: EventWebSocketServer | null = null;
let cursorApi: CursorApiService | null = null;
let usagePollTimer: NodeJS.Timeout | null = null;

const settingsStore = new SettingsStore();

function getPreloadPath(): string {
  return path.join(__dirname, "preload.js");
}

function getRendererUrl(): string {
  const devUrl = process.env.VITE_DEV_SERVER_URL;
  if (devUrl) {
    return devUrl;
  }
  return `file://${path.join(__dirname, "../../renderer/index.html")}`;
}

function broadcastToRenderer(channel: string, payload: unknown): void {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }
  mainWindow.webContents.send(channel, payload);
}

function applyWindowSettings(settings: AppSettings): void {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }
  mainWindow.setAlwaysOnTop(settings.alwaysOnTop, "screen-saver");
  mainWindow.webContents.send("settings:updated", settings);
}

function restartUsagePolling(): void {
  if (usagePollTimer) {
    clearInterval(usagePollTimer);
    usagePollTimer = null;
  }

  const settings = settingsStore.get();
  if (!settings.cursorApiKey) {
    return;
  }

  cursorApi = new CursorApiService({
    apiKey: settings.cursorApiKey,
    teamId: settings.teamId,
  });

  const poll = async (): Promise<void> => {
    if (!cursorApi) {
      return;
    }
    const usage = await cursorApi.fetchUsageSummary();
    if (!usage) {
      return;
    }
    wsServer?.emitLocalEvent({
      type: "ai_usage_update",
      source: "desktop-cursor-api",
      timestamp: new Date().toISOString(),
      payload: {
        message:
          usage.message ??
          (usage.usagePercent !== undefined
            ? `Token usage is at ${usage.usagePercent}% today.`
            : "Token usage updated."),
        usagePercent: usage.usagePercent,
      },
    });
  };

  void poll();
  usagePollTimer = setInterval(() => {
    void poll();
  }, Math.max(settings.usagePollIntervalMs, 30_000));
}

function createMainWindow(): void {
  const settings = settingsStore.get();

  mainWindow = new BrowserWindow({
    width: 280,
    height: 320,
    transparent: true,
    frame: false,
    resizable: false,
    hasShadow: false,
    alwaysOnTop: settings.alwaysOnTop,
    skipTaskbar: true,
    show: false,
    webPreferences: {
      preload: getPreloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false,
    },
  });

  mainWindow.setAlwaysOnTop(settings.alwaysOnTop, "screen-saver");
  mainWindow.setIgnoreMouseEvents(false);
  mainWindow.loadURL(getRendererUrl());

  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
    applyWindowSettings(settingsStore.get());
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function createTray(): void {
  const icon = nativeImage.createEmpty();
  tray = new Tray(icon);
  tray.setToolTip("Pixel Agent");
  tray.on("double-click", () => {
    if (!mainWindow || mainWindow.isDestroyed()) {
      createMainWindow();
      return;
    }
    mainWindow.show();
  });
}

function registerIpc(): void {
  ipcMain.handle("settings:get", () => settingsStore.get());

  ipcMain.handle("settings:update", (_event, partial: Partial<AppSettings>) => {
    const next = settingsStore.update(partial);
    applyWindowSettings(next);
    app.setLoginItemSettings({
      openAtLogin: next.launchAtStartup,
      openAsHidden: false,
    });
    restartUsagePolling();
    return next;
  });

  ipcMain.on("window:drag-start", () => {
    if (!mainWindow || mainWindow.isDestroyed()) {
      return;
    }
    mainWindow.setIgnoreMouseEvents(false);
  });

  ipcMain.on("window:hide", () => {
    mainWindow?.hide();
  });

  ipcMain.on("app:quit", () => {
    app.quit();
  });

  ipcMain.on("context:open", () => {
    const menu = Menu.buildFromTemplate([
      {
        label: "Settings",
        click: () => broadcastToRenderer("ui:open-settings", null),
      },
      {
        label: "Hide",
        click: () => mainWindow?.hide(),
      },
      {
        label: "Test Animation",
        click: () =>
          wsServer?.emitLocalEvent({
            type: "custom_message",
            source: "desktop-ui",
            timestamp: new Date().toISOString(),
            payload: { message: "Test animation from the tray menu." },
          }),
      },
      { type: "separator" },
      {
        label: "Quit",
        click: () => app.quit(),
      },
    ]);
    menu.popup({ window: mainWindow ?? undefined });
  });
}

function startWebSocketServer(): void {
  wsServer = new EventWebSocketServer({
    port: settingsStore.get().wsPort,
    onEvent: (event) => {
      broadcastToRenderer("agent:event", event);
    },
  });
  wsServer.start();
}

app.whenReady().then(() => {
  const settings = settingsStore.get();
  app.setLoginItemSettings({
    openAtLogin: settings.launchAtStartup,
    openAsHidden: false,
  });
  createMainWindow();
  createTray();
  registerIpc();
  startWebSocketServer();
  restartUsagePolling();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  if (usagePollTimer) {
    clearInterval(usagePollTimer);
  }
  wsServer?.stop();
});
