export function detectMostlyBlackVideo(stderr: string): boolean {
  const matches = Array.from(
    stderr.matchAll(/black_start:(?<start>[0-9.]+)\s+black_end:(?<end>[0-9.]+)\s+black_duration:(?<duration>[0-9.]+)/g),
  );

  if (matches.length === 0) {
    return false;
  }

  return matches.some((match) => {
    const duration = Number.parseFloat(match.groups?.duration ?? "");
    return Number.isFinite(duration) && duration >= 2;
  });
}
