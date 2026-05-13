import type { AppSettings } from "../types/settings";

interface SettingsPanelProps {
  open: boolean;
  settings: AppSettings;
  onClose: () => void;
  onChange: (partial: Partial<AppSettings>) => Promise<void>;
}

export function SettingsPanel({ open, settings, onClose, onChange }: SettingsPanelProps) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="settings-panel no-drag absolute inset-0 z-30 flex items-start justify-center overflow-y-auto bg-black/35 p-3"
      onMouseDown={onClose}
    >
      <div
        className="no-drag w-full max-w-[250px] rounded-2xl border-2 border-bubble-border bg-[#fffaf0] p-3 text-[11px] text-bubble-border shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="sticky top-0 z-10 mb-3 flex items-center justify-between bg-[#fffaf0] pb-2">
          <h2 className="font-pixel text-[10px] uppercase tracking-wide">Settings</h2>
          <button
            type="button"
            className="no-drag rounded border border-bubble-border px-2 py-1 hover:bg-white/70"
            onMouseDown={(event) => event.stopPropagation()}
            onClick={onClose}
          >
            Close
          </button>
        </header>

        <label className="mb-3 flex items-center justify-between gap-2">
          <span>Always on top</span>
          <input
            type="checkbox"
            checked={settings.alwaysOnTop}
            onChange={(event) => void onChange({ alwaysOnTop: event.target.checked })}
          />
        </label>

        <label className="mb-3 block">
          <span className="mb-1 block">Character size</span>
          <input
            type="range"
            min={0.7}
            max={1.6}
            step={0.05}
            value={settings.characterScale}
            onChange={(event) => void onChange({ characterScale: Number(event.target.value) })}
            className="w-full"
          />
        </label>

        <label className="mb-3 flex items-center justify-between gap-2">
          <span>Mute sounds</span>
          <input
            type="checkbox"
            checked={settings.muteSounds}
            onChange={(event) => void onChange({ muteSounds: event.target.checked })}
          />
        </label>

        <label className="mb-3 block">
          <span className="mb-1 block">Theme</span>
          <select
            className="w-full rounded border border-bubble-border bg-white px-2 py-1"
            value={settings.theme}
            onChange={(event) =>
              void onChange({ theme: event.target.value as AppSettings["theme"] })
            }
          >
            <option value="classic">Classic</option>
            <option value="sunset">Sunset</option>
            <option value="forest">Forest</option>
          </select>
        </label>

        <label className="mb-3 flex items-center justify-between gap-2">
          <span>Startup with system</span>
          <input
            type="checkbox"
            checked={settings.launchAtStartup}
            onChange={(event) => void onChange({ launchAtStartup: event.target.checked })}
          />
        </label>

        <label className="mb-3 block">
          <span className="mb-1 block">Cursor API key</span>
          <input
            type="password"
            className="w-full rounded border border-bubble-border bg-white px-2 py-1"
            value={settings.cursorApiKey}
            onChange={(event) => void onChange({ cursorApiKey: event.target.value })}
            placeholder="Optional"
          />
        </label>

        <label className="mb-3 block">
          <span className="mb-1 block">Team ID</span>
          <input
            type="text"
            className="w-full rounded border border-bubble-border bg-white px-2 py-1"
            value={settings.teamId}
            onChange={(event) => void onChange({ teamId: event.target.value })}
            placeholder="Optional"
          />
        </label>

        <label className="block">
          <span className="mb-1 block">Usage polling interval (seconds)</span>
          <input
            type="number"
            min={30}
            step={30}
            className="w-full rounded border border-bubble-border bg-white px-2 py-1"
            value={Math.round(settings.usagePollIntervalMs / 1000)}
            onChange={(event) =>
              void onChange({ usagePollIntervalMs: Number(event.target.value) * 1000 })
            }
          />
        </label>
      </div>
    </div>
  );
}