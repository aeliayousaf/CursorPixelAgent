import * as vscode from "vscode";
import type { PixelAgentEvent } from "@pixel-agent/shared";
import { registerPixelAgentCommands } from "./commands";
import { GitWatcher } from "./gitWatcher";
import { PixelAgentWebSocketClient } from "./websocketClient";

let client: PixelAgentWebSocketClient | null = null;
let gitWatcher: GitWatcher | null = null;

export function activate(context: vscode.ExtensionContext): void {
  const showStatus = (message: string): void => {
    void vscode.window.setStatusBarMessage(`Pixel Agent: ${message}`, 4000);
  };

  const sendEvent = (event: PixelAgentEvent): void => {
    client?.send(event);
  };

  client = new PixelAgentWebSocketClient({ onStatus: showStatus });
  gitWatcher = new GitWatcher(sendEvent, showStatus);

  registerPixelAgentCommands(context, client, gitWatcher, sendEvent);

  client.connect();
  void gitWatcher.start();

  sendEvent({
    type: "cursor_opened",
    source: "cursor-extension",
    timestamp: new Date().toISOString(),
    payload: { message: "Cursor is open. Let's build something great!" },
  });

  context.subscriptions.push({
    dispose: () => {
      client?.disconnect();
      gitWatcher?.dispose();
      client = null;
      gitWatcher = null;
    },
  });
}

export function deactivate(): void {
  client?.disconnect();
  gitWatcher?.dispose();
}
