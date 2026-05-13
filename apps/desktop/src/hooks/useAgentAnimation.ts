import { useCallback, useEffect, useRef, useState } from "react";
import type { PixelAgentAnimation } from "@pixel-agent/shared";

const SLEEP_AFTER_MS = 120_000;
const CLICK_REACTION_MS = 700;

interface UseAgentAnimationOptions {
  eventAnimation: PixelAgentAnimation;
  activityKey: string | number | null;
  paused?: boolean;
}

export function useAgentAnimation({
  eventAnimation,
  activityKey,
  paused = false,
}: UseAgentAnimationOptions) {
  const [displayAnimation, setDisplayAnimation] = useState<PixelAgentAnimation>(eventAnimation);
  const [isHovered, setIsHovered] = useState(false);
  const [isClicked, setIsClicked] = useState(false);
  const sleepTimerRef = useRef<number | null>(null);
  const clickTimerRef = useRef<number | null>(null);

  const clearSleepTimer = useCallback(() => {
    if (sleepTimerRef.current) {
      window.clearTimeout(sleepTimerRef.current);
      sleepTimerRef.current = null;
    }
  }, []);

  const scheduleSleeping = useCallback(() => {
    clearSleepTimer();
    if (paused) {
      return;
    }
    sleepTimerRef.current = window.setTimeout(() => {
      setDisplayAnimation("sleeping");
    }, SLEEP_AFTER_MS);
  }, [clearSleepTimer, paused]);

  useEffect(() => {
    setDisplayAnimation(eventAnimation);
    scheduleSleeping();
    return clearSleepTimer;
  }, [eventAnimation, activityKey, paused, scheduleSleeping, clearSleepTimer]);

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
    if (displayAnimation === "sleeping") {
      setDisplayAnimation("idle");
    }
    scheduleSleeping();
  }, [displayAnimation, scheduleSleeping]);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
  }, []);

  const handleClick = useCallback(() => {
    setIsClicked(true);
    setDisplayAnimation("happy");
    scheduleSleeping();
    if (clickTimerRef.current) {
      window.clearTimeout(clickTimerRef.current);
    }
    clickTimerRef.current = window.setTimeout(() => {
      setIsClicked(false);
      setDisplayAnimation(eventAnimation);
      scheduleSleeping();
    }, CLICK_REACTION_MS);
  }, [eventAnimation, scheduleSleeping]);

  useEffect(() => {
    return () => {
      clearSleepTimer();
      if (clickTimerRef.current) {
        window.clearTimeout(clickTimerRef.current);
      }
    };
  }, [clearSleepTimer]);

  return {
    displayAnimation,
    isHovered,
    isClicked,
    handleMouseEnter,
    handleMouseLeave,
    handleClick,
  };
}
