import fs from "fs";
import path from "path";
import { spawn } from "child_process";

async function main() {
  const sessionDir = path.join(process.cwd(), "runtime", "browser-session");
  fs.mkdirSync(sessionDir, { recursive: true });
  const logPath = path.join(sessionDir, "prepare-browser-server.log");
  const wsFile = path.join(sessionDir, "two-repo-ws-endpoint.txt");
  if (fs.existsSync(wsFile)) {
    fs.unlinkSync(wsFile);
  }
  const out = fs.openSync(logPath, "w");

  const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  const profileDir = path.join(sessionDir, "two-repo-profile");
  fs.mkdirSync(profileDir, { recursive: true });

  const child = spawn(
    chromePath,
    [
      "--new-window",
      "--remote-debugging-port=9222",
      `--user-data-dir=${profileDir}`,
      "--no-first-run",
      "--no-default-browser-check",
      "https://github.com/bytedance/deer-flow",
      "https://github.com/NousResearch/hermes-agent",
    ],
    {
      detached: true,
      stdio: ["ignore", out, out],
      windowsHide: false,
      cwd: process.cwd(),
    },
  );

  child.unref();

  fs.writeFileSync(wsFile, "http://127.0.0.1:9222", "utf8");

  console.log("Prepared Chrome browser with two repo tabs.");
  console.log("CDP endpoint file: runtime\\browser-session\\two-repo-ws-endpoint.txt");
  console.log(`Prepare log: ${logPath}`);
  console.log("Leave this browser open. Use the attach script next.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
