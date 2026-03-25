import { execFileSync } from "child_process";

export async function readAudioDurationMs(filePath: string): Promise<number> {
  const output = execFileSync(
    "ffprobe",
    [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      filePath,
    ],
    {
      stdio: ["ignore", "pipe", "pipe"],
      encoding: "utf8",
    },
  );

  return parseDurationToMs(output.trim());
}

export function parseDurationToMs(value: string): number {
  const seconds = Number.parseFloat(value);
  if (!Number.isFinite(seconds)) {
    throw new Error(`Invalid audio duration: ${value}`);
  }

  return Math.round(seconds * 1000);
}
