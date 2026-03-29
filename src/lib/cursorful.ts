export interface CursorfulWindowSnapshot {
  title: string;
  bodyText: string;
}

export function choosePrimaryWindowIndex(windows: CursorfulWindowSnapshot[]): number {
  const index = windows.findIndex((window) => {
    const text = normalize(window.bodyText);
    return text.includes("select screen") && text.includes("rec") && text.includes("edit");
  });

  return index >= 0 ? index : 0;
}

export function chooseEditorWindowIndex(windows: CursorfulWindowSnapshot[]): number {
  const exactIndex = windows.findIndex((window) => {
    const text = normalize(window.bodyText);
    return text.includes("load latest recording");
  });

  if (exactIndex >= 0) {
    return exactIndex;
  }

  const exportIndex = windows.findIndex((window) => {
    const text = normalize(window.bodyText);
    return text.includes("export video");
  });

  return exportIndex >= 0 ? exportIndex : 0;
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}
