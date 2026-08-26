# playwright

Headless browsing on a clean, isolated profile — no cookies, no logins.

Wraps [`@playwright/mcp`](https://github.com/microsoft/playwright-mcp) for the
`browser_*` tools (navigate, click, snapshot, …), and adds video recording,
which upstream does not provide.

## Video recording

`@playwright/mcp` exposes no video flag — only `--output-dir` — verified
against 0.0.79, the latest. So these tools own a separate browser: Playwright
accepts `recordVideo` ONLY as a context option at creation time, which cannot
be attached to an MCP session that is already open.

    start_video_recording   url, output_path, quality (low/medium/high)
    record_navigate         drive the recording browser
    record_wait             hold on a page so the video captures it
    stop_video_recording    closes the context and writes the file
    video_recording_status

The file does not exist until `stop_video_recording` runs — Playwright flushes
video on context close.

**Setup:** needs Playwright's own chromium build, separate from what
`@playwright/mcp` downloads:

    npx playwright install chromium

## Recording the user's real browser instead

This bag is headless, so there is nothing on screen to capture. For the real
visible Chrome, use the `chrome` bag to drive it and the `screen-recorder` bag
to capture the display.
