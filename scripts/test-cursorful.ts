import fs from "fs";
import os from "os";
import path from "path";
import { execFileSync } from "child_process";
import { _electron as electron, chromium, type Browser, type BrowserContext, type ElectronApplication, type Page } from "playwright";
import { buildTestOutputDir, runGitHubWalkthrough } from "./lib/github-walkthrough";
import { choosePrimaryWindowIndex, type CursorfulWindowSnapshot } from "../src/lib/cursorful";

const CURSORFUL_EXE =
  "C:/Program Files/WindowsApps/Cursorful.Cursorful_0.0.10.0_x64__pap8eggyejp00/app/Cursorful.exe";

const REPOS = [
  { slug: "bytedance-deer-flow", url: "https://github.com/bytedance/deer-flow" },
  { slug: "nousresearch-hermes-agent", url: "https://github.com/NousResearch/hermes-agent" },
];

async function main() {
  const rootDir = process.cwd();
  const outputDir = buildTestOutputDir(rootDir, "cursorful");
  fs.mkdirSync(outputDir, { recursive: true });
  const totalDurationMs = getDurationMs();

  const app = await electron.launch({
    executablePath: CURSORFUL_EXE,
  });
  let browser: Browser | null = null;
  let browserContext: BrowserContext | null = null;
  let page: Page | null = null;

  try {
    const primaryWindow = await getPrimaryWindow(app);
    await prepareCursorfulHud(primaryWindow, outputDir);
    await selectScreen(app);
    await disableMicAndCamera(primaryWindow);
    await startRecording(primaryWindow);
    minimizeForegroundWindow();
    ({ browser, browserContext, page } = await launchForegroundBrowser());
    if (!page) {
      throw new Error("Foreground browser page did not launch.");
    }

    const segmentMs = Math.max(8_000, Math.floor(totalDurationMs / REPOS.length));
    for (const repo of REPOS) {
      await runGitHubWalkthrough(page, {
        repoUrl: repo.url,
        durationMs: segmentMs,
        cueOutputPath: path.join(outputDir, `${repo.slug}.focus-cues.json`),
      });
    }

    await stopRecording(primaryWindow);
    await primaryWindow.waitForTimeout(8000);
    await primaryWindow.screenshot({ path: path.join(outputDir, "after-stop.png") });

    const exportBefore = snapshotMp4Files();
    const editorWindow = await openEditor(app, primaryWindow, outputDir);
    await loadLatestRecording(editorWindow);
    await editorWindow.screenshot({ path: path.join(outputDir, "editor-loaded.png") });
    await startExport(editorWindow);

    const exportPath = await waitForExportedVideo(exportBefore, 90_000);
    if (!exportPath) {
      throw new Error("Cursorful did not produce an exported video within the wait window.");
    }

    const finalPath = path.join(outputDir, "cursorful-two-repo-test.mp4");
    fs.copyFileSync(exportPath, finalPath);
    console.log(`Cursorful exported video: ${finalPath}`);
  } finally {
    await browserContext?.close().catch(() => undefined);
    await browser?.close().catch(() => undefined);
    await app.close().catch(() => undefined);
  }
}

async function getPrimaryWindow(app: ElectronApplication): Promise<Page> {
  await waitForWindowCount(app, 1, 15_000);
  const snapshots = await snapshotWindows(app);
  return app.windows()[choosePrimaryWindowIndex(snapshots)];
}

async function prepareCursorfulHud(window: Page, outputDir: string): Promise<void> {
  await window.waitForLoadState("domcontentloaded");
  await waitForBodyText(window, ["Select screen", "REC"], 20_000);
  await window.screenshot({ path: path.join(outputDir, "initial.png") });
}

async function launchForegroundBrowser() {
  const browser = await chromium.launch({
    headless: false,
    slowMo: 35,
    args: ["--start-maximized"],
  });

  const browserContext = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await browserContext.newPage();
  await page.bringToFront().catch(() => undefined);
  await page.waitForTimeout(1200);
  return { browser, browserContext, page };
}

