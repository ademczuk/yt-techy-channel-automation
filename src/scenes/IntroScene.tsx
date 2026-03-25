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

interface IntroSceneProps {
  episodeNumber: number;
  weekLabel: string;
  totalSkills: number;
  /** Total skills on the platform (from catalog data) */
  catalogTotalSkills?: number;
  /** New skills added this period */
  catalogSkillsDelta?: number;
  /** Narration audio path (relative to public/) */
  audioPath?: string;
}

/**
 * Cold open title card matching ClawHub's dark aesthetic.
 * #0d1117 background, green accent (#22c55e), subtle grid + glow.
 * Enhanced with animated ecosystem counter when catalog data is available.
 */
export const IntroScene: React.FC<IntroSceneProps> = ({
  episodeNumber,
  weekLabel,
  totalSkills,
  catalogTotalSkills,
  catalogSkillsDelta,
  audioPath,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // ── Animated grid lines (subtle background texture) ──────────
  const gridOpacity = interpolate(frame, [0, 30], [0, 0.06], {
    extrapolateRight: "clamp",
  });

  // ── Glow pulse behind logo ───────────────────────────────────
  const glowPulse = interpolate(
    frame,
    [0, 40, 80, 120],
    [0, 0.5, 0.35, 0.45],
    { extrapolateRight: "clamp" },
  );

  // ── Horizontal accent line expands from center ───────────────
  const lineSpring = spring({
    frame: Math.max(0, frame - 5),
    fps,
    config: { stiffness: 60, damping: 20 },
  });
  const lineWidth = interpolate(lineSpring, [0, 1], [0, 320]);

  // ── Logo "claw" mark — scales in ────────────────────────────
  const logoSpring = spring({
    frame,
    fps,
    config: { stiffness: 100, damping: 18 },
  });
  const logoScale = interpolate(logoSpring, [0, 1], [0.3, 1]);
  const logoOpacity = interpolate(logoSpring, [0, 1], [0, 1]);

  // ── Title entrance ──────────────────────────────────────────
  const titleSpring = spring({
    frame: Math.max(0, frame - 10),
    fps,
    config: { stiffness: 60, damping: 18 },
  });
  const titleY = interpolate(titleSpring, [0, 1], [40, 0]);
  const titleOpacity = interpolate(titleSpring, [0, 1], [0, 1]);

  // ── Subtitle entrance ───────────────────────────────────────
  const subSpring = spring({
    frame: Math.max(0, frame - 22),
    fps,
    config: { stiffness: 50, damping: 16 },
  });
  const subOpacity = interpolate(subSpring, [0, 1], [0, 1]);

  // ── Ecosystem counter (new) ─────────────────────────────────
  const counterStart = 35;
  const counterEnd = 80;
  const counterProgress = interpolate(
    frame,
    [counterStart, counterEnd],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const easedCounter = 1 - Math.pow(1 - counterProgress, 4);
  const displayCount = catalogTotalSkills
    ? Math.round(easedCounter * catalogTotalSkills)
    : 0;

  // Delta badge pops in after counter
  const deltaDelay = counterEnd + 5;
  const deltaSpring = spring({
    frame: Math.max(0, frame - deltaDelay),
    fps,
    config: { stiffness: 180, damping: 14 },
  });
  const deltaScale = interpolate(deltaSpring, [0, 1], [0.5, 1]);
  const deltaOpacity = interpolate(deltaSpring, [0, 1], [0, 1]);

  // ── Skill count pill (original) ────────────────────────────
  const countSpring = spring({
    frame: Math.max(0, frame - 32),
    fps,
    config: { stiffness: 50, damping: 16 },
  });
  const countOpacity = interpolate(countSpring, [0, 1], [0, 1]);

  // ── Exit fade ───────────────────────────────────────────────
  const exitFade = interpolate(
    frame,
    [durationInFrames - 15, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <AbsoluteFill style={{ background: "#0d1117" }}>
      {/* Narration audio */}
      {audioPath && <Audio src={staticFile(audioPath)} volume={1} />}

      {/* Subtle grid pattern */}
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

      {/* Center glow */}
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
            width: 500,
            height: 500,
            borderRadius: "50%",
            background: `radial-gradient(circle, rgba(34, 197, 94, ${glowPulse * 0.15}) 0%, transparent 70%)`,
          }}
        />
      </AbsoluteFill>

      {/* Content */}
      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          opacity: exitFade,
        }}
      >
        {/* Claw icon mark */}
        <div
          style={{
            transform: `scale(${logoScale})`,
            opacity: logoOpacity,
            marginBottom: 24,
          }}
        >
          <svg width={80} height={80} viewBox="0 0 80 80" fill="none">
            {/* Three claw slashes */}
            <path
              d="M20 60 L30 15 Q32 8 36 15 L42 45"
              stroke="#22c55e"
              strokeWidth="4"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M32 60 L40 10 Q42 3 46 10 L50 45"
              stroke="#22c55e"
              strokeWidth="4"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M44 60 L50 15 Q52 8 56 15 L58 45"
              stroke="#22c55e"
              strokeWidth="4"
              strokeLinecap="round"
              fill="none"
            />
          </svg>
        </div>

        {/* Brand name */}
        <div
          style={{
            transform: `scale(${logoScale})`,
            opacity: logoOpacity,
            fontSize: 22,
            color: "#22c55e",
            fontFamily: "system-ui, sans-serif",
            fontWeight: 700,
            letterSpacing: 6,
            textTransform: "uppercase",
            marginBottom: 8,
          }}
        >
          OpenClaw
        </div>

        {/* Green accent line */}
        <div
          style={{
            width: lineWidth,
            height: 2,
            background: "linear-gradient(90deg, transparent, #22c55e, transparent)",
            marginBottom: 20,
          }}
        />

        {/* Main title */}
        <div
          style={{
            transform: `translateY(${titleY}px)`,
            opacity: titleOpacity,
            fontSize: 68,
            color: "#e6edf3",
            fontFamily: "system-ui, sans-serif",
            fontWeight: 800,
            textAlign: "center",
            lineHeight: 1.1,
          }}
        >
          Skills Weekly
        </div>

        {/* Episode + Week */}
        <div
          style={{
            opacity: subOpacity,
            fontSize: 22,
            color: "#8b949e",
            fontFamily: "system-ui, sans-serif",
            marginTop: 16,
          }}
        >
          Episode {episodeNumber} &mdash; {weekLabel}
        </div>

        {/* Ecosystem counter — animated, only when catalog data available */}
        {catalogTotalSkills ? (
          <div
            style={{
              opacity: countOpacity,
              marginTop: 24,
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div
              style={{
                padding: "8px 20px",
                background: "rgba(34, 197, 94, 0.1)",
                border: "1px solid rgba(34, 197, 94, 0.3)",
                borderRadius: 20,
                fontSize: 18,
                color: "#e6edf3",
                fontFamily: "system-ui, sans-serif",
                fontWeight: 700,
              }}
            >
              {displayCount.toLocaleString()} skills on ClawHub
            </div>
            {catalogSkillsDelta && catalogSkillsDelta > 0 && (
              <div
                style={{
                  transform: `scale(${deltaScale})`,
                  opacity: deltaOpacity,
                  padding: "6px 14px",
                  background: "rgba(34, 197, 94, 0.15)",
                  border: "1px solid rgba(34, 197, 94, 0.4)",
                  borderRadius: 16,
                  fontSize: 15,
                  fontWeight: 700,
                  color: "#22c55e",
                  fontFamily: "system-ui, sans-serif",
                }}
              >
                +{catalogSkillsDelta.toLocaleString()} new
              </div>
            )}
          </div>
        ) : (
          <div
            style={{
              opacity: countOpacity,
              marginTop: 20,
              padding: "8px 20px",
              background: "rgba(34, 197, 94, 0.1)",
              border: "1px solid rgba(34, 197, 94, 0.3)",
              borderRadius: 20,
              fontSize: 16,
              color: "#22c55e",
              fontFamily: "system-ui, sans-serif",
              fontWeight: 600,
            }}
          >
            {totalSkills} trending skills this week
          </div>
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
