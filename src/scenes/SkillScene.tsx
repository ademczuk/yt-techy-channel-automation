import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Audio,
  staticFile,
} from "remotion";
import { SkillCard } from "../components/SkillCard";
import type { SkillData } from "../lib/episode-types";

interface SkillSceneProps {
  skill: SkillData;
  background: string;
}

/**
 * Per-skill showcase scene.
 * Layout: fullscreen browsing screenshot + transient bottom info bar.
 * The info bar slides up, holds long enough to read, then fades out.
 */
export const SkillScene: React.FC<SkillSceneProps> = ({
  skill,
  background,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames: dur } = useVideoConfig();

  const trackLabel = skill.track === "mover" ? "TOP MOVER" : "NEW THIS WEEK";
  const trackColor = skill.track === "mover" ? "#22c55e" : "#3b82f6";

  // ── Bottom bar timing ──────────────────────────────────────────
  // Slide up at ~8%, fully visible by ~16%, stays visible for the rest of the scene
  const barInStart = Math.round(dur * 0.08);
  const barInEnd = Math.round(dur * 0.16);

  const barSlideY = interpolate(
    frame,
    [barInStart, barInEnd],
    [80, 0],
    { extrapolateRight: "clamp", extrapolateLeft: "clamp" },
  );

  const barOpacity = interpolate(
    frame,
    [barInStart, barInEnd],
    [0, 1],
    { extrapolateRight: "clamp", extrapolateLeft: "clamp" },
  );

  return (
    <AbsoluteFill>
      {/* Fullscreen browsing card — edge to edge */}
      <AbsoluteFill>
        <SkillCard
          screenshotPath={skill.screenshotPath}
          screenshotHeight={skill.screenshotHeight}
        />
      </AbsoluteFill>

      {/* Audio narration */}
      {skill.audioPath && (
        <Audio src={staticFile(skill.audioPath)} volume={1} />
      )}

      {/* Transient bottom info bar */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          transform: `translateY(${barSlideY}px)`,
          opacity: barOpacity,
          pointerEvents: "none",
        }}
      >
        {/* Gradient fade from transparent to dark */}
        <div
          style={{
            height: 60,
            background:
              "linear-gradient(to bottom, transparent, rgba(0, 0, 0, 0.85))",
          }}
        />

        {/* Info content */}
        <div
          style={{
            background: "rgba(0, 0, 0, 0.85)",
            padding: "16px 48px 28px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {/* Left: rank + name + author */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 20,
            }}
          >
            {/* Rank pill */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 10,
                  background: trackColor,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 22,
                  fontWeight: 900,
                  color: "#fff",
                  fontFamily: "system-ui, sans-serif",
                }}
              >
                #{skill.rank}
              </div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: trackColor,
                  letterSpacing: 1.5,
                  fontFamily: "system-ui, sans-serif",
                }}
              >
                {trackLabel}
              </div>
            </div>

            {/* Name + author */}
            <div>
              <div
                style={{
                  fontSize: 32,
                  fontWeight: 800,
                  color: "#fff",
                  fontFamily: "system-ui, sans-serif",
                  lineHeight: 1.1,
                }}
              >
                {skill.displayName}
              </div>
              <div
                style={{
                  fontSize: 15,
                  color: "rgba(255, 255, 255, 0.5)",
                  fontFamily: "system-ui, sans-serif",
                  marginTop: 2,
                }}
              >
                by {skill.author}
              </div>
            </div>
          </div>

          {/* Right: stats with delta badges */}
          <div
            style={{
              display: "flex",
              gap: 24,
            }}
          >
            {[
              {
                value: skill.downloads,
                label: "downloads",
                delta: skill.downloadsDelta,
              },
              {
                value: skill.stars,
                label: "stars",
                delta: skill.starsDelta,
              },
              {
                value: skill.installsAllTime,
                label: "installs",
                delta: skill.installsDelta,
              },
            ].map(({ value, label, delta }) => (
              <div
                key={label}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  gap: 2,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    gap: 5,
                  }}
                >
                  <span
                    style={{
                      fontSize: 20,
                      fontWeight: 700,
                      color: "#fff",
                      fontFamily: "system-ui, sans-serif",
                    }}
                  >
                    {value.toLocaleString()}
                  </span>
                  <span
                    style={{
                      fontSize: 12,
                      color: "rgba(255, 255, 255, 0.4)",
                      fontFamily: "system-ui, sans-serif",
                    }}
                  >
                    {label}
                  </span>
                </div>
                {delta !== undefined && delta > 0 && (
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "#22c55e",
                      fontFamily: "system-ui, sans-serif",
                    }}
                  >
                    +{delta.toLocaleString()} ▲
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
