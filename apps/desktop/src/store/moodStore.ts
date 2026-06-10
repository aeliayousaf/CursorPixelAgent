export type MoodLevel = "ecstatic" | "happy" | "neutral" | "concerned" | "stressed";

const MIN_MOOD = -20;
const MAX_MOOD = 20;

export class MoodTracker {
  private score = 0;

  applyDelta(delta: number): MoodLevel {
    this.score = clamp(this.score + delta, MIN_MOOD, MAX_MOOD);
    return this.getLevel();
  }

  getScore(): number {
    return this.score;
  }

  getLevel(): MoodLevel {
    if (this.score >= 12) {
      return "ecstatic";
    }
    if (this.score >= 4) {
      return "happy";
    }
    if (this.score >= -3) {
      return "neutral";
    }
    if (this.score >= -10) {
      return "concerned";
    }
    return "stressed";
  }

  label(): string {
    const labels: Record<MoodLevel, string> = {
      ecstatic: "Ecstatic",
      happy: "Happy",
      neutral: "Calm",
      concerned: "Concerned",
      stressed: "Stressed",
    };
    return labels[this.getLevel()];
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
