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

interface OutroSceneProps {
  episodeNumber: number;
  audioPath?: string;
}

/**
 * End card — ClawHub dark theme with green accent.
 */
export const OutroScene: React.FC<OutroSceneProps> = ({ episodeNumber, audioPath }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Grid fade in
  const gridOpacity = interpolate(frame, [0, 20], [0, 0.06], {
    extrapolateRight: "clamp",
  });

  // Title entrance
  const titleSpring = spring({
    frame,
    fps,
    config: { stiffness: 60, damping: 18 },
  });
  const titleY = interpolate(titleSpring, [0, 1], [40, 0]);
  const titleOpacity = interpolate(titleSpring, [0, 1], [0, 1]);

  // CTA entrance
  const ctaSpring = spring({
    frame: Math.max(0, frame - 14),
    fps,
    config: { stiffness: 50, damping: 16 },
  });
  const ctaOpacity = interpolate(ctaSpring, [0, 1], [0, 1]);
  const ctaScale = interpolate(ctaSpring, [0, 1], [0.9, 1]);

  // URL entrance
  const urlSpring = spring({
    frame: Math.max(0, frame - 24),
    fps,
    config: { stiffness: 50, damping: 16 },
  });
  const urlOpacity = interpolate(urlSpring, [0, 1], [0, 1]);

  return (
    <AbsoluteFill style={{ background: "#0d1117" }}>
      {/* Narration audio */}
      {audioPath && <Audio src={staticFile(audioPath)} volume={1} />}

      {/* Subtle grid */}
      <AbsoluteFill
        style={{
          opacity: gridOpacity,
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }}
      />

      {/* Glow */}
      <AbsoluteFill
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            position: "absolute",
            width: 400,
            height: 400,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(34, 197, 94, 0.08) 0%, transparent 70%)",
          }}
        />
      </AbsoluteFill>

      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Branding */}
        <div
          style={{
            transform: `translateY(${titleY}px)`,
            opacity: titleOpacity,
            fontSize: 48,
            fontWeight: 800,
            color: "#e6edf3",
            fontFamily: "system-ui, sans-serif",
            textAlign: "center",
          }}
        >
          OpenClaw Skills Weekly
        </div>

        <div
          style={{
            opacity: titleOpacity,
            fontSize: 20,
            color: "#8b949e",
            fontFamily: "system-ui, sans-serif",
            marginTop: 8,
          }}
        >
          Episode {episodeNumber}
        </div>

        {/* Subscribe CTA */}
        <div
          style={{
            transform: `scale(${ctaScale})`,
            opacity: ctaOpacity,
            marginTop: 40,
            padding: "14px 36px",
            background: "#22c55e",
            borderRadius: 8,
            fontSize: 20,
            fontWeight: 700,
            color: "#0d1117",
            fontFamily: "system-ui, sans-serif",
            letterSpacing: 1,
          }}
        >
          SUBSCRIBE
        </div>

        {/* URL */}
        <div
          style={{
            opacity: urlOpacity,
            marginTop: 20,
            fontSize: 18,
            color: "#8b949e",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          clawhub.ai/skills
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
