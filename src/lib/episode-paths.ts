import path from "path";

export function getLocalDateStamp(now: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return formatter.format(now);
}

export function getEpisodeDir(baseDir: string, date: string): string {
  return path.join(baseDir, "runtime", "episodes", date);
}
