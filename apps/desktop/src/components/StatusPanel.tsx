import type { AgentStatusSnapshot } from "../store/agentStatus";

interface StatusPanelProps {
  open: boolean;
  status: AgentStatusSnapshot;
  isMuted: boolean;
  onClose: () => void;
  onRefreshUsage: () => void;
}

function formatGitStatus(gitStatus: AgentStatusSnapshot["gitStatus"]): string {
  if (gitStatus === "dirty") {
    return "Uncommitted changes";
  }
  if (gitStatus === "clean") {
    return "Clean";
  }
  return "Unknown";
}

function formatTimestamp(value: string | null): string {
  if (!value) {
    return "No events yet";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function StatusPanel({ open, status, isMuted, onClose, onRefreshUsage }: StatusPanelProps) {
  if (!open) {
    return null;
  }

  return (
    <section className="status-panel no-drag" aria-label="Pixel Agent status">
      <h2 className="status-panel__title">Agent Status</h2>
      <div className="status-panel__grid">
        <div className="status-panel__row">
          <span className="status-panel__label">Mood</span>
          <span className="status-panel__value">
            {status.mood} ({status.moodScore})
          </span>
        </div>
        <div className="status-panel__row">
          <span className="status-panel__label">Repo</span>
          <span className="status-panel__value">{status.repo ?? "—"}</span>
        </div>
        <div className="status-panel__row">
          <span className="status-panel__label">Branch</span>
          <span className="status-panel__value">{status.branch ?? "—"}</span>
        </div>
        <div className="status-panel__row">
          <span className="status-panel__label">Git</span>
          <span className="status-panel__value">{formatGitStatus(status.gitStatus)}</span>
        </div>
        <div className="status-panel__row">
          <span className="status-panel__label">Language</span>
          <span className="status-panel__value">{status.activeLanguage ?? "—"}</span>
        </div>
        <div className="status-panel__row">
          <span className="status-panel__label">Unsaved</span>
          <span className="status-panel__value">
            {status.unsavedCount !== null ? status.unsavedCount : "—"}
          </span>
        </div>
        <div className="status-panel__row">
          <span className="status-panel__label">Last event</span>
          <span className="status-panel__value">
            {status.lastEventLabel ?? "—"} · {formatTimestamp(status.lastEventAt)}
          </span>
        </div>
        <div className="status-panel__row">
          <span className="status-panel__label">Connection</span>
          <span
            className={`status-panel__value ${
              status.connectionStatus === "connected" ? "is-connected" : "is-waiting"
            }`}
          >
            {status.connectionStatus === "connected" ? "Extension linked" : "Waiting for extension"}
          </span>
        </div>
        <div className="status-panel__row">
          <span className="status-panel__label">Usage</span>
          <span className="status-panel__value">{status.usageSummary ?? "Not available"}</span>
        </div>
        {status.usageTrend ? (
          <div className="status-panel__row">
            <span className="status-panel__label">Trend</span>
            <span className="status-panel__value">{status.usageTrend}</span>
          </div>
        ) : null}
        {isMuted ? (
          <div className="status-panel__row">
            <span className="status-panel__label">Alerts</span>
            <span className="status-panel__value is-waiting">Muted</span>
          </div>
        ) : null}
      </div>

      {status.recentEvents.length > 0 ? (
        <div className="mt-3 border-t border-bubble-border/30 pt-2">
          <p className="mb-2 font-pixel text-[8px] uppercase tracking-wide">Recent events</p>
          <ul className="max-h-24 space-y-1 overflow-y-auto text-[9px] leading-snug">
            {status.recentEvents.map((entry) => (
              <li key={`${entry.at}-${entry.type}`}>
                <span className="opacity-70">{formatTimestamp(entry.at)}</span> · {entry.message}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <button type="button" className="status-panel__close mt-2" onClick={onRefreshUsage}>
        Refresh usage
      </button>
      <button type="button" className="status-panel__close mt-2" onClick={onClose}>
        Close
      </button>
    </section>
  );
}
