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
// 5b. Cancel button dismisses lose modal and returns to welcome screen
// ---------------------------------------------------------------------------
test("Cancel button dismisses lose modal and returns to welcome screen", async ({
  page,
}) => {
  await page.goto(PAGE);

  // Show lose modal
  await page.evaluate(() => {
    window._simonState = {
      sequence: ["E", "T"],
      round: 2,
      inputBuffer: [],
      inputIndex: 1,
      finished: true,
      randomFn: Math.random,
    };
    window.showLoseModal(1);
  });

  const modal = page.locator("#loseModal");
  await expect(modal).toHaveClass(/visible/);

  const cancelBtn = page.locator("#loseCancelBtn");
  await expect(cancelBtn).toBeVisible();
  await expect(cancelBtn).toHaveText(/Back to Menu/i);

  // Click Cancel — modal should hide and game state should be cleared
  await cancelBtn.click();

  // Modal should be hidden
  await expect(modal).not.toHaveClass(/visible/, { timeout: 3000 });

  // Start Game button should still be available (user is back at welcome screen)
  const startBtn = page.locator("#startGameButton");
  await expect(startBtn).toBeVisible();
});

// ---------------------------------------------------------------------------
// 5c. Welcome screen cosmetic layout (GH #my-gpag)
//     Cosmetic test — expected to change as the UI evolves.
//     Not a stable contract; update freely when the welcome screen changes.
// ---------------------------------------------------------------------------
test("welcome screen shows correct heading, subtitle, and hidden Hk button", async ({
  page,
}) => {
  await page.goto(PAGE);
  await page.waitForLoadState("domcontentloaded");

  // Heading should be an h2 with the updated text
  const heading = page.locator("#app h2");
  await expect(heading).toHaveText("Project TouCans CWSimon");

  // Subtitle paragraph
  const subtitle = page.locator("#app p");
  await expect(subtitle).toHaveText(
    "Use the virtual paddle (1/3) as an iambic keyer (dit/dah.)"
  );

  // Start Hk button should exist but not be visible
  const hkButton = page.locator("#startHalikey");
  await expect(hkButton).toBeHidden();

  // Start Game button should still be accessible
  const startBtn = page.locator("#startGameButton");
  await expect(startBtn).toBeVisible();
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

// ---------------------------------------------------------------------------
// 8. tx haptics toggle exists and defaults to Off
// ---------------------------------------------------------------------------
test("tx haptics toggle exists in settings and defaults to Off", async ({
  page,
}) => {
  await page.goto(PAGE);

  await page.locator("#settingsGearBtn").click();
  await expect(page.locator("#settingsPanel")).toHaveClass(/open/);

  const toggle = page.locator("#txHapticsToggle");
  await expect(toggle).toBeVisible();
  await expect(toggle).toHaveText("Off");
});

// ---------------------------------------------------------------------------
// 9. tx haptics toggle persists after settings close/reopen
// ---------------------------------------------------------------------------
test("tx haptics toggle state persists after settings close/reopen", async ({
  page,
}) => {
  await page.goto(PAGE);

  // Open settings and toggle on
  await page.locator("#settingsGearBtn").click();
  await expect(page.locator("#settingsPanel")).toHaveClass(/open/);

  const toggle = page.locator("#txHapticsToggle");
  await toggle.click();
  await expect(toggle).toHaveText("On");

  // Close and reopen settings
  await page.locator("#settingsCloseBtn").click();
  await expect(page.locator("#settingsPanel")).not.toHaveClass(/open/);
  await page.locator("#settingsGearBtn").click();
  await expect(page.locator("#settingsPanel")).toHaveClass(/open/);

  // Toggle should still show On
  await expect(toggle).toHaveText("On");
});

// ---------------------------------------------------------------------------
// 10. tx haptics on triggers navigator.vibrate during morse playback
// ---------------------------------------------------------------------------
test("tx haptics on triggers navigator.vibrate during playback", async ({
  page,
}) => {
  await page.goto(PAGE);

  // Enable tx haptics via the toggle button
  await page.locator("#settingsGearBtn").click();
  await expect(page.locator("#settingsPanel")).toHaveClass(/open/);
  await page.locator("#txHapticsToggle").click();
  await expect(page.locator("#txHapticsToggle")).toHaveText("On");
  await page.locator("#settingsCloseBtn").click();

  // Stub navigator.vibrate and speed up playback
  await page.evaluate(() => {
    window._vibrateLog = [];
    navigator.vibrate = (duration) => {
      window._vibrateLog.push(duration);
      return true;
    };
    window.UNIT_MS = 5;
    window.WORD_GAP_MS = 10;
  });

  // Start game and wait for playback to complete
  await page.locator("#startGameButton").click();

  // Wait for at least one vibrate call
  await page.waitForFunction(() => window._vibrateLog.length > 0, null, {
    timeout: 5000,
  });

  const vibrateCount = await page.evaluate(() => window._vibrateLog.length);
  expect(vibrateCount).toBeGreaterThan(0);
});

// ---------------------------------------------------------------------------
// 11. tx haptics off (default) does not trigger navigator.vibrate
// ---------------------------------------------------------------------------
test("tx haptics off does not trigger navigator.vibrate during playback", async ({
  page,
}) => {
  await page.goto(PAGE);

  // Stub navigator.vibrate and speed up playback (haptics off by default)
  await page.evaluate(() => {
    window._vibrateLog = [];
    navigator.vibrate = (duration) => {
      window._vibrateLog.push(duration);
      return true;
    };
    window.UNIT_MS = 5;
    window.WORD_GAP_MS = 10;
  });

  // Start game
  await page.locator("#startGameButton").click();

  // Wait for playback to finish (overlay should appear and disappear)
  const overlay = page.locator("#morseOverlay");
  await expect(overlay).toHaveClass(/visible/, { timeout: 5000 });
  await expect(overlay).not.toHaveClass(/visible/, { timeout: 5000 });

  const vibrateCount = await page.evaluate(() => window._vibrateLog.length);
  expect(vibrateCount).toBe(0);
});

// ---------------------------------------------------------------------------
// 12a. tx haptics on triggers navigator.vibrate on paddle keyPress
// ---------------------------------------------------------------------------
test("tx haptics on triggers navigator.vibrate on paddle keyPress", async ({
  page,
}) => {
  await page.goto(PAGE);

  // Enable tx haptics and practiceMode, stub navigator.vibrate
  await page.locator("#settingsGearBtn").click();
  await expect(page.locator("#settingsPanel")).toHaveClass(/open/);
  await page.locator("#txHapticsToggle").click();
  await expect(page.locator("#txHapticsToggle")).toHaveText("On");
  await page.locator("#settingsCloseBtn").click();

  await page.evaluate(() => {
    practiceMode = true;
    window._vibrateLog = [];
    navigator.vibrate = (duration) => {
      window._vibrateLog.push(duration);
      return true;
    };
  });

  // Simulate paddle press via keyPress
  await page.evaluate(() => {
    keyPress();
  });

  const log = await page.evaluate(() => window._vibrateLog);
  expect(log.length).toBeGreaterThan(0);
  expect(log[0]).toBe(99999);
});

// ---------------------------------------------------------------------------
// 12b. tx haptics on cancels navigator.vibrate on paddle keyRelease
// ---------------------------------------------------------------------------
test("tx haptics on cancels navigator.vibrate on paddle keyRelease", async ({
  page,
}) => {
  await page.goto(PAGE);

  // Enable tx haptics and practiceMode, stub navigator.vibrate
  await page.locator("#settingsGearBtn").click();
  await expect(page.locator("#settingsPanel")).toHaveClass(/open/);
  await page.locator("#txHapticsToggle").click();
  await expect(page.locator("#txHapticsToggle")).toHaveText("On");
  await page.locator("#settingsCloseBtn").click();

  await page.evaluate(() => {
    practiceMode = true;
    window._vibrateLog = [];
    navigator.vibrate = (duration) => {
      window._vibrateLog.push(duration);
      return true;
    };
  });

  // Simulate paddle press then release
  await page.evaluate(() => {
    keyPress();
    keyRelease();
  });

  const log = await page.evaluate(() => window._vibrateLog);
  // Should have vibrate(99999) from press, then vibrate(0) from release
  expect(log).toContain(99999);
  expect(log).toContain(0);
});

// ---------------------------------------------------------------------------
// 12c. tx haptics off does not trigger navigator.vibrate on paddle press/release
// ---------------------------------------------------------------------------
test("tx haptics off does not trigger navigator.vibrate on paddle press/release", async ({
  page,
}) => {
  await page.goto(PAGE);

  // haptics off by default, enable practiceMode, stub navigator.vibrate
  await page.evaluate(() => {
    practiceMode = true;
    window._vibrateLog = [];
    navigator.vibrate = (duration) => {
      window._vibrateLog.push(duration);
      return true;
    };
  });

  // Simulate paddle press and release
  await page.evaluate(() => {
    keyPress();
    keyRelease();
  });

  const vibrateCount = await page.evaluate(() => window._vibrateLog.length);
  expect(vibrateCount).toBe(0);
});

// ---------------------------------------------------------------------------
// 12. Letter Overlay toggle exists and defaults to On
// ---------------------------------------------------------------------------
test("Letter Overlay toggle exists in settings and defaults to On", async ({
  page,
}) => {
  await page.goto(PAGE);

  await page.locator("#settingsGearBtn").click();
  await expect(page.locator("#settingsPanel")).toHaveClass(/open/);

  const toggle = page.locator("#letterOverlayToggle");
  await expect(toggle).toBeVisible();
  await expect(toggle).toHaveText("On");
});

// ---------------------------------------------------------------------------
// 13. Letter Overlay off suppresses overlay during playback
// ---------------------------------------------------------------------------
test("Letter Overlay off suppresses overlay during playback", async ({
  page,
}) => {
  await page.goto(PAGE);

  // Turn off Letter Overlay
  await page.locator("#settingsGearBtn").click();
  await expect(page.locator("#settingsPanel")).toHaveClass(/open/);
  const toggle = page.locator("#letterOverlayToggle");
  await toggle.click();
  await expect(toggle).toHaveText("Off");
  await page.locator("#settingsCloseBtn").click();

  // Speed up playback and install a spy to track if overlay was ever shown
  await page.evaluate(() => {
    window.UNIT_MS = 5;
    window.WORD_GAP_MS = 10;
    window._overlayWasVisible = false;
    var overlay = document.getElementById("morseOverlay");
    new MutationObserver(function () {
      if (overlay.classList.contains("visible")) {
        window._overlayWasVisible = true;
      }
    }).observe(overlay, { attributes: true, attributeFilter: ["class"] });
  });

  // Start game — round 1 plays one letter.
  // With UNIT_MS=5, playback takes ~500ms (sleep) + ~40ms (one letter) = ~540ms.
  await page.locator("#startGameButton").click();

  // Wait well past the playback time to ensure it has completed
  await page.waitForTimeout(2000);

  // The overlay should never have gained the visible class
  const wasVisible = await page.evaluate(() => window._overlayWasVisible);
  expect(wasVisible).toBe(false);
});

// ---------------------------------------------------------------------------
// 14. Letter Overlay on (default) shows overlay during playback
// ---------------------------------------------------------------------------
test("Letter Overlay on shows overlay during playback", async ({ page }) => {
  await page.goto(PAGE);

  // Install spy before speeding up playback
  await page.evaluate(() => {
    window.UNIT_MS = 5;
    window.WORD_GAP_MS = 10;
    window._overlayWasVisible = false;
    var overlay = document.getElementById("morseOverlay");
    new MutationObserver(function () {
      if (overlay.classList.contains("visible")) {
        window._overlayWasVisible = true;
      }
    }).observe(overlay, { attributes: true, attributeFilter: ["class"] });
  });

  // Start game with default settings (overlay on)
  await page.locator("#startGameButton").click();

  // Wait for playback to complete
  await page.waitForTimeout(2000);

  // The overlay should have been shown at least once
  const wasVisible = await page.evaluate(() => window._overlayWasVisible);
  expect(wasVisible).toBe(true);
});

// ---------------------------------------------------------------------------
// 15. Letter Overlay toggle state persists after settings close/reopen
// ---------------------------------------------------------------------------
test("Letter Overlay toggle state persists after settings close/reopen", async ({
  page,
}) => {
  await page.goto(PAGE);

  // Open settings and toggle off
  await page.locator("#settingsGearBtn").click();
  await expect(page.locator("#settingsPanel")).toHaveClass(/open/);

  const toggle = page.locator("#letterOverlayToggle");
  await toggle.click();
  await expect(toggle).toHaveText("Off");

  // Close and reopen settings
  await page.locator("#settingsCloseBtn").click();
  await expect(page.locator("#settingsPanel")).not.toHaveClass(/open/);
  await page.locator("#settingsGearBtn").click();
  await expect(page.locator("#settingsPanel")).toHaveClass(/open/);

  // Toggle should still show Off
  await expect(toggle).toHaveText("Off");
});
