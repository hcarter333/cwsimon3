// @ts-check
const { test, expect } = require("@playwright/test");

// Your app uses UNIT_MS=150 by default.
const UNIT_MS = 150;

// Hold times tuned to generate exactly ONE element per press.
// (Long enough to classify dot/dash, short enough to avoid a second element.)
const DOT_HOLD_MS = UNIT_MS + 60;
const DASH_HOLD_MS = 3 * UNIT_MS + 60;

test.use({
  hasTouch: true,

  // These three give you “for free” artifacts when a test fails:
  trace: "retain-on-failure",
  screenshot: "only-on-failure",
  video: "on",
});

test("roundtrip: three turns", async ({ page }, testInfo) => {
  // Collect console output so we can attach it on failure.
  const consoleLines = [];
  page.on("console", (msg) => {
    consoleLines.push(`[${msg.type()}] ${msg.text()}`);
  });

  // Variables we’ll attach if something goes wrong.
  const turnNotes = [];
  let nextOverlayText = "";
  let currentSequence = [];

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
          `nextOverlayText: ${nextOverlayText}`,
          `currentSequence: ${currentSequence.join("")}`,
          "turnNotes:",
          ...turnNotes,
          `overlayTextNow: ${overlayTextNow?.trim?.() ?? overlayTextNow}`,
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

    const overlay = page.locator("#morseOverlay");
    const elements = page.locator("#elements");

    // Helper: dispatch touch events to #elements at the center of a target paddle
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

    async function readRoundSequence(turn) {
      const letters = [];

      for (let index = 0; index < turn; index += 1) {
        await waitForOverlayVisible();

        const letter = (await overlay.innerText()).trim();
        expect(letter).toMatch(/^[A-Z0-9]$/);
        letters.push(letter);
        turnNotes.push(`turn ${turn}: playback ${index + 1}/${turn} letter=${letter}`);

        await waitForOverlayFullyFaded();
      }

      return letters;
    }

    async function sendLetter(letter, turn, index, total) {
      const pattern = await page.evaluate((currentLetter) => {
        return window.SimonGame.encodeMorse(currentLetter);
      }, letter);

      expect(pattern).toMatch(/^[.\-]+$/);
      turnNotes.push(
        `turn ${turn}: input ${index + 1}/${total} letter=${letter} pattern=${pattern}`
      );

      for (const sym of pattern) {
        if (sym === ".") {
          await touchOnceOnPaddle("#\\31", DOT_HOLD_MS); // id="1" escaped
        } else {
          await touchOnceOnPaddle("#\\33", DASH_HOLD_MS); // id="3" escaped
        }
      }

      // Wait for the letter boundary timer to fire in the app before
      // sending the next character in the sequence.
      await page.waitForTimeout(3 * UNIT_MS + 250);
    }

    // Play three turns. Each round replays the full accumulated sequence,
    // so turn 2 requires two letters back and turn 3 requires three.
    for (let turn = 1; turn <= 3; turn += 1) {
      currentSequence = await readRoundSequence(turn);
      nextOverlayText = currentSequence[currentSequence.length - 1] || "";

      for (let index = 0; index < currentSequence.length; index += 1) {
        await sendLetter(currentSequence[index], turn, index, currentSequence.length);
      }
    }
  } catch (err) {
    await attachDebugArtifacts(err);
    throw err;
  }
});
