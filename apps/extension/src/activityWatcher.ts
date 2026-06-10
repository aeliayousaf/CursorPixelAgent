import * as vscode from "vscode";
import type { PixelAgentEvent } from "@pixel-agent/shared";
import { EventThrottle } from "./eventThrottle";

const LONG_SESSION_MINUTES = 45;
const UNSAVED_THRESHOLD = 3;
const LANGUAGE_COOLDOWN_KEY = "language";

export class ActivityWatcher implements vscode.Disposable {
  private readonly disposables: vscode.Disposable[] = [];
  private readonly throttle = new EventThrottle();
  private sessionStartedAt: number | null = null;
  private longSessionSent = false;
  private lastLanguage: string | null = null;
  private checkTimer: NodeJS.Timeout | null = null;

  constructor(private readonly sendEvent: (event: PixelAgentEvent) => void) {}

  start(): void {
    this.sessionStartedAt = Date.now();

    this.disposables.push(
      vscode.workspace.onDidChangeTextDocument(() => this.trackSession()),
      vscode.workspace.onDidSaveTextDocument(() => this.trackSession()),
      vscode.window.onDidChangeActiveTextEditor((editor) => {
        if (editor) {
          this.trackLanguage(editor.document.languageId);
        }
      }),
    );

    if (vscode.window.activeTextEditor) {
      this.trackLanguage(vscode.window.activeTextEditor.document.languageId);
    }

    this.checkTimer = setInterval(() => {
      this.checkUnsavedFiles();
      this.checkLongSession();
    }, 60_000);

    this.trackSession();
  }

  dispose(): void {
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
    }
    for (const disposable of this.disposables) {
      disposable.dispose();
    }
    this.disposables.length = 0;
  }

  nudgeCommit(): void {
    this.sendEvent(this.createEvent("warning", { message: "Friendly nudge: commit your progress!" }));
  }

  ping(): void {
    this.sendEvent(
      this.createEvent("custom_message", {
        message: "Pong! Extension is connected to Pixel Agent.",
        action: undefined,
      }),
    );
  }

  private trackSession(): void {
    if (!this.sessionStartedAt) {
      this.sessionStartedAt = Date.now();
    }
    this.checkLongSession();
  }

  private checkLongSession(): void {
    if (!this.sessionStartedAt || this.longSessionSent) {
      return;
    }
    const minutes = Math.floor((Date.now() - this.sessionStartedAt) / 60_000);
    if (minutes < LONG_SESSION_MINUTES) {
      return;
    }
    if (!this.throttle.shouldSend("long_session")) {
      return;
    }
    this.longSessionSent = true;
    this.sendEvent(
      this.createEvent("long_session", {
        sessionMinutes: minutes,
        moodDelta: -1,
      }),
    );
  }

  private checkUnsavedFiles(): void {
    const count = vscode.workspace.textDocuments.filter((doc) => doc.isDirty && !doc.isUntitled).length;
    if (count < UNSAVED_THRESHOLD) {
      return;
    }
    if (!this.throttle.shouldSend("unsaved_files", String(count))) {
      return;
    }
    this.sendEvent(
      this.createEvent("unsaved_files", {
        unsavedCount: count,
        workspace: vscode.workspace.name,
      }),
    );
  }

  private trackLanguage(languageId: string): void {
    const friendly = friendlyLanguageName(languageId);
    if (friendly === this.lastLanguage) {
      return;
    }
    this.lastLanguage = friendly;
    if (!this.throttle.shouldSend("language_focus", LANGUAGE_COOLDOWN_KEY)) {
      return;
    }
    this.sendEvent(
      this.createEvent("language_focus", {
        language: friendly,
        workspace: vscode.workspace.name,
      }),
    );
  }

  private createEvent(
    type: PixelAgentEvent["type"],
    payload?: PixelAgentEvent["payload"],
  ): PixelAgentEvent {
    return {
      type,
      source: "cursor-extension",
      timestamp: new Date().toISOString(),
      payload,
    };
  }
}

function friendlyLanguageName(languageId: string): string {
  const map: Record<string, string> = {
    typescript: "TypeScript",
    typescriptreact: "React TSX",
    javascript: "JavaScript",
    javascriptreact: "React JSX",
    python: "Python",
    rust: "Rust",
    go: "Go",
    java: "Java",
    csharp: "C#",
    cpp: "C++",
    html: "HTML",
    css: "CSS",
    json: "JSON",
    markdown: "Markdown",
  };
  return map[languageId] ?? languageId;
}
