import React from "react";
import {
  Img,
  OffthreadVideo,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";

interface SkillCardProps {
  clipPath?: string;
  screenshotPath?: string;
  screenshotHeight?: number;
}

interface ScrollSegment {
  startFrame: number;
  endFrame: number;
  startY: number;
  endY: number;
}

function buildScrollSegments(
  dur: number,
  scrollTarget: number,
  chunks: number = 3,
): ScrollSegment[] {
  const scrollStart = Math.round(dur * 0.16);
  const scrollEnd = Math.round(dur * 0.84);
  const scrollRange = scrollEnd - scrollStart;
  const chunkDur = Math.floor(scrollRange / chunks);
  const scrollFraction = 0.65;

  const segments: ScrollSegment[] = [];
  const distPerChunk = scrollTarget / chunks;

  for (let i = 0; i < chunks; i++) {
    const chunkStart = scrollStart + i * chunkDur;
    const moveDur = Math.round(chunkDur * scrollFraction);
    segments.push({
      startFrame: chunkStart,
      endFrame: chunkStart + moveDur,
      startY: distPerChunk * i,
      endY: distPerChunk * (i + 1),
    });
  }

  return segments;
}

function easeOutQuart(t: number): number {
  return 1 - Math.pow(1 - t, 4);
}

/**
 * Fullscreen animated browsing card with slow deterministic motion.
 * The goal is to feel intentional, not "AI-random".
 */
export const SkillCard: React.FC<SkillCardProps> = ({
  clipPath,
  screenshotPath,
  screenshotHeight,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, height: compHeight, width: compWidth } =
    useVideoConfig();

  const imgHeight = screenshotHeight || compHeight;
  const maxScroll = Math.max(0, imgHeight - compHeight);

  const dur = durationInFrames;

  const scrollTarget = maxScroll * 0.78;
  const scrollSegments = buildScrollSegments(dur, scrollTarget, 3);

  let scrollY = 0;
  for (const seg of scrollSegments) {
    if (frame < seg.startFrame) {
      scrollY = seg.startY;
      break;
    } else if (frame >= seg.startFrame && frame <= seg.endFrame) {
      const t = (frame - seg.startFrame) / Math.max(1, seg.endFrame - seg.startFrame);
      scrollY = seg.startY + (seg.endY - seg.startY) * easeOutQuart(t);
      break;
    } else {
      scrollY = seg.endY;
    }
  }

  const scale = interpolate(
    frame,
    [0, dur],
    [1.0, 1.012],
    { extrapolateRight: "clamp", extrapolateLeft: "clamp" },
  );

  const cursorWaypoints = [
    { frame: 0, x: 0.32, y: 0.17 },
    { frame: Math.round(dur * 0.18), x: 0.39, y: 0.24 },
    { frame: Math.round(dur * 0.44), x: 0.43, y: 0.42 },
    { frame: Math.round(dur * 0.72), x: 0.48, y: maxScroll > 0 ? 0.63 : 0.52 },
    { frame: dur, x: 0.51, y: maxScroll > 0 ? 0.72 : 0.58 },
  ];

  let cursorX = cursorWaypoints[0].x;
  let cursorY = cursorWaypoints[0].y;

  for (let i = 0; i < cursorWaypoints.length - 1; i++) {
    const start = cursorWaypoints[i];
    const end = cursorWaypoints[i + 1];
    if (frame <= end.frame || i === cursorWaypoints.length - 2) {
      const move = spring({
        frame: Math.max(0, frame - start.frame),
        fps,
        config: { stiffness: 28, damping: 24 },
        durationInFrames: Math.max(1, end.frame - start.frame),
      });

      cursorX = interpolate(move, [0, 1], [start.x, end.x]);
      cursorY = interpolate(move, [0, 1], [start.y, end.y]);
      break;
    }
  }

  // Cursor opacity — gentle fade in/out
  const cursorOpacity = interpolate(
    frame,
    [0, Math.round(fps * 0.5), dur - Math.round(fps * 0.8), dur],
    [0, 1, 1, 0],
    { extrapolateRight: "clamp", extrapolateLeft: "clamp" },
  );

  const clickFrame = Math.round(dur * 0.24);
  const clickAge = frame - clickFrame;
  const showClick = clickAge >= 0 && clickAge < 20;
  const clickProgress = showClick
    ? interpolate(clickAge, [0, 20], [0, 1], { extrapolateRight: "clamp" })
    : 0;
  const clickEased = 1 - Math.pow(1 - clickProgress, 3);

  return (
    <div
      style={{
        width: compWidth,
        height: compHeight,
        overflow: "hidden",
        position: "relative",
        background: "#0d1117",
      }}
    >
      {clipPath ? (
        <OffthreadVideo
          src={staticFile(clipPath)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            background: "#0d1117",
          }}
        />
      ) : screenshotPath ? (
        <div
          style={{
            width: "100%",
            height: "100%",
            overflow: "hidden",
            position: "relative",
            transform: `scale(${scale})`,
            transformOrigin: "50% 55%",
          }}
        >
          <Img
            src={staticFile(screenshotPath)}
            style={{
              width: "100%",
              height: "auto",
              position: "absolute",
              top: 0,
              left: 0,
              transform: `translateY(${-scrollY}px)`,
            }}
          />
        </div>
      ) : (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background:
              "linear-gradient(135deg, #0d1117 0%, #161b22 50%, #0d1117 100%)",
          }}
        >
          <div
            style={{
              fontSize: 48,
              color: "rgba(34, 197, 94, 0.3)",
              fontFamily: "system-ui, sans-serif",
              fontWeight: 700,
            }}
          >
            OpenClaw
          </div>
        </div>
      )}

      {/* Deterministic cursor overlay */}
      {!clipPath && screenshotPath && (
        <div
          style={{
            position: "absolute",
            left: `${cursorX * 100}%`,
            top: `${cursorY * 100}%`,
            zIndex: 10,
            pointerEvents: "none",
            opacity: cursorOpacity,
            transform: "translate(-1px, -1px)",
          }}
        >
          {showClick && (
            <>
              <div
                style={{
                  position: "absolute",
                  left: 2,
                  top: 1,
                  width: (8 + clickEased * 24) * 2,
                  height: (8 + clickEased * 24) * 2,
                  borderRadius: "50%",
                  transform: "translate(-50%, -50%)",
                  background: `radial-gradient(circle, rgba(34, 197, 94, ${(1 - clickEased) * 0.3}) 0%, transparent 70%)`,
                }}
              />
              <div
                style={{
                  position: "absolute",
                  left: 2,
                  top: 1,
                  width: (8 + clickEased * 24) * 2,
                  height: (8 + clickEased * 24) * 2,
                  borderRadius: "50%",
                  transform: "translate(-50%, -50%)",
                  border: `2px solid rgba(34, 197, 94, ${(1 - clickEased) * 0.5})`,
                }}
              />
            </>
          )}

          <svg
            width={24}
            height={24}
            viewBox="0 0 24 24"
            fill="none"
            style={{ filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.5))" }}
          >
            <path
              d="M4 2L4 18L8.2 14.1L10.7 20.5L13.3 19.4L10.9 13.3L16 13.2L4 2Z"
              fill="#ffffff"
            />
            <path
              d="M4 2L4 18L8.2 14.1L10.7 20.5L13.3 19.4L10.9 13.3L16 13.2L4 2Z"
              stroke="#111827"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      )}
    </div>
  );
};
