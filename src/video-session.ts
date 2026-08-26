import { mkdtempSync } from "node:fs";
import { readdir, rename, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { homedir } from "node:os";

/** Frame sizes for the three quality steps. */
const SIZES = {
  low: { width: 854, height: 480 },
  medium: { width: 1280, height: 720 },
  high: { width: 1920, height: 1080 },
} as const;

export type Quality = keyof typeof SIZES;

/** A recording in progress. */
interface Session {
  browser: { close(): Promise<void> };
  context: { close(): Promise<void> };
  page: unknown;
  /** Playwright writes the video here, under a name it chooses. */
  dir: string;
  outputPath: string;
}

let current: Session | null = null;

export function expandPath(p: string): string {
  return resolve(p.startsWith("~") ? join(homedir(), p.slice(1)) : p);
}

export function videoSize(quality: Quality) {
  return SIZES[quality];
}

export function isRecording(): boolean {
  return current !== null;
}

/**
 * Start a headless run that records video.
 *
 * `recordVideo` is a CONTEXT option — Playwright only accepts it when the
 * context is created, which is why this cannot be bolted onto an already-open
 * @playwright/mcp session and why the bag owns a separate browser here. The
 * file is not written until the context closes, so `stop` does the work.
 */
export async function startRecording(opts: {
  url: string;
  outputPath: string;
  quality: Quality;
}): Promise<{ outputPath: string }> {
  if (current) throw new Error("A recording is already in progress — stop it first.");

  const { chromium } = await import("playwright");
  const dir = mkdtempSync(join(tmpdir(), "barry-pw-video-"));
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    recordVideo: { dir, size: SIZES[opts.quality] },
  });
  const page = await context.newPage();
  await page.goto(opts.url, { waitUntil: "domcontentloaded" });

  current = { browser, context, page, dir, outputPath: expandPath(opts.outputPath) };
  return { outputPath: current.outputPath };
}

/** The page of the active recording, for navigate/wait steps. */
export function activePage(): any {
  if (!current) throw new Error("No recording in progress.");
  return current.page;
}

/**
 * Stop and move the file into place.
 *
 * Playwright names the video itself and only flushes it on context close, so
 * the temp dir is read AFTER closing rather than guessing the filename.
 */
export async function stopRecording(): Promise<{ outputPath: string }> {
  if (!current) throw new Error("No recording in progress.");
  const session = current;
  current = null;

  await session.context.close();
  await session.browser.close();

  const files = (await readdir(session.dir)).filter((f) => f.endsWith(".webm"));
  if (files.length === 0) {
    await rm(session.dir, { recursive: true, force: true });
    throw new Error("Playwright wrote no video file — the context may have closed before any frames were captured.");
  }
  await rename(join(session.dir, files[0]), session.outputPath);
  await rm(session.dir, { recursive: true, force: true });
  return { outputPath: session.outputPath };
}
