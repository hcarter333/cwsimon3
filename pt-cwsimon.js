
let cwmsg = "";

const dtimeHistogramBins = new Array(50).fill(0);
const utimeHistogramBins = new Array(50).fill(0);
let dtimeCanvas;
let dtimeCtx;
let utimeCanvas;
let utimeCtx;
let lastDtimeUpdated = -1;

let practiceMode = false;
let note_context = null;
let note_node = null;
let gain_node = null;
let audioResume = false;

const FREQUENCY = 440;
let keydown = 0;
let dtime = 0;
let utime = 0;
const IDLE_RESET_MS = 640;

let serialPort = null;
let prevCTS = null;
let lastElementTouched = null;
let morsePlaybackActive = false;
let currentWpm = 8;
let _simonState = null;
const LOSE_SOUND_FREQ = 300;
let loseSoundMuted = false;
let _txHapticsEnabled = localStorage.getItem("txHaptics") === "true";
let _letterOverlayEnabled = localStorage.getItem("letterOverlay") !== "false";

async function ensureAudioReady() {
  if (!note_context) {
    note_context = new (window.AudioContext || window.webkitAudioContext)();
    note_node = note_context.createOscillator();
    gain_node = note_context.createGain();
    note_node.frequency.value = FREQUENCY;
    gain_node.gain.value = 0;
    note_node.connect(gain_node);
    gain_node.connect(note_context.destination);
    note_node.start();
  }

  if (note_context.state === "suspended") {
    try {
      await note_context.resume();
      audioResume = true;
    } catch (error) {
      console.warn("Unable to resume audio context", error);
    }
  }
}

async function togglePracticeMode() {
  await ensureAudioReady();
  practiceMode = !practiceMode;
  updatePracticeButtonText();
}

function updatePracticeButtonText() {
  const button = document.getElementById("practiceModeButton");
  if (button) {
    button.innerText = practiceMode ? "🔊" : "🔇";
  }
}

async function connectToSerialPort() {
  try {
    serialPort = await navigator.serial.requestPort();
    await serialPort.open({ baudRate: 9600 });
    const signals = await serialPort.getSignals();
    prevCTS = signals.clearToSend;
    listenToSerialPort();
  } catch (error) {
    serialPort = null;
    console.warn("Serial port failed", error);
  }
}

