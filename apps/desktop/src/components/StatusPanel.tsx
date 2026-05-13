import type { AgentStatusSnapshot } from "../store/agentStatus";

interface StatusPanelProps {
  open: boolean;
  status: AgentStatusSnapshot;
  onClose: () => void;
}

function formatGitStatus(status: AgentStatusSnapshot["gitStatus"]): string {
  if (status === "dirty") {
    return "Uncommitted changes";
  }
  if (status === "clean") {
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

export function StatusPanel({ open, status, onClose }: StatusPanelProps) {
  if (!open) {
    return null;
  }

  return (
    <section className="status-panel no-drag" aria-label="Pixel Agent status">
      <h2 className="status-panel__title">Agent Status</h2>
      <div className="status-panel__grid">
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
      </div>
      <button type="button" className="status-panel__close" onClick={onClose}>
        Close
      </button>
    </section>
  );
}
