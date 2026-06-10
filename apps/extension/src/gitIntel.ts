import { execFile } from "node:child_process";
import { promisify } from "node:util";
import * as vscode from "vscode";
import type { PixelAgentEvent } from "@pixel-agent/shared";
import { EventThrottle } from "./eventThrottle";

const execFileAsync = promisify(execFile);
const STALE_DAYS = 3;
const CHECK_INTERVAL_MS = 30 * 60_000;

interface GitRepoLike {
  rootUri: vscode.Uri;
  state: {
    HEAD?: { name?: string; commit?: string };
    mergeChanges: readonly unknown[];
  };
}

export class GitIntel implements vscode.Disposable {
  private timer: NodeJS.Timeout | null = null;
  private readonly throttle = new EventThrottle();
  private mergeConflictActive = false;

  constructor(private readonly sendEvent: (event: PixelAgentEvent) => void) {}

  start(repositories: GitRepoLike[]): void {
    for (const repository of repositories) {
      this.checkMergeConflict(repository);
    }
    void this.runChecks(repositories);
    this.timer = setInterval(() => {
      void this.runChecks(repositories);
    }, CHECK_INTERVAL_MS);
  }

  dispose(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  onRepositoryStateChange(repository: GitRepoLike): void {
    this.checkMergeConflict(repository);
  }

  private checkMergeConflict(repository: GitRepoLike): void {
    const hasConflict = repository.state.mergeChanges.length > 0;
    const repo = repository.rootUri.fsPath;
    const branch = repository.state.HEAD?.name;

    if (hasConflict && !this.mergeConflictActive) {
      this.mergeConflictActive = true;
      if (this.throttle.shouldSend("merge_conflict", repo)) {
        this.sendEvent(
          this.createEvent("merge_conflict", {
            repo,
            branch,
            message: "Merge conflict detected. Resolve before continuing.",
          }),
        );
      }
      return;
    }

    if (!hasConflict) {
      this.mergeConflictActive = false;
    }
  }

  private async runChecks(repositories: GitRepoLike[]): Promise<void> {
    for (const repository of repositories) {
      await this.checkNoCommitsToday(repository);
      await this.checkStaleBranch(repository);
    }
  }

  private async checkNoCommitsToday(repository: GitRepoLike): Promise<void> {
    const repo = repository.rootUri.fsPath;
    const branch = repository.state.HEAD?.name;
    try {
      const midnight = new Date();
      midnight.setHours(0, 0, 0, 0);
      const { stdout } = await execFileAsync(
        "git",
        ["log", `--since=${midnight.toISOString()}`, "--oneline"],
        { cwd: repo, windowsHide: true },
      );
      const commits = stdout.trim().split("\n").filter(Boolean);
      if (commits.length > 0) {
        return;
      }
      if (!this.throttle.shouldSend("no_commits_today", repo)) {
        return;
      }
      this.sendEvent(
        this.createEvent("no_commits_today", {
          repo,
          branch,
        }),
      );
    } catch {
      // Not a git repo or git unavailable
    }
  }

  private async checkStaleBranch(repository: GitRepoLike): Promise<void> {
    const repo = repository.rootUri.fsPath;
    const branch = repository.state.HEAD?.name;
    if (!branch || branch === "main" || branch === "master") {
      return;
    }

    try {
      const { stdout } = await execFileAsync(
        "git",
        ["log", "-1", "--format=%ct", "HEAD"],
        { cwd: repo, windowsHide: true },
      );
      const commitEpoch = Number.parseInt(stdout.trim(), 10);
      if (Number.isNaN(commitEpoch)) {
        return;
      }
      const ageDays = (Date.now() - commitEpoch * 1000) / (24 * 60 * 60 * 1000);
      if (ageDays < STALE_DAYS) {
        return;
      }
      if (!this.throttle.shouldSend("stale_branch", `${repo}:${branch}`)) {
        return;
      }
      this.sendEvent(
        this.createEvent("stale_branch", {
          repo,
          branch,
        }),
      );
    } catch {
      // ignore
    }
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
