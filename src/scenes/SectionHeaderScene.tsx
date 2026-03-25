import React from "react";
import {
  AbsoluteFill,
  Audio,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
  staticFile,
} from "remotion";

interface SectionHeaderSceneProps {
  title: string;
  subtitle: string;
  background: string;
  audioPath?: string;
}

/**
 * Section divider: "TOP MOVERS" or "NEW THIS WEEK"
 * ClawHub dark theme with green accent line.
 */
export const SectionHeaderScene: React.FC<SectionHeaderSceneProps> = ({
  title,
  subtitle,
  audioPath,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Horizontal line expands from center
  const lineSpring = spring({
    frame,
    fps,
    config: { stiffness: 100, damping: 20 },
  });
  const lineWidth = interpolate(lineSpring, [0, 1], [0, 200]);

  // Title scales up
  const titleSpring = spring({
    frame: Math.max(0, frame - 5),
    fps,
    config: { stiffness: 80, damping: 18 },
  });
  const titleScale = interpolate(titleSpring, [0, 1], [0.8, 1]);
  const titleOpacity = interpolate(titleSpring, [0, 1], [0, 1]);

  // Subtitle fades in
  const subSpring = spring({
    frame: Math.max(0, frame - 12),
    fps,
    config: { stiffness: 60, damping: 16 },
  });
  const subOpacity = interpolate(subSpring, [0, 1], [0, 1]);

  // Exit fade
  const exitFade = interpolate(
    frame,
    [durationInFrames - 10, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <AbsoluteFill style={{ background: "#0d1117" }}>
      {/* Narration audio */}
      {audioPath && <Audio src={staticFile(audioPath)} volume={1} />}

      {/* Subtle grid */}
      <AbsoluteFill
        style={{
          opacity: 0.04,
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }}
      />

      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          opacity: exitFade,
        }}
      >
        {/* Green accent line */}
        <div
          style={{
            width: lineWidth,
            height: 2,
            background:
              "linear-gradient(90deg, transparent, #22c55e, transparent)",
            marginBottom: 24,
          }}
        />
        <div
          style={{
            transform: `scale(${titleScale})`,
            opacity: titleOpacity,
            fontSize: 64,
            fontWeight: 900,
            color: "#e6edf3",
            fontFamily: "system-ui, sans-serif",
            letterSpacing: 6,
          }}
        >
          {title}
        </div>
        <div
          style={{
            opacity: subOpacity,
            fontSize: 20,
            color: "#8b949e",
            fontFamily: "system-ui, sans-serif",
            marginTop: 12,
          }}
        >
          {subtitle}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