async function selectScreen(app: ElectronApplication): Promise<void> {
  const primaryWindow = app.windows()[0];
  await primaryWindow.getByText("Select screen", { exact: true }).click();
  await waitForWindowCount(app, 2, 10_000);
  const screenWindow = app.windows().find((window) => window !== primaryWindow) ?? app.windows()[1];
  await waitForBodyText(screenWindow, ["Choose the screen you want to record"], 10_000);
  const choice = screenWindow.getByText(/Screen 1/i).first();
  await choice.click();
  await waitForBodyText(primaryWindow, ["REC", "EDIT"], 10_000);
}

async function disableMicAndCamera(window: Page): Promise<void> {
  await selectDeviceOption(window, "Disable microphone");
  await selectDeviceOption(window, "Disable camera");
}

async function startRecording(window: Page): Promise<void> {
  const recButton = window.getByRole("button", { name: "REC" }).first();
  await recButton.click({ force: true }).catch(() => undefined);
  try {
    await waitForBodyText(window, ["STOP", "PAUSE"], 10_000);
    return;
  } catch {
    await recButton.focus().catch(() => undefined);
    await window.keyboard.press("Space").catch(() => undefined);
    await waitForBodyText(window, ["STOP", "PAUSE"], 10_000);
  }
}

async function stopRecording(window: Page): Promise<void> {
  const stopButton = window.getByRole("button", { name: /STOP/i }).first();
  await stopButton.focus();
  await window.keyboard.press("Space");
  await waitForBodyText(window, ["REC", "EDIT"], 20_000);
}

async function openEditor(app: ElectronApplication, primaryWindow: Page, outputDir: string): Promise<Page> {
  const editButton = primaryWindow.getByRole("button", { name: /EDIT/i }).first();
  await editButton.click({ force: true }).catch(() => undefined);

  const deadline = Date.now() + 20_000;
  let attemptedKeyboard = false;
  while (Date.now() < deadline) {
    const windows = app.windows();
    if (windows.length < 2 && !attemptedKeyboard) {
      await editButton.focus().catch(() => undefined);
      await primaryWindow.keyboard.press("Space").catch(() => undefined);
      attemptedKeyboard = true;
    }

    if (windows.length >= 3) {
      const candidate = windows[windows.length - 1];
      await candidate.screenshot({ path: path.join(outputDir, "editor-shell.png") }).catch(() => undefined);
      return candidate;
    }

    for (let index = 0; index < windows.length; index += 1) {
      const candidate = windows[index];
      if (!candidate || candidate === primaryWindow) {
        continue;
      }

      const hasLatest = await candidate.getByText(/Load latest recording/i).first().isVisible().catch(() => false);
      const hasExport = await candidate.getByText(/Export video/i).first().isVisible().catch(() => false);
      if (hasLatest || hasExport) {
        await candidate.screenshot({ path: path.join(outputDir, "editor-shell.png") }).catch(() => undefined);
        return candidate;
      }
    }

    await primaryWindow.waitForTimeout(700);
  }

  const snapshots = await snapshotWindows(app);
  fs.writeFileSync(path.join(outputDir, "editor-debug.json"), JSON.stringify(snapshots, null, 2), "utf8");
  for (let index = 0; index < app.windows().length; index += 1) {
    await app.windows()[index]
      ?.screenshot({ path: path.join(outputDir, `editor-debug-${index}.png`) })
      .catch(() => undefined);
  }
  throw new Error("Could not locate the Cursorful editor window.");
}

async function loadLatestRecording(editorWindow: Page): Promise<void> {
  const latest = editorWindow.getByText(/Load latest recording/i).first();
  await latest.click({ force: true }).catch(() => undefined);
  await editorWindow.waitForTimeout(3500);
}

async function startExport(editorWindow: Page): Promise<void> {
  const exportTrigger = editorWindow.getByText(/Export video/i).first();
  await exportTrigger.click({ force: true });
}

