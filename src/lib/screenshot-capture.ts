export interface CaptureConfig {
  viewport: {
    width: number;
    height: number;
  };
  fullPage: boolean;
  overwriteExisting?: boolean;
  minScreenshotBytes?: number;
  minScreenshotHeight?: number;
  maxScreenshotHeight?: number;
  minScreenshotWidth?: number;
  waitAfterLoadMs?: number;
}

export interface ScreenshotInspection {
  size: number;
  width: number;
  height: number;
}

export const DEFAULT_CAPTURE_CONFIG: CaptureConfig = {
  viewport: {
    width: 1920,
    height: 1080,
  },
  fullPage: true,
  overwriteExisting: false,
  minScreenshotBytes: 50_000,
  minScreenshotWidth: 1_500,
  minScreenshotHeight: 900,
  maxScreenshotHeight: 80_000,
  waitAfterLoadMs: 1_200,
};

export function buildCaptureUrl(url: string): string {
  if (!/^https?:\/\//i.test(url)) {
    return url;
  }

  const parsed = new URL(url);

  if (parsed.hostname === "github.com" && !parsed.hash) {
    parsed.hash = "readme";
  }

  return parsed.toString();
}

export function isScreenshotUsable(
  inspection: ScreenshotInspection,
  config: CaptureConfig,
): boolean {
  return !getScreenshotFailureReason(inspection, config);
}

export function getScreenshotFailureReason(
  inspection: ScreenshotInspection,
  config: CaptureConfig,
): string | undefined {
  if (inspection.size < (config.minScreenshotBytes ?? DEFAULT_CAPTURE_CONFIG.minScreenshotBytes!)) {
    return "file-too-small";
  }

  if (inspection.width < (config.minScreenshotWidth ?? DEFAULT_CAPTURE_CONFIG.minScreenshotWidth!)) {
    return "width-too-small";
  }

  if (inspection.height < (config.minScreenshotHeight ?? DEFAULT_CAPTURE_CONFIG.minScreenshotHeight!)) {
    return "height-too-small";
  }

  if (inspection.height > (config.maxScreenshotHeight ?? DEFAULT_CAPTURE_CONFIG.maxScreenshotHeight!)) {
    return "height-too-tall";
  }

  return undefined;
}

export function buildReadmeFocusScript(): string {
  return `
(() => {
  const selectors = [
    '#readme',
    '[data-testid="readme"]',
    'article.markdown-body',
    '.markdown-body'
  ];

  const target = selectors
    .map((selector) => document.querySelector(selector))
    .find(Boolean);

  if (target instanceof HTMLElement) {
    target.scrollIntoView({ block: 'start', inline: 'nearest' });
    return JSON.stringify({ focused: true, scrollY: window.scrollY });
  }

  window.scrollTo({ top: 720, behavior: 'instant' });
  return JSON.stringify({ focused: false, scrollY: window.scrollY });
})();
  `.trim();
}
