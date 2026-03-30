import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createDashboardApi, resolveDashboardStaticPath } from "./api";

export async function createDashboardServer(input: {
  rootDir: string;
  port?: number;
  runGitHubDiscovery?: Parameters<typeof createDashboardApi>[0]["runGitHubDiscovery"];
  runGitHubResearch?: Parameters<typeof createDashboardApi>[0]["runGitHubResearch"];
  runHarnessScript?: Parameters<typeof createDashboardApi>[0]["runHarnessScript"];
  runHarnessAudio?: Parameters<typeof createDashboardApi>[0]["runHarnessAudio"];
  runHarnessRecordingPlan?: Parameters<typeof createDashboardApi>[0]["runHarnessRecordingPlan"];
  runHarnessCapture?: Parameters<typeof createDashboardApi>[0]["runHarnessCapture"];
}): Promise<{
  port: number;
  close: () => Promise<void>;
}> {
  const api = createDashboardApi({
    rootDir: input.rootDir,
    runGitHubDiscovery: input.runGitHubDiscovery,
    runGitHubResearch: input.runGitHubResearch,
    runHarnessScript: input.runHarnessScript,
    runHarnessAudio: input.runHarnessAudio,
    runHarnessRecordingPlan: input.runHarnessRecordingPlan,
    runHarnessCapture: input.runHarnessCapture,
  });

  const server = http.createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? "/", "http://127.0.0.1");

      if (request.method === "GET" && url.pathname === "/api/runs") {
        return sendJson(response, 200, api.listRuns());
      }

      if (request.method === "POST" && url.pathname === "/api/runs") {
        const body = await readJsonBody(request);
        const run = api.createRun({
          mode: body?.mode === "manual-urls" ? "manual-urls" : body?.mode === "post-polish" ? "post-polish" : "daily-discovery",
        });
        return sendJson(response, 201, { run });
      }

      const runMatch = url.pathname.match(/^\/api\/runs\/([^/]+)$/);
      if (request.method === "GET" && runMatch) {
        const run = api.getRun(decodeURIComponent(runMatch[1]));
        if (!run) {
          return sendJson(response, 404, { error: "Run not found" });
        }
        return sendJson(response, 200, run);
      }

      const artifactsMatch = url.pathname.match(/^\/api\/runs\/([^/]+)\/artifacts$/);
      if (request.method === "GET" && artifactsMatch) {
        try {
          const artifacts = api.listArtifacts(decodeURIComponent(artifactsMatch[1]));
          return sendJson(response, 200, artifacts);
        } catch (error) {
          return sendJson(response, 404, {
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      const discoveryMatch = url.pathname.match(/^\/api\/runs\/([^/]+)\/stages\/discovery$/);
      if (request.method === "POST" && discoveryMatch) {
        try {
          const run = await api.runDiscovery(decodeURIComponent(discoveryMatch[1]));
          return sendJson(response, 200, { run });
        } catch (error) {
          return sendJson(response, 500, {
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      const researchMatch = url.pathname.match(/^\/api\/runs\/([^/]+)\/stages\/research$/);
      if (request.method === "POST" && researchMatch) {
        try {
          const run = await api.runResearch(decodeURIComponent(researchMatch[1]));
          return sendJson(response, 200, { run });
        } catch (error) {
          return sendJson(response, 500, {
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      const scriptMatch = url.pathname.match(/^\/api\/runs\/([^/]+)\/stages\/script$/);
      if (request.method === "POST" && scriptMatch) {
        try {
          const run = await api.runScript(decodeURIComponent(scriptMatch[1]));
          return sendJson(response, 200, { run });
        } catch (error) {
          return sendJson(response, 500, {
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      const audioMatch = url.pathname.match(/^\/api\/runs\/([^/]+)\/stages\/audio$/);
      if (request.method === "POST" && audioMatch) {
        try {
          const run = await api.runAudio(decodeURIComponent(audioMatch[1]));
          return sendJson(response, 200, { run });
        } catch (error) {
          return sendJson(response, 500, {
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      const recordingPlanMatch = url.pathname.match(/^\/api\/runs\/([^/]+)\/stages\/recording-plan$/);
      if (request.method === "POST" && recordingPlanMatch) {
        try {
          const run = await api.runRecordingPlan(decodeURIComponent(recordingPlanMatch[1]));
          return sendJson(response, 200, { run });
        } catch (error) {
          return sendJson(response, 500, {
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      const captureMatch = url.pathname.match(/^\/api\/runs\/([^/]+)\/stages\/capture$/);
      if (request.method === "POST" && captureMatch) {
        try {
          const run = await api.runCapture(decodeURIComponent(captureMatch[1]));
          return sendJson(response, 200, { run });
        } catch (error) {
          return sendJson(response, 500, {
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      const pipelineMatch = url.pathname.match(/^\/api\/runs\/([^/]+)\/pipeline$/);
      if (request.method === "POST" && pipelineMatch) {
        try {
          const run = await api.runPipeline(decodeURIComponent(pipelineMatch[1]));
          return sendJson(response, 200, { run });
        } catch (error) {
          return sendJson(response, 500, {
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      const staticPath = resolveDashboardStaticPath(input.rootDir, url.pathname);
      const safeRoot = path.join(input.rootDir, "dashboard");
      if (!staticPath.startsWith(safeRoot) || !fs.existsSync(staticPath) || fs.statSync(staticPath).isDirectory()) {
        return sendJson(response, 404, { error: "Not found" });
      }

      response.statusCode = 200;
      response.setHeader("content-type", contentTypeFor(staticPath));
      fs.createReadStream(staticPath).pipe(response);
    } catch (error) {
      sendJson(response, 500, {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  await new Promise<void>((resolve) => {
    server.listen(input.port ?? 0, "127.0.0.1", () => resolve());
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Could not determine dashboard server port");
  }

  return {
    port: address.port,
    close: () => new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    }),
  };
}

const thisFilePath = fileURLToPath(import.meta.url);

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(thisFilePath)) {
  const rootDir = process.cwd();
  createDashboardServer({ rootDir, port: 4173 })
    .then(({ port }) => {
      console.log(`Dashboard running at http://127.0.0.1:${port}`);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

async function readJsonBody(request: http.IncomingMessage): Promise<any> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  if (chunks.length === 0) {
    return null;
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function sendJson(response: http.ServerResponse, statusCode: number, payload: unknown): void {
  response.statusCode = statusCode;
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.end(`${JSON.stringify(payload, null, 2)}\n`);
}

function contentTypeFor(filePath: string): string {
  if (filePath.endsWith(".html")) {
    return "text/html; charset=utf-8";
  }
  if (filePath.endsWith(".css")) {
    return "text/css; charset=utf-8";
  }
  if (filePath.endsWith(".js")) {
    return "text/javascript; charset=utf-8";
  }
  if (filePath.endsWith(".json")) {
    return "application/json; charset=utf-8";
  }
  return "application/octet-stream";
}
