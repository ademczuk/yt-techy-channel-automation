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
import type { CatalogSnapshot, OpenClawProject } from "../lib/episode-types";

interface EcosystemPulseSceneProps {
  catalog?: CatalogSnapshot[];
  openclawProject?: OpenClawProject[];
  audioPath?: string;
}

// ── Helpers ──────────────────────────────────────────────────────────

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function formatDelta(n: number): string {
  const sign = n >= 0 ? "+" : "";
  if (Math.abs(n) >= 1_000_000) return `${sign}${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${sign}${(n / 1_000).toFixed(1)}K`;
  return `${sign}${n.toLocaleString()}`;
}

// ── Animated stat card ──────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: number;
  delta?: number;
  icon: React.ReactNode;
  delay: number;
  accentColor: string;
}

const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  delta,
  icon,
  delay,
  accentColor,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Card slides up with spring
  const entrance = spring({
    frame: Math.max(0, frame - delay),
    fps,
    config: { stiffness: 120, damping: 14, mass: 0.8 },
  });
  const translateY = interpolate(entrance, [0, 1], [60, 0]);
  const cardOpacity = interpolate(entrance, [0, 1], [0, 1]);
  const cardScale = interpolate(entrance, [0, 1], [0.92, 1]);

  // Counter ticks up (eased out exponential)
  const counterStart = delay + 8;
  const counterEnd = delay + 50;
  const counterProgress = interpolate(
    frame,
    [counterStart, counterEnd],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  // Exponential ease-out: fast start, slow approach to final value
  const easedCounter = 1 - Math.pow(1 - counterProgress, 4);
  const displayValue = Math.round(easedCounter * value);

  // Delta badge pops in after counter resolves
  const deltaDelay = counterEnd + 5;
  const deltaSpring = spring({
    frame: Math.max(0, frame - deltaDelay),
    fps,
    config: { stiffness: 200, damping: 16 },
  });
  const deltaScale = interpolate(deltaSpring, [0, 1], [0.5, 1]);
  const deltaOpacity = interpolate(deltaSpring, [0, 1], [0, 1]);

  // Glow pulse when counter completes
  const glowOpacity = interpolate(
    frame,
    [counterEnd, counterEnd + 8, counterEnd + 30],
    [0, 0.5, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // Exit fade
  const exitFade = interpolate(
    frame,
    [durationInFrames - 15, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <div
      style={{
        transform: `translateY(${translateY}px) scale(${cardScale})`,
        opacity: cardOpacity * exitFade,
        background: "rgba(22, 27, 34, 0.85)",
        border: "1px solid rgba(48, 54, 61, 0.6)",
        borderRadius: 16,
        padding: "28px 32px",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Glow pulse overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: 16,
          boxShadow: `inset 0 0 40px rgba(34, 197, 94, ${glowOpacity}), 0 0 30px rgba(34, 197, 94, ${glowOpacity * 0.3})`,
          pointerEvents: "none",
        }}
      />

      {/* Icon + label row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div style={{ opacity: 0.6 }}>{icon}</div>
        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: "#8b949e",
            fontFamily: "system-ui, sans-serif",
            letterSpacing: 1.5,
            textTransform: "uppercase",
          }}
        >
          {label}
        </div>
      </div>

      {/* Value + delta row */}
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 14,
        }}
      >
        <div
          style={{
            fontSize: 42,
            fontWeight: 800,
            color: "#e6edf3",
            fontFamily: "system-ui, sans-serif",
            lineHeight: 1,
          }}
        >
          {formatCompact(displayValue)}
        </div>
        {delta !== undefined && delta !== 0 && (
          <div
            style={{
              transform: `scale(${deltaScale})`,
              opacity: deltaOpacity,
              fontSize: 16,
              fontWeight: 700,
              color: accentColor,
              fontFamily: "system-ui, sans-serif",
              background: `${accentColor}15`,
              padding: "4px 10px",
              borderRadius: 8,
            }}
          >
            {formatDelta(delta)}
          </div>
        )}
      </div>
    </div>
  );
};

// ── SVG icons ───────────────────────────────────────────────────────

const SkillsIcon = () => (
  <svg width={20} height={20} viewBox="0 0 20 20" fill="none">
    <rect x={2} y={2} width={7} height={7} rx={2} fill="#22c55e" />
    <rect x={11} y={2} width={7} height={7} rx={2} fill="#22c55e" opacity={0.5} />
    <rect x={2} y={11} width={7} height={7} rx={2} fill="#22c55e" opacity={0.5} />
    <rect x={11} y={11} width={7} height={7} rx={2} fill="#22c55e" opacity={0.3} />
  </svg>
);

const DownloadsIcon = () => (
  <svg width={20} height={20} viewBox="0 0 20 20" fill="none">
    <path d="M10 3v10M10 13l-4-4M10 13l4-4" stroke="#3b82f6" strokeWidth={2} strokeLinecap="round" />
    <path d="M4 16h12" stroke="#3b82f6" strokeWidth={2} strokeLinecap="round" />
  </svg>
);

const StarsIcon = () => (
  <svg width={20} height={20} viewBox="0 0 20 20" fill="none">
    <path
      d="M10 2l2.4 5 5.6.8-4 3.9.9 5.3L10 14.5 5.1 17l.9-5.3-4-3.9 5.6-.8z"
      fill="#f59e0b"
    />
  </svg>
);

const CommitsIcon = () => (
  <svg width={20} height={20} viewBox="0 0 20 20" fill="none">
    <circle cx={10} cy={10} r={4} stroke="#a78bfa" strokeWidth={2} />
    <path d="M10 2v4M10 14v4" stroke="#a78bfa" strokeWidth={2} strokeLinecap="round" />
  </svg>
);

// ── Main scene ──────────────────────────────────────────────────────

/**
 * Ecosystem Pulse — animated 2×2 stat dashboard.
 * Shows platform growth and project health with spring-staggered cards.
 */
export const EcosystemPulseScene: React.FC<EcosystemPulseSceneProps> = ({
  catalog,
  openclawProject,
  audioPath,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Extract latest catalog values and deltas
  const latestCatalog = catalog?.[catalog.length - 1];
  const prevCatalog = catalog && catalog.length > 1 ? catalog[0] : undefined;

  const totalSkills = latestCatalog?.totalSkills ?? 0;
  const skillsDelta = prevCatalog
    ? totalSkills - prevCatalog.totalSkills
    : undefined;

  const totalDownloads = latestCatalog?.totalDownloads ?? 0;
  const downloadsDelta = prevCatalog
    ? totalDownloads - prevCatalog.totalDownloads
    : undefined;

  // Extract OpenClaw main repo stats
  const mainRepo = openclawProject?.find((p) =>
    p.repo.includes("openclaw/openclaw"),
  );
  const ocStars = mainRepo?.stars ?? 0;
  const ocCommits = mainRepo?.weeklyCommits ?? 0;
  const ocRelease = mainRepo?.latestRelease ?? "";

  // Title entrance
  const titleSpring = spring({
    frame,
    fps,
    config: { stiffness: 80, damping: 18 },
  });
  const titleOpacity = interpolate(titleSpring, [0, 1], [0, 1]);
  const titleY = interpolate(titleSpring, [0, 1], [20, 0]);

  // Subtitle (release badge) entrance
  const subSpring = spring({
    frame: Math.max(0, frame - 60),
    fps,
    config: { stiffness: 60, damping: 16 },
  });
  const subOpacity = interpolate(subSpring, [0, 1], [0, 1]);

  // Exit fade
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

      {/* Centered content */}
      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 120px",
          opacity: exitFade,
        }}
      >
        {/* Section label */}
        <div
          style={{
            transform: `translateY(${titleY}px)`,
            opacity: titleOpacity,
            fontSize: 14,
            fontWeight: 700,
            color: "#22c55e",
            fontFamily: "system-ui, sans-serif",
            letterSpacing: 3,
            textTransform: "uppercase",
            marginBottom: 8,
          }}
        >
          ECOSYSTEM PULSE
        </div>

        <div
          style={{
            transform: `translateY(${titleY}px)`,
            opacity: titleOpacity,
            fontSize: 36,
            fontWeight: 800,
            color: "#e6edf3",
            fontFamily: "system-ui, sans-serif",
            marginBottom: 40,
            textAlign: "center",
          }}
        >
          The ClawHub ecosystem this week
        </div>

        {/* 2×2 stat grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 20,
            width: "100%",
            maxWidth: 800,
          }}
        >
          <StatCard
            label="Total Skills"
            value={totalSkills}
            delta={skillsDelta}
            icon={<SkillsIcon />}
            delay={10}
            accentColor="#22c55e"
          />
          <StatCard
            label="Downloads"
            value={totalDownloads}
            delta={downloadsDelta}
            icon={<DownloadsIcon />}
            delay={18}
            accentColor="#3b82f6"
          />
          <StatCard
            label="GitHub Stars"
            value={ocStars}
            icon={<StarsIcon />}
            delay={26}
            accentColor="#f59e0b"
          />
          <StatCard
            label="Weekly Commits"
            value={ocCommits}
            icon={<CommitsIcon />}
            delay={34}
            accentColor="#a78bfa"
          />
        </div>

        {/* Release badge */}
        {ocRelease && (
          <div
            style={{
              opacity: subOpacity,
              marginTop: 28,
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontSize: 16,
              color: "#8b949e",
              fontFamily: "system-ui, sans-serif",
            }}
          >
            <div
              style={{
                background: "rgba(34, 197, 94, 0.15)",
                border: "1px solid rgba(34, 197, 94, 0.4)",
                borderRadius: 8,
                padding: "4px 12px",
                fontSize: 14,
                fontWeight: 700,
                color: "#22c55e",
              }}
            >
              {ocRelease}
            </div>
            <span>Latest OpenClaw release</span>
          </div>
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
