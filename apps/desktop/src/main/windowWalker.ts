import { screen, type BrowserWindow } from "electron";

interface WindowWalkerOptions {
  getWindow: () => BrowserWindow | null;
  onStateChange?: (state: WalkerState) => void;
}

export interface WalkerState {
  walking: boolean;
  facingLeft: boolean;
}

const STEP_MS = 16;
const MIN_SPEED_PX_PER_SEC = 28;
const MAX_SPEED_PX_PER_SEC = 52;
const MIN_IDLE_MS = 2_000;
const MAX_IDLE_MS = 6_000;
const MIN_TRAVEL_PX = 80;
const EDGE_PADDING = 24;

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function randomInt(min: number, max: number): number {
  return Math.floor(randomBetween(min, max + 1));
}

export class WindowWalker {
  private timer: NodeJS.Timeout | null = null;
  private idleTimer: NodeJS.Timeout | null = null;
  private paused = false;
  private walking = false;
  private facingLeft = false;
  private targetX = 0;
  private targetY = 0;
  private speed = 40;

  constructor(private readonly options: WindowWalkerOptions) {}

  start(): void {
    if (this.timer) {
      return;
    }
    this.scheduleNextMove();
    this.timer = setInterval(() => this.tick(), STEP_MS);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
    this.setWalking(false);
  }

  setPaused(paused: boolean): void {
    if (this.paused === paused) {
      return;
    }
    this.paused = paused;
    if (paused) {
      if (this.idleTimer) {
        clearTimeout(this.idleTimer);
        this.idleTimer = null;
      }
      this.setWalking(false);
      return;
    }
    this.scheduleNextMove();
  }

  private tick(): void {
    if (this.paused || !this.walking) {
      return;
    }

    const window = this.options.getWindow();
    if (!window || window.isDestroyed()) {
      return;
    }

    const bounds = window.getBounds();
    const dx = this.targetX - bounds.x;
    const dy = this.targetY - bounds.y;
    const distance = Math.hypot(dx, dy);
    const step = (this.speed * STEP_MS) / 1000;

    if (distance <= step) {
      window.setPosition(this.targetX, this.targetY);
      this.setWalking(false);
      this.scheduleNextMove();
      return;
    }

    const ratio = step / distance;
    const nextX = Math.round(bounds.x + dx * ratio);
    const nextY = Math.round(bounds.y + dy * ratio);
    window.setPosition(nextX, nextY);

    if (Math.abs(dx) > 1) {
      this.setFacingLeft(dx < 0);
    }
  }

  private scheduleNextMove(): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
    }
    if (this.paused) {
      return;
    }

    this.idleTimer = setTimeout(() => {
      this.idleTimer = null;
      this.beginMove();
    }, randomInt(MIN_IDLE_MS, MAX_IDLE_MS));
  }

  private beginMove(): void {
    if (this.paused) {
      return;
    }

    const window = this.options.getWindow();
    if (!window || window.isDestroyed()) {
      return;
    }

    const bounds = window.getBounds();
    const workArea = screen.getDisplayMatching(bounds).workArea;
    const maxX = workArea.x + workArea.width - bounds.width - EDGE_PADDING;
    const maxY = workArea.y + workArea.height - bounds.height - EDGE_PADDING;
    const minX = workArea.x + EDGE_PADDING;
    const minY = workArea.y + EDGE_PADDING;

    let targetX = randomInt(minX, Math.max(minX, maxX));
    let targetY = randomInt(minY, Math.max(minY, maxY));
    let attempts = 0;

    while (attempts < 8) {
      const travel = Math.hypot(targetX - bounds.x, targetY - bounds.y);
      if (travel >= MIN_TRAVEL_PX) {
        break;
      }
      targetX = randomInt(minX, Math.max(minX, maxX));
      targetY = randomInt(minY, Math.max(minY, maxY));
      attempts += 1;
    }

    this.targetX = targetX;
    this.targetY = targetY;
    this.speed = randomBetween(MIN_SPEED_PX_PER_SEC, MAX_SPEED_PX_PER_SEC);
    this.setFacingLeft(this.targetX < bounds.x);
    this.setWalking(true);
  }

  private setWalking(walking: boolean): void {
    if (this.walking === walking) {
      return;
    }
    this.walking = walking;
    this.emitState();
  }

  private setFacingLeft(facingLeft: boolean): void {
    if (this.facingLeft === facingLeft) {
      return;
    }
    this.facingLeft = facingLeft;
    this.emitState();
  }

  private emitState(): void {
    this.options.onStateChange?.({
      walking: this.walking,
      facingLeft: this.facingLeft,
    });
  }
}