async function listenToSerialPort() {
  if (!serialPort) return;

  while (serialPort.readable) {
    const signals = await serialPort.getSignals();
    const currentCTS = signals.clearToSend;
    if (currentCTS !== prevCTS) {
      if (currentCTS) {
        keyPress();
      } else {
        keyRelease();
      }
      prevCTS = currentCTS;
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

async function toggleHalikey() {
  if (!("serial" in navigator)) {
    alert("Web Serial API is not supported in this browser.");
    return;
  }
  await ensureAudioReady();
  await connectToSerialPort();
}

function playSidetone() {
  if (gain_node) {
    gain_node.gain.setTargetAtTime(0.1, 0, 0.001);
  }
}

function stopSidetone() {
  if (gain_node) {
    gain_node.gain.setTargetAtTime(0, 0, 0.001);
  }
}

async function playMorseK() {
  if (morsePlaybackActive) return;
  morsePlaybackActive = true;
  try {
    await ensureAudioReady();
    const unit = UNIT_MS;
    const pattern = [3, 1, 3]; // K = dash dot dash
    for (let i = 0; i < pattern.length; i++) {
      playSidetone();
      await new Promise((resolve) => setTimeout(resolve, pattern[i] * unit));
      stopSidetone();
      if (i < pattern.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, unit));
      }
    }
  } finally {
    stopSidetone();
    morsePlaybackActive = false;
  }
}

function gapAdjust(delta) {
  UNIT_MS = Math.max(10, UNIT_MS + delta);
  refreshSpeedDisplay();
}

function adjustWpm(direction) {
  if (direction > 0) {
    UNIT_MS = Math.max(10, UNIT_MS - 5);
    currentWpm += 1;
  } else {
    UNIT_MS = UNIT_MS + 5;
    currentWpm -= 1;
  }
  refreshSpeedDisplay();
}

function adjustWordGap(delta) {
  WORD_GAP_MS = Math.max(0, WORD_GAP_MS + delta);
  refreshSpeedDisplay();
}

function refreshSpeedDisplay() {
  var wpmEl = document.getElementById("wpmValue");
  var gapEl = document.getElementById("wordGapValue");
  if (wpmEl) wpmEl.textContent = currentWpm;
  if (gapEl) gapEl.textContent = WORD_GAP_MS;
}

function drawDtimeHistogram() {
  if (!dtimeCtx || !dtimeCanvas) return;
  dtimeCtx.clearRect(0, 0, dtimeCanvas.width, dtimeCanvas.height);
  const barWidth = dtimeCanvas.width / dtimeHistogramBins.length;
  const maxCount = Math.max(...dtimeHistogramBins);
  dtimeHistogramBins.forEach((count, index) => {
    const barHeight = maxCount > 0 ? (count / maxCount) * dtimeCanvas.height : 0;
    dtimeCtx.fillStyle = index === lastDtimeUpdated ? "yellow" : "blue";
    dtimeCtx.fillRect(index * barWidth, dtimeCanvas.height - barHeight, barWidth, barHeight);
  });
  dtimeCtx.strokeStyle = "black";
  dtimeCtx.beginPath();
  dtimeCtx.moveTo(0, dtimeCanvas.height);
  dtimeCtx.lineTo(dtimeCanvas.width, dtimeCanvas.height);
  dtimeCtx.lineTo(dtimeCanvas.width, 0);
  dtimeCtx.stroke();
  dtimeCtx.fillStyle = "black";
  dtimeCtx.font = "12px sans-serif";
  for (let i = 0; i <= dtimeHistogramBins.length; i += 8) {
    const xPosition = i * barWidth;
    dtimeCtx.fillText(i * 8, xPosition, dtimeCanvas.height - 5);
  }
}

function drawUtimeHistogram() {
  if (!utimeCtx || !utimeCanvas) return;
  utimeCtx.clearRect(0, 0, utimeCanvas.width, utimeCanvas.height);
  const barWidth = utimeCanvas.width / utimeHistogramBins.length;
  const maxCount = Math.max(...utimeHistogramBins);
  utimeHistogramBins.forEach((count, index) => {
    const barHeight = maxCount > 0 ? (count / maxCount) * utimeCanvas.height : 0;
    utimeCtx.fillStyle = "green";
    utimeCtx.fillRect(index * barWidth, utimeCanvas.height - barHeight, barWidth, barHeight);
  });
  utimeCtx.strokeStyle = "black";
  utimeCtx.beginPath();
  utimeCtx.moveTo(0, utimeCanvas.height);
  utimeCtx.lineTo(utimeCanvas.width, utimeCanvas.height);
  utimeCtx.lineTo(utimeCanvas.width, 0);
  utimeCtx.stroke();
  utimeCtx.fillStyle = "black";
  utimeCtx.font = "12px sans-serif";
  for (let i = 0; i <= utimeHistogramBins.length; i += 8) {
    const xPosition = i * barWidth;
    utimeCtx.fillText(i * 8, xPosition, utimeCanvas.height - 5);
  }
}

function updateDtimeHistogram(dtimeValue) {
  if (dtimeValue >= 0 && dtimeValue <= 400) {
    const binIndex = Math.min(Math.floor(dtimeValue / 8), dtimeHistogramBins.length - 1);
    dtimeHistogramBins[binIndex]++;
    lastDtimeUpdated = binIndex;
    drawDtimeHistogram();
  }
}

function updateUtimeHistogram(utimeValue) {
  if (utimeValue >= 0 && utimeValue <= 400) {
    const binIndex = Math.min(Math.floor(utimeValue / 8), utimeHistogramBins.length - 1);
    utimeHistogramBins[binIndex]++;
    drawUtimeHistogram();
  }
}

function clampCanvasSize(canvas, width) {
  if (!canvas) return;
  const clampedWidth = Math.max(200, width || 400);
  canvas.width = clampedWidth;
  canvas.height = (clampedWidth * 8) / 9;
}

function adduiEls(divStr, type = "generic") {
  const appDiv = document.getElementById(divStr);
  if (!appDiv) return;

  const buttonDiv = document.createElement("div");
  buttonDiv.id = "buttonDiv";
  buttonDiv.style.display = "flex";
  buttonDiv.style.flexDirection = "row";
  buttonDiv.style.alignItems = "center";
  buttonDiv.style.flexWrap = "wrap";
  buttonDiv.style.justifyContent = "center";
  buttonDiv.style.whiteSpace = "nowrap";
  buttonDiv.style.height = "auto";
  appDiv.appendChild(buttonDiv);

  const practiceButton = document.createElement("button");
  practiceButton.id = "practiceModeButton";
  practiceButton.innerText = practiceMode ? "🔊" : "🔇";
  buttonDiv.appendChild(practiceButton);

  const gapPlusButton = document.createElement("button");
  gapPlusButton.id = "gapPlusButton";
  gapPlusButton.innerText = "gap+";
  buttonDiv.appendChild(gapPlusButton);

  const gapMinusButton = document.createElement("button");
  gapMinusButton.id = "gapMinusButton";
  gapMinusButton.innerText = "gap-";
  buttonDiv.appendChild(gapMinusButton);

  const halikeyButton = document.createElement("button");
  halikeyButton.id = "startHalikey";
  halikeyButton.innerText = "Start Hk";
  halikeyButton.style.display = "none";
  buttonDiv.appendChild(halikeyButton);

  const generateButton = document.createElement("button");
  generateButton.textContent = "Histogram Image";
  generateButton.addEventListener("click", combineCanvasesAndGenerateDownloadLink);
  buttonDiv.appendChild(generateButton);

  const playSequenceButton = document.createElement("button");
  playSequenceButton.id = "playSequenceButton";
  playSequenceButton.innerText = "Play Key";
  playSequenceButton.addEventListener("click", () => playKeySequence(cwmsg));
  buttonDiv.appendChild(playSequenceButton);

  const clrMsgButton = document.createElement("button");
  clrMsgButton.id = "clrMsgButton";
  clrMsgButton.innerText = "clear";
  clrMsgButton.addEventListener("click", clrMsg);
  buttonDiv.appendChild(clrMsgButton);

  const histogramContainer = document.createElement("div");
  histogramContainer.style.display = "flex";
  histogramContainer.style.flexDirection = "column";
  histogramContainer.style.alignItems = "center";
  histogramContainer.style.width = "100%";
  histogramContainer.style.marginTop = "10px";
  appDiv.appendChild(histogramContainer);

  const dtimeTitle = document.createElement("div");
  dtimeTitle.innerText = "Dot/Dash Histogram";
  dtimeTitle.style.textAlign = "center";
  dtimeTitle.style.fontSize = "16px";
  dtimeTitle.style.marginBottom = "10px";
  histogramContainer.appendChild(dtimeTitle);

  dtimeCanvas = document.createElement("canvas");
  dtimeCanvas.id = "dtimeHistogramCanvas";
  clampCanvasSize(dtimeCanvas, histogramContainer.offsetWidth);
  histogramContainer.appendChild(dtimeCanvas);
  dtimeCtx = dtimeCanvas.getContext("2d");
  drawDtimeHistogram();

  const utimeTitle = document.createElement("div");
  utimeTitle.innerText = "Gap Histogram";
  utimeTitle.style.textAlign = "center";
  utimeTitle.style.fontSize = "16px";
  utimeTitle.style.margin = "10px 0";
  histogramContainer.appendChild(utimeTitle);

  utimeCanvas = document.createElement("canvas");
  utimeCanvas.id = "utimeHistogramCanvas";
  clampCanvasSize(utimeCanvas, histogramContainer.offsetWidth);
  histogramContainer.appendChild(utimeCanvas);
  utimeCtx = utimeCanvas.getContext("2d");
  drawUtimeHistogram();
}

function combineCanvasesAndGenerateDownloadLink() {
  const dcanvas = document.getElementById("dtimeHistogramCanvas");
  const ucanvas = document.getElementById("utimeHistogramCanvas");
  const buttonContainer = document.getElementById("buttonDiv");
  if (!dcanvas || !ucanvas || !buttonContainer) return;
  const labelHeight = 30;
  const combinedCanvas = document.createElement("canvas");
  combinedCanvas.width = Math.max(dcanvas.width, ucanvas.width);
  combinedCanvas.height = dcanvas.height + ucanvas.height + labelHeight * 2;
  const ctx = combinedCanvas.getContext("2d");
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, combinedCanvas.width, combinedCanvas.height);
  ctx.fillStyle = "black";
  ctx.font = "16px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Dot/Dash Times", combinedCanvas.width / 2, labelHeight - 5);
  ctx.drawImage(dcanvas, 0, labelHeight);
  ctx.fillText("Gap Times", combinedCanvas.width / 2, dcanvas.height + labelHeight * 2 - 5);
  ctx.drawImage(ucanvas, 0, dcanvas.height + labelHeight * 2);
  const imageName = "csimon-histogram.png";
  const dataUrl = combinedCanvas.toDataURL("image/png");
  let downloadLink = document.getElementById("downloadHistogramLink");
  if (!downloadLink) {
    downloadLink = document.createElement("a");
    downloadLink.id = "downloadHistogramLink";
    downloadLink.style.display = "block";
    downloadLink.style.marginTop = "10px";
    downloadLink.style.textAlign = "right";
    buttonContainer.appendChild(downloadLink);
  }
  downloadLink.href = dataUrl;
  downloadLink.download = imageName;
  downloadLink.textContent = "Share your results [png]";
}

