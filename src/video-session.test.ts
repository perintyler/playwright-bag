import { describe, expect, it } from "vitest";
import { expandPath, videoSize } from "./video-session.js";
import { homedir } from "node:os";

describe("video recording options", () => {
  // The three names map to real frame sizes; a typo here silently records at
  // the wrong resolution, which is invisible until someone opens the file.
  it("maps quality names to frame sizes", () => {
    expect(videoSize("low")).toEqual({ width: 854, height: 480 });
    expect(videoSize("medium")).toEqual({ width: 1280, height: 720 });
    expect(videoSize("high")).toEqual({ width: 1920, height: 1080 });
  });

  // Playwright writes to an absolute path; a literal "~" would create a
  // directory named "~" in the cwd rather than landing in the home dir.
  it("expands ~ to an absolute home path", () => {
    expect(expandPath("~/Desktop/run.webm")).toBe(`${homedir()}/Desktop/run.webm`);
    expect(expandPath("/tmp/run.webm")).toBe("/tmp/run.webm");
  });
});
