# Pixel Agent

Pixel Agent is a two-part companion for Cursor: a frameless Electron desktop pet and a VS Code/Cursor extension that streams workspace, Git, and task events over a local WebSocket bridge.

## Monorepo layout

```text
pixel-agent/
  apps/
    desktop/      Electron + React desktop pet
    extension/    Cursor / VS Code extension
  shared/
    types/
      events.ts   Shared event types and animation mapping
  package.json
  README.md
```

## Requirements

- Node.js 18 or newer
- npm 9 or newer
- Cursor or VS Code with the built-in Git extension enabled

## Install dependencies

From the repository root:

```bash
npm install
npm run build -w @pixel-agent/shared
```

## Run the desktop app

Development mode starts the Vite renderer, compiles the Electron main process, and launches Electron:

```bash
npm run dev:desktop
```

The desktop app listens for extension events on `ws://127.0.0.1:47321` by default.

### Package the desktop app

```bash
npm run package:desktop
```

Installers are written to `apps/desktop/release/`.

## Run the extension in development

1. Compile the extension:

```bash
npm run dev:extension
```

2. Open the `apps/extension` folder in Cursor or VS Code.
3. Press `F5` to launch an Extension Development Host.
4. In the host window, run **Pixel Agent: Connect** if the status bar shows a reconnect loop before the desktop app is running.

The extension activates on startup, connects to the desktop WebSocket server, and begins watching Git state.

## WebSocket bridge

The desktop app owns the WebSocket server. The extension is the client.

Default port: `47321`

Event shape:

```json
{
  "type": "git_push_success",
  "source": "cursor-extension",
  "timestamp": "2026-05-13T12:00:00.000Z",
  "payload": {
    "repo": "string",
    "branch": "string",
    "message": "string"
  }
}
```

Supported event types:

- `cursor_opened`
- `workspace_opened`
- `git_dirty`
- `git_clean`
- `git_commit_created`
- `git_push_started`
- `git_push_success`
- `git_push_failed`
- `branch_changed`
- `build_error`
- `test_failed`
- `merge_conflict`
- `unsaved_files`
- `stale_branch`
- `language_focus`
- `no_commits_today`
- `long_session`
- `ai_usage_update`
- `warning`
- `custom_message`

The desktop app validates incoming payloads with the shared type guards in `shared/types/events.ts`, maps each event to an animation, and shows a speech bubble for five seconds.

If the extension cannot connect, it retries every five seconds and shows a short status bar message without crashing the editor host.

## Add a new event type

1. Add the type to `PIXEL_AGENT_EVENT_TYPES` in `shared/types/events.ts`.
2. Add a default message and animation mapping in the same file.
3. Emit the event from the extension or desktop service.
4. Rebuild shared types and both apps:

```bash
npm run build -w @pixel-agent/shared
npm run build:extension
npm run build:desktop
```

## Cursor API integration

Optional usage polling lives in `apps/desktop/src/services/cursorApi.ts`.

Configure these fields in the desktop settings panel:

- Cursor API key
- Team ID when your account requires it
- Usage polling interval

The service is structured for usage events, spend tracking, and token usage calls, but endpoint URLs are intentionally left as TODO placeholders until they are confirmed against current Cursor Admin API documentation. Pixel Agent remains fully usable without the Cursor API because Git and extension events drive the character.

## Known limitations

- Cursor does not expose every real-time editor event through a public API, so the extension focuses on workspace, Git, task, and lightweight activity signals.
- Push detection is best-effort and is tied to task names that include `push`.
- Build failures are detected from task names that include `build`.
- The placeholder character is CSS/SVG-based so sprite sheets can be swapped in later without changing the event pipeline.

## Command palette

- `Pixel Agent: Connect`
- `Pixel Agent: Disconnect`
- `Pixel Agent: Send Test Message`
- `Pixel Agent: Show Current Git Status`
- `Pixel Agent: Ask`
- `Pixel Agent: Ping Desktop`
- `Pixel Agent: Nudge to Commit`
- `Pixel Agent: Mute for 1 Hour`
- `Pixel Agent: Refresh Usage`

## Desktop controls

- Drag the character to move the window
- Double-click for the status panel (mood, recent events, usage trend)
- Right-click for Settings, Refresh Usage, Nudge Commit, Mute, Hide, Test, Quit
- Use the settings panel for always-on-top, size, theme, mute, startup, API key, team ID, and polling interval