function clrMsg() {
  cwmsg = "";
  dtime = 0;
  utime = 0;
  keydown = 0;
}

function playKeySequence(keyDownUpString) {
  const sequence = keyDownUpString;
  cwmsg = "";
  dtime = 0;
  utime = 0;
  keydown = 0;
  const keyDownUp = sequence.split("+").map(Number);
  async function playSequence() {
    for (let i = 0; i < keyDownUp.length; i++) {
      if (isNaN(keyDownUp[i])) continue;
      if (i % 2 === 0) {
        playSidetone();
      } else {
        stopSidetone();
      }
      await new Promise((resolve) => setTimeout(resolve, keyDownUp[i]));
    }
    stopSidetone();
  }
  playSequence();
}

function logMessage(message) {
  let logDiv = document.getElementById("consoleLog");
  if (!logDiv) {
    logDiv = document.createElement("div");
    logDiv.id = "consoleLog";
    logDiv.style.position = "fixed";
    logDiv.style.bottom = "10px";
    logDiv.style.left = "10px";
    logDiv.style.background = "rgba(0,0,0,0.7)";
    logDiv.style.color = "white";
    logDiv.style.padding = "5px";
    logDiv.style.fontSize = "12px";
    logDiv.style.zIndex = "9999";
    document.body.appendChild(logDiv);
  }
  logDiv.innerHTML = message;
}

