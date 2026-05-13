import { useEffect, useState } from "react";
import { PixelAgent } from "../components/PixelAgent";
import { SettingsPanel } from "../components/SettingsPanel";
import { SpeechBubble } from "../components/SpeechBubble";
import { StatusPanel } from "../components/StatusPanel";
import { useAgentAnimation } from "../hooks/useAgentAnimation";
import { useIdleMessages } from "../hooks/useIdleMessages";
import { useDesktopBridge } from "../store/useDesktopBridge";

export function App() {
  const {
    settings,
    agentStatus,
    bubbleMessage,
    animation,
    settingsOpen,
    setSettingsOpen,
    updateSettings,
    triggerTestAnimation,
    hideWindow,
    quitApp,
    openContextMenu,
  } = useDesktopBridge();

  const [statusOpen, setStatusOpen] = useState(false);
  const idleMessage = useIdleMessages(!bubbleMessage && !settingsOpen && !statusOpen);
  const activeMessage = bubbleMessage ?? idleMessage;

  const {
    displayAnimation,
    isHovered,
    isClicked,
    handleMouseEnter,
    handleMouseLeave,
    handleClick,
  } = useAgentAnimation({
    eventAnimation: animation,
    activityKey: activeMessage,
    paused: settingsOpen || statusOpen,
  });

  useEffect(() => {
    if (!settingsOpen && !statusOpen) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }
      if (settingsOpen) {
        setSettingsOpen(false);
      }
      if (statusOpen) {
        setStatusOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [settingsOpen, statusOpen, setSettingsOpen]);

  return (
    <main
      className="relative h-screen w-screen select-none overflow-hidden bg-transparent"
      onContextMenu={(event) => {
        event.preventDefault();
        openContextMenu();
      }}
    >
      <SettingsPanel
        open={settingsOpen}
        settings={settings}
        onClose={() => setSettingsOpen(false)}
        onChange={updateSettings}
      />

      <StatusPanel open={statusOpen} status={agentStatus} onClose={() => setStatusOpen(false)} />

      <div className="flex h-full flex-col items-center justify-end gap-3 px-3 pb-4">
        {activeMessage ? <SpeechBubble message={activeMessage} /> : null}
        <div
          className="drag-region cursor-grab active:cursor-grabbing"
          onMouseDown={() => window.pixelAgent.notifyDragStart()}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onClick={handleClick}
          onDoubleClick={(event) => {
            event.preventDefault();
            setStatusOpen(true);
          }}
        >
          <PixelAgent
            animation={displayAnimation}
            scale={settings.characterScale}
            theme={settings.theme}
            isHovered={isHovered}
            isClicked={isClicked}
          />
        </div>
      </div>

      <div className="no-drag absolute bottom-1 right-1 flex gap-1 opacity-0 hover:opacity-100">
        <button
          type="button"
          className="rounded bg-white/80 px-2 py-1 text-[10px] text-bubble-border"
          onClick={() => setSettingsOpen(true)}
        >
          Settings
        </button>
        <button
          type="button"
          className="rounded bg-white/80 px-2 py-1 text-[10px] text-bubble-border"
          onClick={triggerTestAnimation}
        >
          Test
        </button>
        <button
          type="button"
          className="rounded bg-white/80 px-2 py-1 text-[10px] text-bubble-border"
          onClick={hideWindow}
        >
          Hide
        </button>
        <button
          type="button"
          className="rounded bg-white/80 px-2 py-1 text-[10px] text-bubble-border"
          onClick={quitApp}
        >
          Quit
        </button>
      </div>
    </main>
  );
}
