/**
 * Capture screenshots for skills in the current manifest.
 * Runs headless Playwright against clawhub.ai skill pages.
 */
import fs from "fs";
import path from "path";
import { chromium } from "playwright";

const date = new Date().toISOString().slice(0, 10);
const episodeDir = path.join(process.cwd(), "runtime", "episodes", date);
const manifestPath = path.join(episodeDir, "manifest.json");

if (!fs.existsSync(manifestPath)) {
  console.error("No manifest found at", manifestPath);
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const screenshotsDir = path.join(episodeDir, "screenshots");
fs.mkdirSync(screenshotsDir, { recursive: true });

// Also create public/ mirrors for Remotion
const publicScreenshots = path.join(process.cwd(), "public", "screenshots");
fs.mkdirSync(publicScreenshots, { recursive: true });

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    colorScheme: "dark",
  });
  const page = await context.newPage();

  const allSkills = [...manifest.movers, ...manifest.rockets];

  for (const skill of allSkills) {
    const url = skill.clawhubUrl;
    const fileName = `${skill.slug.replace(/[^a-z0-9-]/g, "-")}.png`;
    const outputPath = path.join(screenshotsDir, fileName);
    const publicPath = path.join(publicScreenshots, fileName);

    console.log(`Capturing: ${skill.displayName} → ${url}`);

    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForLoadState("networkidle").catch(() => {});
      await page.waitForTimeout(2000);

      await page.screenshot({
        path: outputPath,
        fullPage: true,
        animations: "disabled",
      });

      // Copy to public/ for Remotion
      fs.copyFileSync(outputPath, publicPath);

      // Update manifest with correct path
      skill.screenshotPath = `screenshots/${fileName}`;

      const stats = fs.statSync(outputPath);
      console.log(`  ✓ ${fileName} (${(stats.size / 1024).toFixed(0)} KB)`);
    } catch (err: any) {
      console.error(`  ✗ Failed: ${err.message}`);
    }
  }

  await context.close();
  await browser.close();

  // Write updated manifest
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`\nUpdated manifest with screenshot paths.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
