// @ts-check
const { test, expect } = require("@playwright/test");

const PAGE = "/pt-cwsimon.html";

// ---------------------------------------------------------------------------
// 1. Page loads without JS errors
// ---------------------------------------------------------------------------
test("page loads without JS errors", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (err) => errors.push(err.message));

  await page.goto(PAGE);
  await page.waitForLoadState("domcontentloaded");

  expect(errors).toEqual([]);
});

// ---------------------------------------------------------------------------
// 2. Start Game button begins a round (sequence plays)
// ---------------------------------------------------------------------------
test("Start Game button begins a round", async ({ page }) => {
  await page.goto(PAGE);

  const startBtn = page.locator("#startGameButton");
  await expect(startBtn).toBeVisible();

  // Click Start Game — the game should begin playback (morsePlaybackActive becomes true).
  // We verify by checking that the game state was created via page.evaluate.
  await startBtn.click();

  // Allow a tick for async startGame() to initialise state
  const hasState = await page.evaluate(() => {
    return typeof _simonState === "object" && _simonState !== null;
  });
  expect(hasState).toBe(true);
});

// ---------------------------------------------------------------------------
// 3. Letter overlay appears during playback
// ---------------------------------------------------------------------------
test("letter overlay appears during playback", async ({ page }) => {
  await page.goto(PAGE);

  // Speed up playback so we don't wait forever: set UNIT_MS very small
  await page.evaluate(() => {
    window.UNIT_MS = 5;
    window.WORD_GAP_MS = 10;
  });

  await page.locator("#startGameButton").click();

  // The overlay should gain the "visible" class while a letter is being played
  const overlay = page.locator("#morseOverlay");
  await expect(overlay).toHaveClass(/visible/, { timeout: 5000 });
});

// ---------------------------------------------------------------------------
// 4. Lose flow shows modal with rounds count and OK button
// ---------------------------------------------------------------------------
test("lose flow shows modal with rounds count and restart button", async ({
  page,
}) => {
  await page.goto(PAGE);

  // Trigger lose flow directly via page.evaluate to avoid timing complexities
  await page.evaluate(() => {
    // Create a minimal game state that looks like round 3 failed
    window._simonState = {
      sequence: ["E", "T", "A"],
      round: 3,
      inputBuffer: [],
      inputIndex: 0,
      finished: true,
      randomFn: Math.random,
    };
    // Call the lose display function
    window.showLoseModal(2); // 2 rounds completed
  });

  const modal = page.locator("#loseModal");
  await expect(modal).toHaveClass(/visible/);

  const roundsCount = page.locator("#loseRoundsCount");
  await expect(roundsCount).toHaveText("2");

  const restartBtn = page.locator("#loseRestartBtn");
  await expect(restartBtn).toBeVisible();
  await expect(restartBtn).toHaveText(/Play Again/i);
});

// ---------------------------------------------------------------------------
// 5. OK (Play Again) button restarts game
// ---------------------------------------------------------------------------
test("Play Again button restarts game", async ({ page }) => {
  await page.goto(PAGE);

  // Show lose modal
  await page.evaluate(() => {
    window._simonState = {
      sequence: ["E"],
      round: 1,
      inputBuffer: [],
      inputIndex: 0,
      finished: true,
      randomFn: Math.random,
    };
    window.showLoseModal(0);
  });

  const modal = page.locator("#loseModal");
  await expect(modal).toHaveClass(/visible/);

  // Speed up so the restart doesn't block on long playback
  await page.evaluate(() => {
    window.UNIT_MS = 5;
    window.WORD_GAP_MS = 10;
  });

  // Click Play Again — modal should hide and a new game state should be created
  await page.locator("#loseRestartBtn").click();

  // Modal should be hidden (visible class removed)
  await expect(modal).not.toHaveClass(/visible/, { timeout: 3000 });

  // New game state should exist and not be finished
  const gameActive = await page.evaluate(() => {
    return (
      typeof _simonState === "object" &&
      _simonState !== null &&
      !_simonState.finished
    );
  });
  expect(gameActive).toBe(true);
});

// ---------------------------------------------------------------------------
// 6. Settings gear opens panel, X closes it
// ---------------------------------------------------------------------------
test("settings gear opens panel and X closes it", async ({ page }) => {
  await page.goto(PAGE);

  const panel = page.locator("#settingsPanel");
  const gearBtn = page.locator("#settingsGearBtn");
  const closeBtn = page.locator("#settingsCloseBtn");

  // Panel should be hidden initially (no "open" class)
  await expect(panel).not.toHaveClass(/open/);

  // Open settings
  await gearBtn.click();
  await expect(panel).toHaveClass(/open/);

  // Close settings
  await closeBtn.click();
  await expect(panel).not.toHaveClass(/open/);
});

// ---------------------------------------------------------------------------
// 7. Speed controls present in settings panel
// ---------------------------------------------------------------------------
test("speed controls present in settings panel", async ({ page }) => {
  await page.goto(PAGE);

  // Open settings first
  await page.locator("#settingsGearBtn").click();
  await expect(page.locator("#settingsPanel")).toHaveClass(/open/);

  // WPM controls
  await expect(page.locator("#wpmMinus")).toBeVisible();
  await expect(page.locator("#wpmPlus")).toBeVisible();
  await expect(page.locator("#wpmValue")).toBeVisible();

  // Word gap controls
  await expect(page.locator("#wordGapMinus")).toBeVisible();
  await expect(page.locator("#wordGapPlus")).toBeVisible();
  await expect(page.locator("#wordGapValue")).toBeVisible();

  // Verify WPM + click increments the displayed number by 1
  const initialWpm = await page.locator("#wpmValue").textContent();
  await page.locator("#wpmPlus").click();
  const increasedWpm = await page.locator("#wpmValue").textContent();
  expect(Number(increasedWpm)).toBe(Number(initialWpm) + 1);

  // Verify WPM - click decrements the displayed number by 1
  await page.locator("#wpmMinus").click();
  const restoredWpm = await page.locator("#wpmValue").textContent();
  expect(Number(restoredWpm)).toBe(Number(initialWpm));

  // Verify word gap +/- changes displayed value
  const initialGap = await page.locator("#wordGapValue").textContent();
  await page.locator("#wordGapPlus").click();
  const increasedGap = await page.locator("#wordGapValue").textContent();
  expect(Number(increasedGap)).toBeGreaterThan(Number(initialGap));
});
