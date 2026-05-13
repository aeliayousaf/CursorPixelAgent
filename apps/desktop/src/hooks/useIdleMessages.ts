import { useEffect, useRef, useState } from "react";

const IDLE_MESSAGES = [
  "Still coding?",
  "Your repo looks calm.",
  "Don't forget to commit.",
  "I'm watching the branch.",
  "Tiny agent, big deploy energy.",
] as const;

const MIN_INTERVAL_MS = 150_000;
const MAX_INTERVAL_MS = 240_000;
const MESSAGE_VISIBLE_MS = 5_000;

function randomInterval(): number {
  return MIN_INTERVAL_MS + Math.floor(Math.random() * (MAX_INTERVAL_MS - MIN_INTERVAL_MS));
}

function pickMessage(previous: string | null): string {
  const options = IDLE_MESSAGES.filter((message) => message !== previous);
  const pool = options.length > 0 ? options : IDLE_MESSAGES;
  return pool[Math.floor(Math.random() * pool.length)] ?? IDLE_MESSAGES[0];
}

export function useIdleMessages(enabled: boolean) {
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
        const nextMessage = pickMessage(previousMessageRef.current);
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
  }, [enabled]);

  return message;
}
