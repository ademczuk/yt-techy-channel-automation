import React from "react";
import { useCurrentFrame, interpolate } from "remotion";

interface ProgressBarProps {
  totalFrames: number;
}

/**
 * Thin progress bar at the bottom of the video showing episode progress.
 */
export const ProgressBar: React.FC<ProgressBarProps> = ({ totalFrames }) => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [0, totalFrames], [0, 100], {
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        width: "100%",
        height: 4,
        zIndex: 100,
        background: "rgba(0, 0, 0, 0.3)",
      }}
    >
      <div
        style={{
          width: `${progress}%`,
          height: "100%",
          background: "linear-gradient(90deg, #667eea, #764ba2)",
        }}
      />
    </div>
  );
};