console.log = logMessage;

function keyPress() {
  if (morsePlaybackActive) return;
  if (keydown === 0) {
    const now = performance.now();
    if (utime !== 0) {
      const rawUp = now - utime;
      if (rawUp <= IDLE_RESET_MS) {
        const upDur = Math.round(rawUp);
        cwmsg += upDur + "+";
        updateUtimeHistogram(upDur);
      }
    }
    dtime = now;
    keydown = 1;
    ensureAudioReady();
    if (practiceMode) {
      playSidetone();
    }
  }
}

function keyRelease() {
  if (morsePlaybackActive) return;
  // Ignore stray releases
  if (keydown === 0) return;

  const now = performance.now();

  // --- Duration of this element (dot/dash) ---
  const downDur = Math.round(now - dtime);
  keydown = 0;

  updateDtimeHistogram(downDur);

  // mark time of this release for the next up-gap
  utime = now;

  // local practice sidetone off
  if (practiceMode) {
    stopSidetone();
  }
}

function control(event) {
  event.preventDefault();
  if (event.type === "touchend") {
    if (lastElementTouched) {
      leave(lastElementTouched);
    }
    lastElementTouched = null;
    return;
  }

  const touches = event.touches;
  if (!touches || touches.length === 0) return;
  const touch = touches[0];
  const pos = { x: touch.clientX, y: touch.clientY };
  const currentElementTouched = document.elementFromPoint(pos.x, pos.y);
  if (lastElementTouched !== null && lastElementTouched === currentElementTouched) {
    stay(currentElementTouched);
  } else {
    enter(currentElementTouched);
  }
}
// iambic loop control
let iambicActive = false;
let iambicToken = 0;

