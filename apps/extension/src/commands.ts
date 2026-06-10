import * as vscode from "vscode";
import type { PixelAgentEvent } from "@pixel-agent/shared";
import { ActivityWatcher } from "./activityWatcher";
import { GitWatcher } from "./gitWatcher";
import { PixelAgentWebSocketClient } from "./websocketClient";

export function registerPixelAgentCommands(
  context: vscode.ExtensionContext,
  client: PixelAgentWebSocketClient,
  gitWatcher: GitWatcher,
  activityWatcher: ActivityWatcher,
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
    vscode.commands.registerCommand("pixelAgent.ask", async () => {
      const input = await vscode.window.showInputBox({
        prompt: "Say something to Pixel Agent",
        placeHolder: "How's my branch looking?",
      });
      if (!input?.trim()) {
        return;
      }
      sendEvent({
        type: "custom_message",
        source: "cursor-extension",
        timestamp: new Date().toISOString(),
        payload: { message: input.trim() },
      });
    }),
    vscode.commands.registerCommand("pixelAgent.ping", () => {
      activityWatcher.ping();
      void vscode.window.showInformationMessage("Pixel Agent ping sent.");
    }),
    vscode.commands.registerCommand("pixelAgent.nudgeCommit", () => {
      activityWatcher.nudgeCommit();
      void vscode.window.showInformationMessage("Pixel Agent nudged you to commit.");
    }),
    vscode.commands.registerCommand("pixelAgent.mute", () => {
      const muteUntil = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      sendEvent({
        type: "custom_message",
        source: "cursor-extension",
        timestamp: new Date().toISOString(),
        payload: {
          message: "Muted for 1 hour. I'll stay quiet unless something urgent happens.",
          action: "mute",
          muteUntil,
        },
      });
      void vscode.window.showInformationMessage("Pixel Agent muted for 1 hour.");
    }),
    vscode.commands.registerCommand("pixelAgent.refreshUsage", () => {
      sendEvent({
        type: "custom_message",
        source: "cursor-extension",
        timestamp: new Date().toISOString(),
        payload: { action: "refresh_usage" },
      });
      void vscode.window.showInformationMessage("Pixel Agent usage refresh requested.");
    }),
  );
}
