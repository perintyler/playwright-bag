import { defineTool } from "@barry-rocks/tools";
import { z } from "zod";
import { activePage, isRecording, startRecording, stopRecording, type Quality } from "./video-session.js";

const NS = "playwright";

/**
 * Video recording for headless runs.
 *
 * @playwright/mcp (which serves this bag's browser_* tools) has no video flag
 * — only --output-dir — so headless runs could not be recorded at all. The
 * headed `chrome` bag does not need this: it drives the real visible browser,
 * which the `screen-recorder` bag captures off the display.
 *
 * These own their own browser because `recordVideo` is a CONTEXT option:
 * Playwright accepts it only at context creation, so it cannot be attached to
 * an @playwright/mcp session that is already open.
 */
export const startVideoRecording = defineTool({
  namespace: NS,
  access: "write",
  name: "start_video_recording",
  description:
    "Start a headless browser run that records video to a file. Navigation during the recording uses record_navigate; call stop_video_recording to write the file. For the user's real visible Chrome, use the screen-recorder bag instead.",
  schema: {
    url: z.string().url().describe("URL to open when the recording starts"),
    output_path: z.string().describe("Where to write the .webm (e.g. ~/Desktop/run.webm)"),
    quality: z
      .enum(["low", "medium", "high"])
      .optional()
      .describe("480p / 720p / 1080p — defaults to medium"),
  },
  handler: async ({ url, output_path, quality }) => {
    const { outputPath } = await startRecording({
      url,
      outputPath: output_path,
      quality: (quality ?? "medium") as Quality,
    });
    return { status: "recording", output_path: outputPath };
  },
});

export const recordNavigate = defineTool({
  namespace: NS,
  access: "write",
  name: "record_navigate",
  description: "Navigate the recording browser to a URL. Only valid while a video recording is in progress.",
  schema: { url: z.string().url().describe("URL to navigate to") },
  handler: async ({ url }) => {
    await activePage().goto(url, { waitUntil: "domcontentloaded" });
    return { status: "navigated", url };
  },
});

export const recordWait = defineTool({
  namespace: NS,
  access: "write",
  name: "record_wait",
  description: "Hold the recording on the current page, so the video captures it for a set time.",
  schema: { seconds: z.number().min(0).max(120).describe("How long to wait, in seconds") },
  handler: async ({ seconds }) => {
    await activePage().waitForTimeout(seconds * 1000);
    return { status: "waited", seconds };
  },
});

export const stopVideoRecording = defineTool({
  namespace: NS,
  access: "write",
  name: "stop_video_recording",
  description:
    "Stop the recording and write the video file. Playwright only flushes the video when the browser context closes, so the file does not exist until this runs.",
  schema: {},
  handler: async () => {
    const { outputPath } = await stopRecording();
    return { status: "stopped", output_path: outputPath };
  },
});

export const videoRecordingStatus = defineTool({
  namespace: NS,
  access: "read",
  name: "video_recording_status",
  description: "Whether a headless video recording is currently in progress.",
  schema: {},
  handler: async () => ({ recording: isRecording() }),
});
