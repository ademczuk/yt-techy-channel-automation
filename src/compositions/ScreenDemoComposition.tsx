import React from "react";
import {
  AbsoluteFill,
  Audio,
  Freeze,
  OffthreadVideo,
  Sequence,
  staticFile,
  useCurrentFrame,
} from "remotion";
import type { CameraKeyframe, DemoClip } from "../lib/screen-demo-types";
import {
  buildCameraWindows,
  calculateScreenDemoDurationInFrames,
  getRecordingVideoStyle,
  buildScreenDemoTimeline,
  resolveCameraTransform,
  type ScreenDemoTimelineClip,
} from "../lib/screen-demo-remotion";

export interface ScreenDemoCompositionProps {
  recordingSrc: string;
  clips: DemoClip[];
  camera: CameraKeyframe[];
  audioTracks?: Array<{
    src: string;
    startMs: number;
    durationMs?: number;
    label: string;
  }>;
  visualOffsetMs?: number;
  fps: number;
  backgroundMode: "dark" | "light";
  playbackRate: number;
  viewport: {
    width: number;
    height: number;
  };
}

export const ScreenDemoComposition: React.FC<ScreenDemoCompositionProps> = ({
  recordingSrc,
  clips,
  camera,
  audioTracks = [],
  visualOffsetMs = 0,
  fps,
  backgroundMode,
  playbackRate,
  viewport,
}) => {
  const resolvedRecordingSrc = recordingSrc.startsWith("/")
    ? staticFile(recordingSrc.replace(/^\/+/, ""))
    : recordingSrc;
  const resolvedAudioTracks = audioTracks.map((track) => ({
    ...track,
    src: track.src.startsWith("/") ? staticFile(track.src.replace(/^\/+/, "")) : track.src,
  }));
  const timeline = buildScreenDemoTimeline(clips, fps, playbackRate, visualOffsetMs);
  const audioEndFrame = resolvedAudioTracks.reduce((maxFrame, track) => {
    const startFrame = Math.round((track.startMs / 1000) * fps);
    const durationFrameGuess = track.durationMs ? Math.round((track.durationMs / 1000) * fps) : 0;
    return Math.max(maxFrame, startFrame + durationFrameGuess);
  }, 0);
  const compositionDurationInFrames = Math.max(
    calculateScreenDemoDurationInFrames(clips, fps, playbackRate, visualOffsetMs),
    audioEndFrame || 0,
  );

  return (
    <AbsoluteFill
      style={{
        background: backgroundMode === "dark"
          ? "linear-gradient(135deg, #0b1220 0%, #15233b 55%, #1e314f 100%)"
          : "linear-gradient(135deg, #eef3ff 0%, #dfe8fb 55%, #d4def6 100%)",
      }}
    >
      <AbsoluteFill
        style={{
          padding: 72,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <div
          style={{
            width: 1600,
            height: 900,
            borderRadius: 32,
            overflow: "hidden",
            boxShadow: "0 30px 80px rgba(0,0,0,0.28)",
            backgroundColor: "#05070a",
            position: "relative",
          }}
        >
          <Sequence from={0} durationInFrames={compositionDurationInFrames}>
            <AbsoluteFill>
              {resolvedAudioTracks.map((track) => (
                <Sequence
                  key={`${track.label}-${track.startMs}`}
                  from={Math.round((track.startMs / 1000) * fps)}
                  durationInFrames={Math.max(1, Math.round(((track.durationMs ?? 1000) / 1000) * fps))}
                >
                  <Audio src={track.src} />
                </Sequence>
              ))}
            </AbsoluteFill>
          </Sequence>
          {timeline.map((timelineClip) => (
            <ClipSequence
              key={`${timelineClip.clip.startMs}-${timelineClip.clip.endMs}-${timelineClip.clip.labels.join("-")}`}
              timelineClip={timelineClip}
              camera={camera}
              recordingSrc={resolvedRecordingSrc}
              fps={fps}
              playbackRate={playbackRate}
              viewport={viewport}
            />
          ))}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const ClipSequence: React.FC<{
  timelineClip: ScreenDemoTimelineClip;
  camera: CameraKeyframe[];
  recordingSrc: string;
  fps: number;
  playbackRate: number;
  viewport: { width: number; height: number };
}> = ({ timelineClip, camera, recordingSrc, fps, playbackRate, viewport }) => {
  const { fromFrame, durationInFrames, sourceStartFrame, sourceEndFrame, sourceDurationInFrames } = timelineClip;
  const frame = useCurrentFrame();
  const clipFrame = Math.min(durationInFrames - 1, Math.max(0, frame));
  const cameraWindows = buildCameraWindows(timelineClip, camera, fps, playbackRate);
  const { scale, offsetX, offsetY } = resolveCameraTransform(clipFrame, cameraWindows, viewport);
  const holdFrames = Math.max(0, durationInFrames - sourceDurationInFrames);
  const recordingVideoStyle = getRecordingVideoStyle();

  return (
    <Sequence from={fromFrame} durationInFrames={durationInFrames}>
      <AbsoluteFill
        style={{
          transform: `translate(${offsetX}px, ${offsetY}px) scale(${scale})`,
          transformOrigin: "center center",
        }}
        >
          <Sequence from={0} durationInFrames={Math.max(1, Math.min(durationInFrames, sourceDurationInFrames))}>
            <OffthreadVideo
              src={recordingSrc}
              startFrom={sourceStartFrame}
              endAt={sourceEndFrame}
              playbackRate={playbackRate}
              style={recordingVideoStyle}
            />
          </Sequence>
          {holdFrames > 0 ? (
            <Sequence from={sourceDurationInFrames} durationInFrames={holdFrames}>
              <Freeze frame={Math.max(0, sourceDurationInFrames - 1)}>
                <OffthreadVideo
                  src={recordingSrc}
                  startFrom={sourceStartFrame}
                  endAt={sourceEndFrame}
                  playbackRate={playbackRate}
                  style={recordingVideoStyle}
                />
              </Freeze>
            </Sequence>
          ) : null}
      </AbsoluteFill>
    </Sequence>
  );
};
