import fs from "fs";
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
  const outputDir = buildTestOutputDir(rootDir, "cursorful-raw");
  fs.mkdirSync(outputDir, { recursive: true });

  const totalDurationMs = getDurationMs();
  const segmentMs = Math.max(10_000, Math.floor(totalDurationMs / REPOS.length));
  const beforeFiles = snapshotCursorfulFiles();

  let browser: Browser | null = null;
  let browserContext: BrowserContext | null = null;
  let primaryPage: Page | null = null;
  let app: ElectronApplication | null = null;

  try {
    ({ browser, browserContext, primaryPage } = await launchBrowserWithTabs());
    await primaryPage.bringToFront().catch(() => undefined);
    await primaryPage.waitForTimeout(1200);
    focusChromeWindow();

    app = await ensureCursorfulApp();
    const primaryWindow = await getPrimaryWindow(app);
    await bringCursorfulToFront();
    await primaryWindow.waitForTimeout(800);
    await waitForBodyText(primaryWindow, ["Select screen", "REC"], 20_000);
    await primaryWindow.screenshot({ path: path.join(outputDir, "cursorful-initial.png") });

    await selectScreen(app);
    await disableMicAndCamera(primaryWindow);
    await startRecording(primaryWindow);
    await primaryPage.bringToFront().catch(() => undefined);
    await primaryPage.waitForTimeout(1200);
    focusChromeWindow();

    for (const repo of REPOS) {
      await runGitHubWalkthrough(primaryPage, {
        repoUrl: repo.url,
        durationMs: segmentMs,
        cueOutputPath: path.join(outputDir, `${repo.slug}.focus-cues.json`),
      });
      await primaryPage.bringToFront().catch(() => undefined);
      focusChromeWindow();
    }

    await bringCursorfulToFront();
    await primaryWindow.waitForTimeout(800);
    await stopRecording(primaryWindow);
    await primaryWindow.screenshot({ path: path.join(outputDir, "cursorful-after-stop.png") });

    const afterFiles = snapshotCursorfulFilesDetailed();
    const newFiles = afterFiles.filter((entry) => !beforeFiles.has(entry.path) || beforeFiles.get(entry.path) !== entry.size);
    fs.writeFileSync(path.join(outputDir, "new-cursorful-files.json"), JSON.stringify(newFiles, null, 2), "utf8");

    const newestScreen = newFiles
      .filter((entry) => entry.size > 500_000)
      .sort((a, b) => b.modifiedMs - a.modifiedMs)[0];

    if (!newestScreen) {
      throw new Error("Cursorful did not produce a new finalized recording file.");
    }

    const finalPath = path.join(outputDir, "cursorful-two-repo-raw.mp4");
    fs.copyFileSync(newestScreen.path, finalPath);
    console.log(`Cursorful raw video: ${finalPath}`);
  } finally {
    await browserContext?.close().catch(() => undefined);
    await browser?.close().catch(() => undefined);
    await app?.close().catch(() => undefined);
  }
}

async function launchBrowserWithTabs() {
  const browser = await chromium.launch({
    headless: false,
    slowMo: 35,
    args: ["--start-maximized"],
  });
  const browserContext = await browser.newContext({ viewport: { width: 1920, height: 1080 } });

  const firstPage = await browserContext.newPage();
  await firstPage.goto(REPOS[0].url, { waitUntil: "domcontentloaded" });
  await firstPage.waitForLoadState("networkidle").catch(() => undefined);

  const secondPage = await browserContext.newPage();
  await secondPage.goto(REPOS[1].url, { waitUntil: "domcontentloaded" });
  await secondPage.waitForLoadState("networkidle").catch(() => undefined);

  await firstPage.bringToFront().catch(() => undefined);
  await firstPage.waitForTimeout(1500);

  return { browser, browserContext, primaryPage: firstPage };
}

async function ensureCursorfulApp(): Promise<ElectronApplication> {
  return electron.launch({ executablePath: CURSORFUL_EXE });
}

async function getPrimaryWindow(app: ElectronApplication): Promise<Page> {
  const firstWindow = await app.firstWindow({ timeout: 30_000 });
  await firstWindow.waitForLoadState("domcontentloaded").catch(() => undefined);
  const snapshots = await snapshotWindows(app);
  return app.windows()[choosePrimaryWindowIndex(snapshots)] ?? firstWindow;
}

