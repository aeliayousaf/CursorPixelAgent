import { useEffect, useState } from "react";

interface SpeechBubbleProps {
  message: string;
}

export function SpeechBubble({ message }: SpeechBubbleProps) {
  const [visibleMessage, setVisibleMessage] = useState(message);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (message === visibleMessage) {
      setIsExiting(false);
      return;
    }

    setIsExiting(true);
    const timer = window.setTimeout(() => {
      setVisibleMessage(message);
      setIsExiting(false);
    }, 220);

    return () => window.clearTimeout(timer);
  }, [message, visibleMessage]);

  if (!visibleMessage) {
    return null;
  }

  return (
    <div
      className={`speech-bubble-shell ${isExiting ? "is-exiting" : ""}`}
      aria-live="polite"
    >
      <div className="speech-bubble">{visibleMessage}</div>
    </div>
  );
}