async function startIambic(sideId) {
  iambicActive = true;
  const myToken = ++iambicToken;

  const toneUnits = sideId === "3" ? 3 : 1; // 3 for id=3, 1 for id=1

  while (myToken === iambicToken) {
    keyPress();
    if (_txHapticsEnabled && navigator.vibrate) {
      navigator.vibrate(toneUnits * UNIT_MS);
    }
    await sleep(toneUnits * UNIT_MS); // tone duration
    keyRelease();

    // Record element at the source — sideId is stable here (function param),
    // unlike _currentSideId which could go stale during leave()/enter().
    if (_inputCaptureMode && _simonDecoder) {
      _simonDecoder.element(Number(sideId));
      if (_simonState && !SimonGame.isGameOver(_simonState)) {
        _checkSimonElementCount();
      }
    }

    await sleep(UNIT_MS); // inter-element gap

    // Reset idle timer after the gap so the full SIMON_IDLE_MS window
    // is available from this point for the next element to start.
    if (_inputCaptureMode && _simonState && !SimonGame.isGameOver(_simonState)) {
      _resetSimonIdleTimer();
    }

    if (!iambicActive || myToken !== iambicToken) break;
  }
}

// Called when entering a new element.
function enter(element) {
  if (lastElementTouched !== null) {
    leave(lastElementTouched);
  }

  if (element && (element.id == "1" || element.id == "3")) {
    if (navigator.vibrate) navigator.vibrate(50);
    startIambic(element.id);
  }

  if (element) {
    element.textContent = "on";
    lastElementTouched = element;
  }
}


function stay(element) {
  // no-op right now
}


// Called when leaving an element.
function leave(element) {
  element.textContent = "off";
  iambicActive = false;
}

