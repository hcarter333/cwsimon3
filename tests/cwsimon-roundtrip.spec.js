// @ts-check
const { test, expect } = require("@playwright/test");

// Hold times tuned to generate exactly ONE element per press.
// (Long enough to classify dot/dash, short enough to avoid a second element.)
const UNIT_MS = 150;
const DOT_HOLD_MS = UNIT_MS + 60;
const DASH_HOLD_MS = 3 * UNIT_MS + 60;

test.use({
  hasTouch: true,

  // These three give you “for free” artifacts when a test fails:
  trace: "retain-on-failure",
  screenshot: "only-on-failure",
  video: "on",
});

test("roundtrip: mute->start->read overlay->send same letter->expect next overlay", async ({ page }, testInfo) => {
  // Collect console output so we can attach it on failure.
  const consoleLines = [];
  page.on("console", (msg) => {
    consoleLines.push(`[${msg.type()}] ${msg.text()}`);
  });

  // Variables we’ll attach if something goes wrong.
  let firstLetter = "";
  let pattern = "";
  let nextOverlayText = "";

  // Helper: attach debug artifacts (called in catch).
  async function attachDebugArtifacts(error) {
    try {
      const overlayTextNow = await page.locator("#morseOverlay").innerText().catch(() => "");
      const url = page.url();
      const html = await page.content().catch(() => "");

      await testInfo.attach("error.txt", {
        body: String(error?.stack || error),
        contentType: "text/plain",
      });

      await testInfo.attach("state.txt", {
        body: [
          `url: ${url}`,
          `firstLetter: ${firstLetter}`,
          `pattern: ${pattern}`,
          `overlayTextNow: ${overlayTextNow?.trim?.() ?? overlayTextNow}`,
          `nextOverlayText: ${nextOverlayText}`,
        ].join("\n"),
        contentType: "text/plain",
      });

      await testInfo.attach("console.log", {
        body: consoleLines.join("\n"),
        contentType: "text/plain",
      });

      // DOM snapshot (helpful if selectors changed or overlay never appears)
      await testInfo.attach("dom.html", {
        body: html,
        contentType: "text/html",
      });

      // Extra screenshot beyond “only-on-failure” (nice to have at the moment we catch)
      await page.screenshot({ path: testInfo.outputPath("caught-failure.png"), fullPage: true });
      await testInfo.attach("caught-failure.png", {
        path: testInfo.outputPath("caught-failure.png"),
        contentType: "image/png",
      });
    } catch {
      // Don’t let attachment failures hide the original test failure.
    }
  }

  try {
    // 1) Open the app page (playwright.config.js baseURL should serve repo root)
    await page.goto("/pt-cwsimon.html");

    // 1) clicks the mute button with the speaker (practiceModeButton toggles 🔇/🔊)
    const practiceBtn = page.locator("#practiceModeButton");
    await expect(practiceBtn).toBeVisible();
    await practiceBtn.click();

    // 2) clicks start game
    await page.locator("#startGameButton").click();

    // 2) waits for the first letter to appear and then fade on the overlay panel
    const overlay = page.locator("#morseOverlay");

    async function waitForOverlayVisible() {
      await page.waitForFunction(
        () => {
          const el = document.getElementById("morseOverlay");
          if (!el) return false;

          const text = el.innerText.trim();
          const opacity = Number(window.getComputedStyle(el).opacity);
          return el.classList.contains("visible") && opacity >= 0.99 && /^[A-Z0-9]$/.test(text);
        },
        { timeout: 6000 }
      );
    }

    async function waitForOverlayFullyFaded() {
      await page.waitForFunction(
        () => {
          const el = document.getElementById("morseOverlay");
          if (!el) return false;

          const opacity = Number(window.getComputedStyle(el).opacity);
          return !el.classList.contains("visible") && opacity <= 0.01;
        },
        { timeout: 6000 }
      );
    }

    await waitForOverlayVisible();

    firstLetter = (await overlay.innerText()).trim();
    expect(firstLetter).toMatch(/^[A-Z0-9]$/);

    await waitForOverlayFullyFaded();

    // Compute the Morse pattern in-page using your SimonGame module
    pattern = await page.evaluate((letter) => {
      // SimonGame is expected to be a global from simon-game-logic.js
      return window.SimonGame.encodeMorse(letter);
    }, firstLetter);

    expect(pattern).toMatch(/^[.\-]+$/);

    // Helper: dispatch touch events to #elements at the center of a target paddle
    const elements = page.locator("#elements");

    async function touchOnceOnPaddle(paddleSelector, holdMs) {
      const paddle = page.locator(paddleSelector);
      await expect(paddle).toBeVisible();

      const box = await paddle.boundingBox();
      if (!box) throw new Error(`No bounding box for ${paddleSelector}`);

      const x = box.x + box.width / 2;
      const y = box.y + box.height / 2;

      await elements.dispatchEvent("touchstart", {
        touches: [{ identifier: 1, clientX: x, clientY: y }],
        changedTouches: [{ identifier: 1, clientX: x, clientY: y }],
      });

      await page.waitForTimeout(holdMs);

      await elements.dispatchEvent("touchend", {
        touches: [],
        changedTouches: [{ identifier: 1, clientX: x, clientY: y }],
      });

      // small settle time between elements
      await page.waitForTimeout(40);
    }

    // 3) Use panel 3 for dah, panel 1 for dit
    for (const sym of pattern) {
      if (sym === ".") {
        await touchOnceOnPaddle("#\\31", DOT_HOLD_MS); // id="1" escaped
      } else {
        await touchOnceOnPaddle("#\\33", DASH_HOLD_MS); // id="3" escaped
      }
    }

    // Brief settle: element-counting fires the letter boundary
    // synchronously on the last element, so no timer wait needed.
    await page.waitForTimeout(10);

    // 4) Fail if a new letter overlay doesn't appear
    await waitForOverlayVisible();
    nextOverlayText = (await overlay.innerText()).trim();
    expect(nextOverlayText).toMatch(/^[A-Z0-9]$/);

  } catch (err) {
    await attachDebugArtifacts(err);
    throw err;
  }
});
