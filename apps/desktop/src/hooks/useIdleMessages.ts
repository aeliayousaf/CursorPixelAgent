import { useEffect, useRef, useState } from "react";
import type { AgentStatusSnapshot } from "../store/agentStatus";

const MIN_INTERVAL_MS = 150_000;
const MAX_INTERVAL_MS = 240_000;
const MESSAGE_VISIBLE_MS = 5_000;

function randomInterval(): number {
  return MIN_INTERVAL_MS + Math.floor(Math.random() * (MAX_INTERVAL_MS - MIN_INTERVAL_MS));
}

function buildContextMessages(status: AgentStatusSnapshot): string[] {
  const messages: string[] = [];

  if (status.branch) {
    messages.push(`I'm watching branch ${status.branch}.`);
  }
  if (status.repo && status.gitStatus === "dirty") {
    messages.push(`${status.repo} has uncommitted changes.`);
  }
  if (status.repo && status.gitStatus === "clean") {
    messages.push(`${status.repo} looks calm.`);
  }
  if (status.activeLanguage) {
    messages.push(`Still deep in ${status.activeLanguage}?`);
  }
  if (status.unsavedCount && status.unsavedCount >= 2) {
    messages.push(`${status.unsavedCount} unsaved files — save soon?`);
  }
  if (status.mood === "happy" || status.mood === "ecstatic") {
    messages.push("Good vibes on this branch.");
  }
  if (status.mood === "concerned" || status.mood === "stressed") {
    messages.push("Rough patch? I'm here.");
  }

  messages.push(
    "Still coding?",
    "Don't forget to commit.",
    "Tiny agent, big deploy energy.",
    "Need a break? Hydrate.",
  );

  return messages;
}

function pickMessage(status: AgentStatusSnapshot, previous: string | null): string {
  const pool = buildContextMessages(status).filter((message) => message !== previous);
  const options = pool.length > 0 ? pool : buildContextMessages(status);
  return options[Math.floor(Math.random() * options.length)] ?? "Still coding?";
}

export function useIdleMessages(enabled: boolean, status: AgentStatusSnapshot) {
  const [message, setMessage] = useState<string | null>(null);
  const previousMessageRef = useRef<string | null>(null);
  const scheduleTimerRef = useRef<number | null>(null);
  const hideTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) {
      setMessage(null);
      return;
    }

    const clearTimers = () => {
      if (scheduleTimerRef.current) {
        window.clearTimeout(scheduleTimerRef.current);
        scheduleTimerRef.current = null;
      }
      if (hideTimerRef.current) {
        window.clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
    };

    const scheduleNext = () => {
      scheduleTimerRef.current = window.setTimeout(() => {
        const nextMessage = pickMessage(status, previousMessageRef.current);
        previousMessageRef.current = nextMessage;
        setMessage(nextMessage);
        hideTimerRef.current = window.setTimeout(() => {
          setMessage(null);
          scheduleNext();
        }, MESSAGE_VISIBLE_MS);
      }, randomInterval());
    };

    scheduleNext();
    return clearTimers;
  }, [enabled, status.branch, status.repo, status.gitStatus, status.activeLanguage, status.mood]);

  return message;
}