document.addEventListener("DOMContentLoaded", () => {
  const appDiv = document.getElementById("app");
  if (!appDiv) {
    console.warn("App container (#app) not found.");
    return;
  }

  adduiEls("app", "iambic");
  updatePracticeButtonText();

  const halikeyButton = document.getElementById("startHalikey");
  if (halikeyButton) {
    halikeyButton.addEventListener("click", toggleHalikey);
  }

  const practiceButton = document.getElementById("practiceModeButton");
  if (practiceButton) {
    practiceButton.addEventListener("click", togglePracticeMode);
  }

  const gapPlusButton = document.getElementById("gapPlusButton");
  if (gapPlusButton) {
    gapPlusButton.addEventListener("click", () => gapAdjust(5));
  }

  const gapMinusButton = document.getElementById("gapMinusButton");
  if (gapMinusButton) {
    gapMinusButton.addEventListener("click", () => gapAdjust(-5));
  }

  const elementsContainer = document.getElementById("elements");
  if (elementsContainer) {
    elementsContainer.addEventListener("touchstart", control, false);
    elementsContainer.addEventListener("touchmove", control, false);
    elementsContainer.addEventListener("touchend", control, false);
  }

  const startGameButton = document.getElementById("startGameButton");
  if (startGameButton) {
    startGameButton.addEventListener("click", startGame);
  }

  // Wire up Simon input decoder and lose-flow restart
  initSimonInputWiring();

  var restartBtn = document.getElementById("loseRestartBtn");
  if (restartBtn) {
    restartBtn.addEventListener("click", restartGame);
  }

  var cancelBtn = document.getElementById("loseCancelBtn");
  if (cancelBtn) {
    cancelBtn.addEventListener("click", cancelToMenu);
  }

  const settingsGearBtn = document.getElementById("settingsGearBtn");
  const settingsPanel = document.getElementById("settingsPanel");
  const settingsCloseBtn = document.getElementById("settingsCloseBtn");

  if (settingsGearBtn && settingsPanel && settingsCloseBtn) {
    settingsGearBtn.addEventListener("click", () => {
      refreshSpeedDisplay();
      settingsPanel.classList.add("open");
    });
    settingsCloseBtn.addEventListener("click", () => {
      settingsPanel.classList.remove("open");
    });
  }

  // Speed controls
  var wpmPlus = document.getElementById("wpmPlus");
  var wpmMinus = document.getElementById("wpmMinus");
  var wordGapPlus = document.getElementById("wordGapPlus");
  var wordGapMinus = document.getElementById("wordGapMinus");

  if (wpmPlus) wpmPlus.addEventListener("click", () => adjustWpm(1));
  if (wpmMinus) wpmMinus.addEventListener("click", () => adjustWpm(-1));
  if (wordGapPlus) wordGapPlus.addEventListener("click", () => adjustWordGap(5));
  if (wordGapMinus) wordGapMinus.addEventListener("click", () => adjustWordGap(-5));

  refreshSpeedDisplay();

  // Lose-sound mute toggle
  var loseSoundToggle = document.getElementById("loseSoundToggle");
  if (loseSoundToggle) {
    loseSoundToggle.addEventListener("click", function () {
      loseSoundMuted = !loseSoundMuted;
      loseSoundToggle.textContent = loseSoundMuted ? "Off" : "On";
    });
  }

  // tx haptics toggle
  var txHapticsToggle = document.getElementById("txHapticsToggle");
  if (txHapticsToggle) {
    txHapticsToggle.textContent = _txHapticsEnabled ? "On" : "Off";
    txHapticsToggle.addEventListener("click", function () {
      _txHapticsEnabled = !_txHapticsEnabled;
      localStorage.setItem("txHaptics", _txHapticsEnabled);
      txHapticsToggle.textContent = _txHapticsEnabled ? "On" : "Off";
    });
  }

  // Letter overlay toggle
  var letterOverlayToggle = document.getElementById("letterOverlayToggle");
  if (letterOverlayToggle) {
    letterOverlayToggle.textContent = _letterOverlayEnabled ? "On" : "Off";
    letterOverlayToggle.addEventListener("click", function () {
      _letterOverlayEnabled = !_letterOverlayEnabled;
      localStorage.setItem("letterOverlay", _letterOverlayEnabled);
      letterOverlayToggle.textContent = _letterOverlayEnabled ? "On" : "Off";
    });
  }

  // Wire Simon input decoder to keyer hooks (already called via initSimonInputWiring above)
});

// === Letter Overlay ========================================================

function showLetterOverlay(letter) {
  if (!_letterOverlayEnabled) return;
  var el = document.getElementById("morseOverlay");
  if (!el) return;
  el.textContent = letter;
  el.classList.add("visible");
}

function fadeLetterOverlay() {
  var el = document.getElementById("morseOverlay");
  if (!el) return;
  el.classList.remove("visible");
}

// === Lose Flow =============================================================

var _simonDecoder = null;

/**
 * Wire up keyer hooks to the Simon game matcher (called once at init).
 * Creates an InputDecoder that accumulates dit/dah elements into letters,
 * then checks each decoded letter against the expected game sequence.
 */
function initSimonInputWiring() {
  _simonDecoder = SimonGame.createInputDecoder({
    onDecode: function (letter, pattern) {
      if (!_simonState || SimonGame.isGameOver(_simonState)) return;

      var result = SimonGame.checkLetter(_simonState, pattern);

      if (result === SimonGame.Result.WRONG) {
        onGameLose();
      } else if (result === SimonGame.Result.ROUND_COMPLETE) {
        onRoundComplete();
      }
      // LETTER_CORRECT → wait for next letter
    }
  });

  onLetterBoundary(function () {
    if (_simonDecoder) _simonDecoder.letterBoundary();
  });
}

/**
 * Handle a lost game: stop input, play lose sound, show results modal.
 */
