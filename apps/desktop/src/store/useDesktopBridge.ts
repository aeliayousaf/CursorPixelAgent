import { useCallback, useEffect, useRef, useState } from "react";
import { PIXEL_AGENT_WS_PORT } from "@pixel-agent/shared";
import type { AppSettings } from "../types/settings";
import type { PixelAgentEvent } from "@pixel-agent/shared";
import {
  applyEventToAgentStatus,
  INITIAL_AGENT_STATUS,
  type AgentStatusSnapshot,
} from "../store/agentStatus";
import { EventEngine } from "../store/eventEngine";
import { MoodTracker } from "../store/moodStore";
import { playAgentSound } from "../renderer/services/agentSounds";

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
  mutedUntil: 0,
};

const CONNECTION_STALE_MS = 120_000;

function isMuted(settings: AppSettings): boolean {
  return settings.mutedUntil > Date.now();
}

export function useDesktopBridge() {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [latestEvent, setLatestEvent] = useState<PixelAgentEvent | null>(null);
  const [agentStatus, setAgentStatus] = useState<AgentStatusSnapshot>(INITIAL_AGENT_STATUS);
  const [bubbleMessage, setBubbleMessage] = useState<string | null>(null);
  const [animation, setAnimation] = useState<"idle" | "happy" | "alert" | "thinking" | "sleeping">("idle");
  const [settingsOpen, setSettingsOpen] = useState(false);

  const eventEngineRef = useRef(new EventEngine());
  const moodTrackerRef = useRef(new MoodTracker());
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const handleAgentEvent = useCallback(
    async (event: PixelAgentEvent) => {
      if (event.payload?.action === "refresh_usage") {
        await window.pixelAgent.refreshUsage();
        return;
      }

      if (event.payload?.action === "mute" && typeof event.payload.muteUntil === "string") {
        const muteUntil = Date.parse(event.payload.muteUntil);
        if (!Number.isNaN(muteUntil)) {
          const next = await window.pixelAgent.updateSettings({ mutedUntil: muteUntil });
          setSettings(next);
        }
      }

      const muted = isMuted(settingsRef.current);
      const { showBubble, presentation } = eventEngineRef.current.evaluate(event, muted);
      const moodLevel = moodTrackerRef.current.applyDelta(presentation.moodDelta);

      setLatestEvent(event);
      setAgentStatus((previous) =>
        applyEventToAgentStatus(previous, event, moodLevel, moodTrackerRef.current.getScore()),
      );

      if (!showBubble) {
        return;
      }

      setAnimation(presentation.animation);
      setBubbleMessage(presentation.message);

      if (!settingsRef.current.muteSounds) {
        playAgentSound(presentation.playSound);
      }
    },
    [],
  );

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
      void handleAgentEvent(event);
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
  }, [handleAgentEvent]);

  useEffect(() => {
    if (!bubbleMessage) {
      return;
    }
    const timer = window.setTimeout(() => {
      setBubbleMessage(null);
      eventEngineRef.current.resetBubbleLock();
    }, 5000);
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
    void handleAgentEvent({
      type: "custom_message",
      source: "desktop-ui",
      timestamp: new Date().toISOString(),
      payload: { message: "Test animation!" },
    });
  }, [handleAgentEvent]);

  const refreshUsage = useCallback(async () => {
    await window.pixelAgent.refreshUsage();
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
    refreshUsage,
    isMuted: isMuted(settings),
    hideWindow: () => window.pixelAgent.hideWindow(),
    quitApp: () => window.pixelAgent.quitApp(),
    openContextMenu: () => window.pixelAgent.openContextMenu(),
  };
}