async function selectScreen(app: ElectronApplication): Promise<void> {
  const primaryWindow = app.windows()[0];
  await primaryWindow.getByText("Select screen", { exact: true }).click();
  await waitForWindowCount(app, 2, 10_000);
  const screenWindow = app.windows().find((window) => window !== primaryWindow) ?? app.windows()[1];
  await waitForBodyText(screenWindow, ["Choose the screen you want to record"], 10_000);
  await screenWindow.getByText(/Screen 1/i).first().click();
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
  } catch {
    await recButton.focus().catch(() => undefined);
    await window.keyboard.press("Space").catch(() => undefined);
    await waitForBodyText(window, ["STOP", "PAUSE"], 10_000);
  }
}

async function stopRecording(window: Page): Promise<void> {
  const stopButton = window.getByRole("button", { name: /STOP/i }).first();
  await stopButton.click({ force: true }).catch(() => undefined);
  try {
    await waitForBodyText(window, ["REC", "EDIT"], 15_000);
  } catch {
    await stopButton.focus().catch(() => undefined);
    await window.keyboard.press("Space").catch(() => undefined);
    await waitForBodyText(window, ["REC", "EDIT"], 15_000);
  }
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

async function snapshotWindows(app: ElectronApplication): Promise<CursorfulWindowSnapshot[]> {
  const snapshots: CursorfulWindowSnapshot[] = [];
  for (const window of app.windows()) {
    const title = await window.title().catch(() => "");
    const bodyText = await window.locator("body").innerText().catch(() => "");
    snapshots.push({ title, bodyText });
  }
  return snapshots;
}

function snapshotCursorfulFiles() {
  const dir = path.join(
    process.env.USERPROFILE ?? "",
    "AppData",
    "Local",
    "Packages",
    "Cursorful.Cursorful_pap8eggyejp00",
    "LocalCache",
    "Roaming",
    "Cursorful",
    "File System",
    "000",
    "t",
    "00",
  );

  const entries = new Map<string, number>();
  if (!fs.existsSync(dir)) {
    return entries;
  }

  for (const file of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isFile()) {
      entries.set(fullPath, stat.size);
    }
  }
  return entries;
}

function snapshotCursorfulFilesDetailed() {
  const dir = path.join(
    process.env.USERPROFILE ?? "",
    "AppData",
    "Local",
    "Packages",
    "Cursorful.Cursorful_pap8eggyejp00",
    "LocalCache",
    "Roaming",
    "Cursorful",
    "File System",
    "000",
    "t",
    "00",
  );

  if (!fs.existsSync(dir)) {
    return [] as Array<{ path: string; size: number; modifiedMs: number }>;
  }

  return fs.readdirSync(dir).map((file) => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    return { path: fullPath, size: stat.size, modifiedMs: stat.mtimeMs };
  });
}

function getDurationMs(): number {
  const arg = process.argv.find((entry) => entry.startsWith("--duration="));
  const seconds = arg ? Number.parseInt(arg.split("=")[1] ?? "", 10) : 30;
  return Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : 30_000;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

function focusChromeWindow(): void {
  const script = `
Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class WinApi {
  [DllImport("user32.dll")] public static extern bool ShowWindowAsync(IntPtr hWnd, int nCmdShow);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
}
"@;
$p = Get-Process chrome | Where-Object { $_.MainWindowTitle -match 'Google Chrome' } | Select-Object -First 1;
if ($p -and $p.MainWindowHandle -ne 0) {
  [WinApi]::ShowWindowAsync($p.MainWindowHandle, 3) | Out-Null
  Start-Sleep -Milliseconds 150
  [WinApi]::SetForegroundWindow($p.MainWindowHandle) | Out-Null
}
`;
  execFileSync("powershell", ["-NoProfile", "-Command", script], { windowsHide: true });
}

async function bringCursorfulToFront(): Promise<void> {
  const script = `
Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class WinApi {
  [DllImport("user32.dll")] public static extern bool ShowWindowAsync(IntPtr hWnd, int nCmdShow);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
}
"@;
$p = Get-Process Cursorful | Where-Object { $_.MainWindowTitle -eq 'Cursorful' } | Select-Object -First 1;
if ($p -and $p.MainWindowHandle -ne 0) {
  [WinApi]::ShowWindowAsync($p.MainWindowHandle, 9) | Out-Null
  Start-Sleep -Milliseconds 150
  [WinApi]::SetForegroundWindow($p.MainWindowHandle) | Out-Null
}
`;
  execFileSync("powershell", ["-NoProfile", "-Command", script], { windowsHide: true });
}