async function onGameLose() {
  setInputCaptureMode(false);
  morsePlaybackActive = false;
  stopSidetone();

  var score = SimonGame.getScore(_simonState);

  if (!loseSoundMuted) {
    await playLoseSound();
  }

  showLoseModal(score);
}

/**
 * Play 'HI HI' in Morse at a lower frequency than game playback.
 */
async function playLoseSound() {
  await ensureAudioReady();
  morsePlaybackActive = true;
  try {
    await sendMorseMessage(String(LOSE_SOUND_FREQ), "HI HI");
  } finally {
    morsePlaybackActive = false;
    stopSidetone();
  }
}

function showLoseModal(roundsCompleted) {
  var modal = document.getElementById("loseModal");
  if (!modal) return;

  var scoreEl = document.getElementById("loseRoundsCount");
  if (scoreEl) scoreEl.textContent = roundsCompleted;

  // Build progress display from the current round's sequence
  var progressMsg = document.getElementById("loseProgressMsg");
  var progressSeq = document.getElementById("loseProgressSeq");
  if (progressMsg && progressSeq && _simonState) {
    var matched = _simonState.inputIndex;
    var seq = _simonState.sequence;

    progressMsg.textContent = "\uD83D\uDCE1 Signal lost after " + matched + " copies!";

    var display = "";
    for (var i = 0; i < seq.length; i++) {
      if (i < matched) {
        display += seq[i];
      } else if (i === matched) {
        display += "\u274C";
        break;
      }
    }
    progressSeq.textContent = display;
  }

  modal.classList.add("visible");
}

function hideLoseModal() {
  var modal = document.getElementById("loseModal");
  if (modal) modal.classList.remove("visible");
}

function restartGame() {
  hideLoseModal();
  startGame();
}

function cancelToMenu() {
  hideLoseModal();
  _simonState = null;
}

// === Simon Game Orchestration =============================================

/**
 * Play a sequence of characters as Morse sidetone.
 * Uses playSidetone()/stopSidetone() directly to avoid side effects
 * from keyPress()/keyRelease() (histograms, keyer hooks, cwmsg).
 * Shows a per-letter overlay that fades when each letter's audio ends.
 *
 * @param {string[]} sequence - Array of uppercase characters to play.
 */
async function playMorseSequence(sequence) {
  var unit = UNIT_MS;
  for (var i = 0; i < sequence.length; i++) {
    var pattern = SimonGame.encodeMorse(sequence[i]);
    if (!pattern) continue;

    showLetterOverlay(sequence[i]);

    for (var j = 0; j < pattern.length; j++) {
      var durUnits = pattern[j] === "." ? 1 : 3;
      playSidetone();
      if (_txHapticsEnabled && navigator.vibrate) {
        navigator.vibrate(durUnits * unit);
      }
      await sleep(durUnits * unit);
      stopSidetone();
      // Intra-character gap (between elements within a letter)
      if (j < pattern.length - 1) {
        await sleep(unit);
      }
    }

    fadeLetterOverlay();

    // Inter-character gap (between letters)
    if (i < sequence.length - 1) {
      await sleep(unit * 3);
    }
  }
}

/**
 * Start a new Simon game.
 * Initializes game state, chooses the first symbol, and begins playback.
 */
async function startGame() {
  if (morsePlaybackActive) return;

  await ensureAudioReady();
  _simonState = SimonGame.createState();
  if (_simonDecoder) _simonDecoder.reset();
  SimonGame.advanceRound(_simonState);

  if (_simonDecoder) _simonDecoder.reset();

  await playRound();
}

/**
 * Play the current round's full sequence, then activate input capture.
 * Replays ALL prior symbols plus the newest one.
 */
async function playRound() {
  await sleep(500);
  morsePlaybackActive = true;
  setInputCaptureMode(false);

  try {
    var sequence = SimonGame.getSequence(_simonState);
    await playMorseSequence(sequence);
  } finally {
    morsePlaybackActive = false;
    stopSidetone();
  }

  // Hand off to user input
  if (_simonDecoder) _simonDecoder.reset();
  setInputCaptureMode(true);
}