async function waitForWindowCount(app: ElectronApplication, count: number, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (app.windows().length >= count) {
      return;
    }
    await app.windows()[0]?.waitForTimeout?.(250);
  }
  throw new Error(`Timed out waiting for ${count} Cursorful window(s).`);
}

async function waitForBodyText(window: Page, fragments: string[], timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const text = await window.locator("body").innerText().catch(() => "");
    if (fragments.every((fragment) => text.includes(fragment))) {
      return;
    }
    await window.waitForTimeout(300);
  }
  throw new Error(`Timed out waiting for body text fragments: ${fragments.join(", ")}`);
}

async function selectDeviceOption(window: Page, optionLabel: string): Promise<void> {
  await window.evaluate((targetLabel) => {
    const optionDiv = Array.from(document.querySelectorAll("div"))
      .find((node) => node.textContent?.trim() === targetLabel) as HTMLDivElement | undefined;
    if (optionDiv) {
      optionDiv.click();
      return;
    }

    const option = Array.from(document.querySelectorAll("option"))
      .find((node) => node.textContent?.trim() === targetLabel) as HTMLOptionElement | undefined;
    if (!option) {
      return;
    }

    const select = option.parentElement as HTMLSelectElement | null;
    if (select) {
      select.value = option.value;
      select.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }, optionLabel);
  await window.waitForTimeout(250);
}

async function snapshotWindows(app: ElectronApplication): Promise<CursorfulWindowSnapshot[]> {
  const snapshots: CursorfulWindowSnapshot[] = [];
  for (const window of app.windows()) {
    const title = await window.title().catch(() => "");
    const bodyText = await window.locator("body").innerText().catch(() => "");
    snapshots.push({ title, bodyText });
  }
  return snapshots;
}

function snapshotMp4Files(): Map<string, number> {
  const files = new Map<string, number>();
  for (const baseDir of candidateExportDirs()) {
    if (!fs.existsSync(baseDir)) {
      continue;
    }

    for (const filePath of walkForMp4(baseDir)) {
      const stat = fs.statSync(filePath);
      files.set(filePath, stat.size);
    }
  }
  return files;
}

async function waitForExportedVideo(before: Map<string, number>, timeoutMs: number): Promise<string | null> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    for (const baseDir of candidateExportDirs()) {
      if (!fs.existsSync(baseDir)) {
        continue;
      }

      for (const filePath of walkForMp4(baseDir)) {
        const stat = fs.statSync(filePath);
        const previousSize = before.get(filePath);
        if ((previousSize === undefined || stat.size > previousSize) && stat.size > 500_000) {
          return filePath;
        }
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  return null;
}

function candidateExportDirs(): string[] {
  return [
    path.join(os.homedir(), "Downloads"),
    path.join(
      os.homedir(),
      "AppData",
      "Local",
      "Packages",
      "Cursorful.Cursorful_pap8eggyejp00",
      "LocalCache",
      "Roaming",
      "Cursorful",
    ),
  ];
}

function* walkForMp4(dir: string): Generator<string> {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walkForMp4(fullPath);
      continue;
    }
    if (entry.isFile() && fullPath.toLowerCase().endsWith(".mp4")) {
      yield fullPath;
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

function getDurationMs(): number {
  const arg = process.argv.find((entry) => entry.startsWith("--duration="));
  const seconds = arg ? Number.parseInt(arg.split("=")[1] ?? "", 10) : 60;
  return Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : 60_000;
}

function minimizeForegroundWindow(): void {
  const script = `
Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class WinApi {
  [DllImport("user32.dll")]
  public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")]
  public static extern bool ShowWindowAsync(IntPtr hWnd, int nCmdShow);
}
"@;
$hwnd = [WinApi]::GetForegroundWindow();
if ($hwnd -ne [IntPtr]::Zero) {
  [WinApi]::ShowWindowAsync($hwnd, 6) | Out-Null
}
`;
  execFileSync("powershell", ["-NoProfile", "-Command", script], {
    windowsHide: true,
  });
}
