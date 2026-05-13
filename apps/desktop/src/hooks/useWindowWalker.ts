import { useEffect, useState } from "react";

export interface WalkerViewState {
  walking: boolean;
  facingLeft: boolean;
}

const DEFAULT_WALKER_STATE: WalkerViewState = {
  walking: false,
  facingLeft: false,
};

export function useWindowWalker(paused: boolean) {
  const [walkerState, setWalkerState] = useState<WalkerViewState>(DEFAULT_WALKER_STATE);

  useEffect(() => {
    const unsubscribe = window.pixelAgent.onWalkerState((state) => {
      setWalkerState(state);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (paused) {
      window.pixelAgent.setWalkerPaused(true);
      return;
    }

    window.pixelAgent.setWalkerPaused(false);

    const onMouseUp = () => {
      window.pixelAgent.setWalkerPaused(false);
    };

    window.addEventListener("mouseup", onMouseUp);
    return () => window.removeEventListener("mouseup", onMouseUp);
  }, [paused]);

  return walkerState;
}
