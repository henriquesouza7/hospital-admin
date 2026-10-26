import { execFileSync, spawn } from "node:child_process";
import { resolve } from "node:path";

const worktree = process.cwd();
const git = (...args) =>
  execFileSync("git", args, { cwd: worktree, encoding: "utf8" }).trim();
const branch = git("branch", "--show-current") || "detached";
const commit = git("rev-parse", "--short", "HEAD");
const args = process.argv.slice(2);
const portIndex = args.findIndex((arg) => arg === "--port" || arg === "-p");
const inlinePort = args.find(
  (arg) => arg.startsWith("--port=") || arg.startsWith("-p="),
);
const cliPort =
  inlinePort?.split("=")[1] ??
  (portIndex >= 0 ? args[portIndex + 1] : undefined);
const port = cliPort ?? process.env.PORT ?? "3000";

console.info(
  "Hospital Admin dev | worktree: " +
    worktree +
    " | branch: " +
    branch +
    " | HEAD: " +
    commit +
    " | porta: " +
    port,
);

const nextCli = resolve(worktree, "node_modules/next/dist/bin/next");
const next = spawn(process.execPath, [nextCli, "dev", ...args], {
  cwd: worktree,
  stdio: "inherit",
});

process.on("SIGINT", () => next.kill("SIGINT"));
process.on("SIGTERM", () => next.kill("SIGTERM"));

next.on("error", (error) => {
  console.error("Não foi possível iniciar o Next.js:", error.message);
  process.exitCode = 1;
});

next.on("exit", (code, signal) => {
  process.exitCode = code ?? (signal ? 1 : 0);
});
