import type { PixelAgentAnimation } from "@pixel-agent/shared";
import { PixelEffects } from "./PixelEffects";

interface PixelAgentProps {
  animation: PixelAgentAnimation;
  scale: number;
  theme: "classic" | "sunset" | "forest";
  isHovered?: boolean;
  isClicked?: boolean;
}

interface ThemePalette {
  body: string;
  bodyDark: string;
  accent: string;
  screen: string;
  outline: string;
  face: string;
  headphone: string;
}

const THEME_STYLES: Record<PixelAgentProps["theme"], ThemePalette> = {
  classic: {
    body: "#5b8cff",
    bodyDark: "#3f63d8",
    accent: "#ffd166",
    screen: "#8ef5d8",
    outline: "#2d1b4e",
    face: "#fff8e7",
    headphone: "#4cc9f0",
  },
  sunset: {
    body: "#ff7b54",
    bodyDark: "#d9480f",
    accent: "#ffe066",
    screen: "#ffd8a8",
    outline: "#2d1b4e",
    face: "#fff4e6",
    headphone: "#ffa94d",
  },
  forest: {
    body: "#4caf7d",
    bodyDark: "#2f8f5b",
    accent: "#c7f464",
    screen: "#b2f2bb",
    outline: "#1f2937",
    face: "#f4ffe8",
    headphone: "#69db7c",
  },
};

function outlineRect(
  x: number,
  y: number,
  width: number,
  height: number,
  fill: string,
  outline: string,
) {
  return (
    <g key={`${x}-${y}-${width}-${height}-${fill}`}>
      <rect x={x} y={y} width={width} height={height} fill={outline} />
      <rect x={x + 1} y={y + 1} width={width - 2} height={height - 2} fill={fill} />
    </g>
  );
}

export function PixelAgent({
  animation,
  scale,
  theme,
  isHovered = false,
  isClicked = false,
}: PixelAgentProps) {
  const palette = THEME_STYLES[theme];
  const shellClass = [
    "pixel-agent-shell",
    isHovered ? "is-hovered" : "",
    isClicked ? "is-clicked" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={shellClass} style={{ ["--agent-scale" as string]: scale }}>
      <PixelEffects animation={animation} />
      <svg
        viewBox="0 0 48 48"
        width="112"
        height="112"
        role="img"
        aria-label={`Pixel Agent ${animation}`}
        className="pixel-mascot"
        data-animation={animation}
        shapeRendering="crispEdges"
      >
        {outlineRect(14, 18, 20, 18, palette.body, palette.outline)}
        {outlineRect(12, 22, 4, 10, palette.bodyDark, palette.outline)}
        {outlineRect(32, 22, 4, 10, palette.bodyDark, palette.outline)}
        {outlineRect(17, 36, 6, 6, palette.bodyDark, palette.outline)}
        {outlineRect(25, 36, 6, 6, palette.bodyDark, palette.outline)}

        <rect x="10" y="14" width="28" height="3" fill={palette.outline} />
        <rect x="11" y="15" width="26" height="1" fill={palette.headphone} />
        <rect x="9" y="15" width="3" height="8" fill={palette.outline} />
        <rect x="10" y="16" width="1" height="6" fill={palette.headphone} />
        <rect x="36" y="15" width="3" height="8" fill={palette.outline} />
        <rect x="37" y="16" width="1" height="6" fill={palette.headphone} />

        <rect x="18" y="24" width="12" height="8" fill={palette.outline} />
        <rect x="19" y="25" width="10" height="6" fill={palette.screen} />
        <rect x="20" y="27" width="2" height="1" fill={palette.outline} />
        <rect x="23" y="27" width="3" height="1" fill={palette.outline} />
        <rect x="27" y="27" width="1" height="1" fill={palette.outline} />
        <rect x="20" y="29" width="6" height="1" fill={palette.outline} />

        <rect x="30" y="30" width="6" height="5" fill={palette.outline} />
        <rect x="31" y="31" width="4" height="3" fill={palette.accent} />
        <rect x="32" y="32" width="2" height="1" fill={palette.outline} />

        <g className="pixel-eye-open">
          <rect x="15" y="20" width="5" height="5" fill={palette.outline} />
          <rect x="16" y="21" width="3" height="3" fill={palette.face} className="pixel-eye" />
          <rect x="17" y="22" width="1" height="1" fill={palette.outline} />
          <rect x="28" y="20" width="5" height="5" fill={palette.outline} />
          <rect x="29" y="21" width="3" height="3" fill={palette.face} className="pixel-eye" />
          <rect x="30" y="22" width="1" height="1" fill={palette.outline} />
        </g>

        <g className="pixel-eye-closed">
          <rect x="15" y="22" width="5" height="1" fill={palette.outline} />
          <rect x="28" y="22" width="5" height="1" fill={palette.outline} />
        </g>

        <rect x="21" y="33" width="6" height="1" fill={palette.outline} />
        <rect x="22" y="34" width="4" height="1" fill={palette.accent} />
      </svg>
    </div>
  );
}
