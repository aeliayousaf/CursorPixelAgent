import * as vscode from "vscode";
import type { PixelAgentEvent } from "@pixel-agent/shared";
import { GitWatcher } from "./gitWatcher";
import { PixelAgentWebSocketClient } from "./websocketClient";

export function registerPixelAgentCommands(
  context: vscode.ExtensionContext,
  client: PixelAgentWebSocketClient,
  gitWatcher: GitWatcher,
  sendEvent: (event: PixelAgentEvent) => void,
): void {
  context.subscriptions.push(
    vscode.commands.registerCommand("pixelAgent.connect", () => {
      client.connect();
    }),
    vscode.commands.registerCommand("pixelAgent.disconnect", () => {
      client.disconnect();
    }),
    vscode.commands.registerCommand("pixelAgent.sendTestMessage", () => {
      sendEvent({
        type: "custom_message",
        source: "cursor-extension",
        timestamp: new Date().toISOString(),
        payload: { message: "Hello from Cursor! Pixel Agent is listening." },
      });
      void vscode.window.showInformationMessage("Pixel Agent test message sent.");
    }),
    vscode.commands.registerCommand("pixelAgent.showGitStatus", () => {
      gitWatcher.showCurrentGitStatus();
    }),
  );
}