/**
 * Called when the player successfully matches the full sequence for a round.
 * Appends a new random symbol and plays the next round.
 */
function onRoundComplete() {
  SimonGame.advanceRound(_simonState);
  playRound();
}

// === Keyer Event Hooks ===
//
// Simon element recording is done directly in startIambic() where sideId
// is stable. Letter boundary callbacks are used by the Simon decoder.

let _letterBoundaryCallbacks = [];
let _inputCaptureMode = false;
let _letterBoundaryTimer = null;
let _simonIdleTimer = null;
const SIMON_IDLE_MS = 2100;

/**
 * Register a callback that fires when an inter-character gap is detected
 * (silence longer than 3 * UNIT_MS after the last element).
 * Only fires when input-capture mode is enabled.
 */
function onLetterBoundary(callback) {
  _letterBoundaryCallbacks.push(callback);
}

/**
 * Enable or disable input-capture mode.
 * Callbacks only fire when capture mode is on.
 */
function setInputCaptureMode(enabled) {
  _inputCaptureMode = !!enabled;
  if (!enabled) {
    if (_letterBoundaryTimer) {
      clearTimeout(_letterBoundaryTimer);
      _letterBoundaryTimer = null;
    }
    _clearSimonIdleTimer();
  } else {
    _resetSimonIdleTimer();
  }
}

/**
 * Check if the accumulated element count matches the expected pattern length
 * for the current Simon letter. If so, auto-fire the letter boundary.
 */
function _checkSimonElementCount() {
  if (!_simonState || SimonGame.isGameOver(_simonState) || !_simonDecoder) return;
  var expectedChar = _simonState.sequence[_simonState.inputIndex];
  if (!expectedChar) return;
  var expectedPattern = SimonGame.encodeMorse(expectedChar);
  if (!expectedPattern) return;
  if (_simonDecoder.currentPattern().length >= expectedPattern.length) {
    _fireLetterBoundary();
  }
}

function _resetSimonIdleTimer() {
  if (_simonIdleTimer) clearTimeout(_simonIdleTimer);
  _simonIdleTimer = null;
  if (!_inputCaptureMode || !_simonState || SimonGame.isGameOver(_simonState)) return;
  _simonIdleTimer = setTimeout(function() {
    _simonIdleTimer = null;
    if (_inputCaptureMode && _simonState && !SimonGame.isGameOver(_simonState)) {
      onGameLose();
    }
  }, SIMON_IDLE_MS);
}

function _clearSimonIdleTimer() {
  if (_simonIdleTimer) {
    clearTimeout(_simonIdleTimer);
    _simonIdleTimer = null;
  }
}

function _fireLetterBoundary() {
  if (!_inputCaptureMode) return;
  for (const cb of _letterBoundaryCallbacks) {
    try { cb(); } catch (e) { console.error(e); }
  }
}

// Wrap keyRelease() to handle non-Simon letter-boundary detection.
// Simon element recording now happens in startIambic() at the source.
// This wrapper only handles non-Simon timer-based letter boundaries.
const _originalKeyRelease = keyRelease;
keyRelease = function() {
  _originalKeyRelease();
  if (_inputCaptureMode) {
    if (_letterBoundaryTimer) clearTimeout(_letterBoundaryTimer);
    _letterBoundaryTimer = null;

    if (!_simonState || SimonGame.isGameOver(_simonState)) {
      // Non-Simon mode: use traditional timer-based boundary detection
      _letterBoundaryTimer = setTimeout(function() {
        _letterBoundaryTimer = null;
        _fireLetterBoundary();
      }, 3 * UNIT_MS);
    }
  }
};

// Wrap keyPress() to cancel any pending letter-boundary timer
// and reset the Simon idle timer (user is active).
const _originalKeyPress = keyPress;
keyPress = function() {
  if (_letterBoundaryTimer) {
    clearTimeout(_letterBoundaryTimer);
    _letterBoundaryTimer = null;
  }
  if (_inputCaptureMode && _simonState && !SimonGame.isGameOver(_simonState)) {
    _resetSimonIdleTimer();
  }
  return _originalKeyPress();
};
