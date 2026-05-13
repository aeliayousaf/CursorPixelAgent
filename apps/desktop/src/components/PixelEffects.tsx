import type { PixelAgentAnimation } from "@pixel-agent/shared";

interface PixelEffectsProps {
  animation: PixelAgentAnimation;
}

export function PixelEffects({ animation }: PixelEffectsProps) {
  if (animation === "happy") {
    return (
      <>
        <span className="pixel-effect pixel-effect--sparkle" style={{ top: 8, left: 10 }} />
        <span className="pixel-effect pixel-effect--sparkle" style={{ top: 4, right: 12, animationDelay: "0.2s" }} />
        <span className="pixel-effect pixel-effect--sparkle" style={{ top: 16, right: 4, animationDelay: "0.35s" }} />
      </>
    );
  }

  if (animation === "alert") {
    return (
      <>
        <span className="pixel-effect pixel-effect--warning" style={{ top: 10, left: 4 }} />
        <span className="pixel-effect pixel-effect--warning" style={{ top: 6, right: 6, animationDelay: "0.15s" }} />
        <span className="pixel-effect pixel-effect--warning" style={{ bottom: 28, left: 16, animationDelay: "0.3s" }} />
      </>
    );
  }

  if (animation === "thinking") {
    return (
      <>
        <span className="pixel-effect pixel-effect--thought" style={{ top: 0, right: 8 }} />
        <span
          className="pixel-effect pixel-effect--thought"
          style={{ top: -8, right: 18, animationDelay: "0.35s", width: 7, height: 7 }}
        />
        <span
          className="pixel-effect pixel-effect--thought"
          style={{ top: -16, right: 28, animationDelay: "0.7s", width: 9, height: 9 }}
        />
      </>
    );
  }

  if (animation === "sleeping") {
    return (
      <>
        <span className="pixel-effect pixel-effect--zzz" style={{ top: 0, right: 6 }}>
          Z
        </span>
        <span className="pixel-effect pixel-effect--zzz" style={{ top: -10, right: 18, animationDelay: "0.8s" }}>
          z
        </span>
      </>
    );
  }

  return null;
}
