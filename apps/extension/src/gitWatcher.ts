import * as vscode from "vscode";
import type { PixelAgentEvent } from "@pixel-agent/shared";
import { EventThrottle } from "./eventThrottle";
import { GitIntel } from "./gitIntel";

interface GitApi {
  repositories: GitRepository[];
}

interface GitRepository {
  rootUri: vscode.Uri;
  state: GitRepositoryState;
  inputBox: { value: string };
}

interface GitRepositoryState {
  HEAD?: { name?: string; commit?: string };
  indexChanges: readonly unknown[];
  workingTreeChanges: readonly unknown[];
  mergeChanges: readonly unknown[];
  onDidChange: vscode.Event<void>;
}

interface RepositorySnapshot {
  branch?: string;
  commit?: string;
  dirty: boolean;
}

export class GitWatcher implements vscode.Disposable {
  private readonly disposables: vscode.Disposable[] = [];
  private readonly snapshots = new Map<string, RepositorySnapshot>();
  private readonly throttle = new EventThrottle();
  private gitIntel: GitIntel | null = null;

  constructor(
    private readonly sendEvent: (event: PixelAgentEvent) => void,
    private readonly showStatus: (message: string) => void,
  ) {}

  async start(): Promise<void> {
    const gitExtension = vscode.extensions.getExtension<{
      getAPI(version: number): GitApi;
    }>("vscode.git");

    if (!gitExtension) {
      this.showStatus("Built-in Git extension not found.");
      return;
    }

    const gitApi = gitExtension.isActive
      ? gitExtension.exports.getAPI(1)
      : (await gitExtension.activate()).getAPI(1);

    this.gitIntel = new GitIntel(this.sendEvent);
    this.gitIntel.start(gitApi.repositories);

    for (const repository of gitApi.repositories) {
      this.watchRepository(repository);
    }

    this.disposables.push(
      vscode.workspace.onDidChangeWorkspaceFolders(() => this.emitWorkspaceOpened()),
      vscode.tasks.onDidStartTask((event) => {
        const name = event.execution.task.name.toLowerCase();
        if (name.includes("push") && this.throttle.shouldSend("git_push_started")) {
          this.sendEvent(this.createEvent("git_push_started", { message: "Pushing your changes..." }));
        }
      }),
      vscode.tasks.onDidEndTaskProcess((event) => {
        const name = event.execution.task.name.toLowerCase();
        if (name.includes("test") && event.exitCode !== 0) {
          if (this.throttle.shouldSend("test_failed")) {
            this.sendEvent(
              this.createEvent("test_failed", {
                message: "Tests failed. Want to check the output?",
              }),
            );
          }
          return;
        }
        if (name.includes("build") && event.exitCode !== 0) {
          if (this.throttle.shouldSend("build_error")) {
            this.sendEvent(
              this.createEvent("build_error", {
                message: "Build failed. Want to check the error?",
              }),
            );
          }
          return;
        }
        if (!name.includes("push")) {
          return;
        }
        if (event.exitCode === 0) {
          if (this.throttle.shouldSend("git_push_success")) {
            this.sendEvent(
              this.createEvent("git_push_success", { message: "Nice push! Your code is live." }),
            );
          }
        } else if (this.throttle.shouldSend("git_push_failed")) {
          this.sendEvent(
            this.createEvent("git_push_failed", { message: "Push failed. Want to check the error?" }),
          );
        }
      }),
    );

    this.emitWorkspaceOpened();
  }

  dispose(): void {
    this.gitIntel?.dispose();
    for (const disposable of this.disposables) {
      disposable.dispose();
    }
    this.disposables.length = 0;
    this.snapshots.clear();
  }

  showCurrentGitStatus(): void {
    const gitExtension = vscode.extensions.getExtension<{ getAPI(version: number): GitApi }>(
      "vscode.git",
    );
    if (!gitExtension) {
      this.showStatus("Git extension unavailable.");
      return;
    }

    const gitApi = gitExtension.exports.getAPI(1);
    if (gitApi.repositories.length === 0) {
      this.showStatus("No Git repositories in this workspace.");
      return;
    }

    const lines = gitApi.repositories.map((repository) => {
      const snapshot = this.readSnapshot(repository);
      const repoName = repository.rootUri.fsPath.split(/[\\/]/).pop() ?? repository.rootUri.fsPath;
      const conflict =
        repository.state.mergeChanges.length > 0 ? " · merge conflict" : "";
      return `${repoName}: ${snapshot.dirty ? "dirty" : "clean"} on ${snapshot.branch ?? "unknown"}${conflict}`;
    });

    this.showStatus(lines.join(" | "));
  }

  private watchRepository(repository: GitRepository): void {
    const key = repository.rootUri.toString();
    this.snapshots.set(key, this.readSnapshot(repository));
    this.emitRepositoryState(repository);

    const subscription = repository.state.onDidChange(() => {
      this.gitIntel?.onRepositoryStateChange(repository);
      const previous = this.snapshots.get(key) ?? this.readSnapshot(repository);
      const next = this.readSnapshot(repository);
      this.snapshots.set(key, next);

      if (previous.branch !== next.branch) {
        this.sendEvent(
          this.createEvent("branch_changed", {
            repo: repository.rootUri.fsPath,
            branch: next.branch,
          }),
        );
      }

      if (previous.commit !== next.commit && next.commit) {
        this.sendEvent(
          this.createEvent("git_commit_created", {
            repo: repository.rootUri.fsPath,
            branch: next.branch,
            message: repository.inputBox.value || undefined,
            moodDelta: 2,
          }),
        );
      }

      if (previous.dirty !== next.dirty) {
        const type = next.dirty ? "git_dirty" : "git_clean";
        if (this.throttle.shouldSend(type, key)) {
          this.sendEvent(
            this.createEvent(type, {
              repo: repository.rootUri.fsPath,
              branch: next.branch,
            }),
          );
        }
      }
    });

    this.disposables.push({ dispose: () => subscription.dispose() });
  }

  private emitRepositoryState(repository: GitRepository): void {
    const snapshot = this.readSnapshot(repository);
    this.sendEvent(
      this.createEvent(snapshot.dirty ? "git_dirty" : "git_clean", {
        repo: repository.rootUri.fsPath,
        branch: snapshot.branch,
      }),
    );
    if (snapshot.branch) {
      this.sendEvent(
        this.createEvent("branch_changed", {
          repo: repository.rootUri.fsPath,
          branch: snapshot.branch,
        }),
      );
    }
    this.gitIntel?.onRepositoryStateChange(repository);
  }

  private emitWorkspaceOpened(): void {
    const workspaceName = vscode.workspace.name ?? "workspace";
    this.sendEvent(
      this.createEvent("workspace_opened", {
        workspace: workspaceName,
        message: `Workspace opened: ${workspaceName}`,
      }),
    );
  }

  private readSnapshot(repository: GitRepository): RepositorySnapshot {
    const dirty =
      repository.state.indexChanges.length > 0 ||
      repository.state.workingTreeChanges.length > 0 ||
      repository.state.mergeChanges.length > 0;

    return {
      branch: repository.state.HEAD?.name,
      commit: repository.state.HEAD?.commit,
      dirty,
    };
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
