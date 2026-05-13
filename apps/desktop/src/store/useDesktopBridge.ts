import { useCallback, useEffect, useState } from "react";
import { PIXEL_AGENT_WS_PORT } from "@pixel-agent/shared";
import type { AppSettings } from "../types/settings";
import type { PixelAgentEvent } from "@pixel-agent/shared";
import { presentationForEvent } from "../store/agentStore";
import {
  applyEventToAgentStatus,
  INITIAL_AGENT_STATUS,
  type AgentStatusSnapshot,
} from "../store/agentStatus";

const defaultSettings: AppSettings = {
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

const CONNECTION_STALE_MS = 120_000;

export function useDesktopBridge() {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [latestEvent, setLatestEvent] = useState<PixelAgentEvent | null>(null);
  const [agentStatus, setAgentStatus] = useState<AgentStatusSnapshot>(INITIAL_AGENT_STATUS);
  const [bubbleMessage, setBubbleMessage] = useState<string | null>(null);
  const [animation, setAnimation] = useState<"idle" | "happy" | "alert" | "thinking" | "sleeping">("idle");
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    window.pixelAgent
      .getSettings()
      .then((value) => {
        if (!cancelled) {
          setSettings(value);
        }
      })
      .catch(() => undefined);

    const unsubEvent = window.pixelAgent.onAgentEvent((event) => {
      const presentation = presentationForEvent(event);
      const updateStatusOnly =
        event.type === "ai_usage_update" && event.payload?.updateStatusOnly === true;

      setLatestEvent(event);
      setAgentStatus((previous) => applyEventToAgentStatus(previous, event));

      if (updateStatusOnly) {
        return;
      }

      setAnimation(presentation.animation);
      setBubbleMessage(presentation.message);
    });

    const unsubSettings = window.pixelAgent.onSettingsUpdated((value) => {
      setSettings(value);
    });

    const unsubOpenSettings = window.pixelAgent.onOpenSettings(() => {
      setSettingsOpen(true);
    });

    return () => {
      cancelled = true;
      unsubEvent();
      unsubSettings();
      unsubOpenSettings();
    };
  }, []);

  useEffect(() => {
    if (!bubbleMessage) {
      return;
    }
    const timer = window.setTimeout(() => setBubbleMessage(null), 5000);
    return () => window.clearTimeout(timer);
  }, [bubbleMessage]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setAgentStatus((previous) => {
        if (previous.connectionStatus !== "connected" || !previous.lastExtensionAt) {
          return previous;
        }
        const elapsed = Date.now() - new Date(previous.lastExtensionAt).getTime();
        if (elapsed <= CONNECTION_STALE_MS) {
          return previous;
        }
        return { ...previous, connectionStatus: "waiting" };
      });
    }, 15_000);

    return () => window.clearInterval(timer);
  }, []);

  const updateSettings = useCallback(async (partial: Partial<AppSettings>) => {
    const next = await window.pixelAgent.updateSettings(partial);
    setSettings(next);
    return next;
  }, []);

  const triggerTestAnimation = useCallback(() => {
    const presentation = presentationForEvent({
      type: "custom_message",
      source: "desktop-ui",
      timestamp: new Date().toISOString(),
      payload: { message: "Test animation!" },
    });
    setAnimation(presentation.animation);
    setBubbleMessage(presentation.message);
  }, []);

  return {
    settings,
    latestEvent,
    agentStatus,
    bubbleMessage,
    animation,
    settingsOpen,
    setSettingsOpen,
    updateSettings,
    triggerTestAnimation,
    hideWindow: () => window.pixelAgent.hideWindow(),
    quitApp: () => window.pixelAgent.quitApp(),
    openContextMenu: () => window.pixelAgent.openContextMenu(),
  };
}
