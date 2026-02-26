
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
  // +1 WPM => UNIT_MS - 5, -1 WPM => UNIT_MS + 5
  UNIT_MS = Math.max(10, UNIT_MS + direction * -5);
  refreshSpeedDisplay();
}

function adjustWordGap(delta) {
  WORD_GAP_MS = Math.max(0, WORD_GAP_MS + delta);
  refreshSpeedDisplay();
}

function refreshSpeedDisplay() {
  var wpmEl = document.getElementById("wpmValue");
  var gapEl = document.getElementById("wordGapValue");
  if (wpmEl) wpmEl.textContent = Math.round(1200 / UNIT_MS);
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
    await sleep(toneUnits * UNIT_MS); // tone duration
    keyRelease();
    await sleep(UNIT_MS); // inter-element gap
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
    startGameButton.addEventListener("click", playMorseK);
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
});

// === Keyer Event Hooks (additive — no core logic changes) ===
//
// Provides callback registration for the Simon game to observe iambic
// keyer input without modifying startIambic(), enter(), or leave().

let _keyerInputCallbacks = [];
let _letterBoundaryCallbacks = [];
let _inputCaptureMode = false;
let _currentSideId = null;
let _letterBoundaryTimer = null;

/**
 * Register a callback that fires on each dit/dah element.
 * Callback receives sideId: 1 for dit, 3 for dah.
 * Only fires when input-capture mode is enabled.
 */
function onKeyerInput(callback) {
  _keyerInputCallbacks.push(callback);
}

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
    _currentSideId = null;
    if (_letterBoundaryTimer) {
      clearTimeout(_letterBoundaryTimer);
      _letterBoundaryTimer = null;
    }
  }
}

function _fireKeyerInput(sideId) {
  if (!_inputCaptureMode) return;
  for (const cb of _keyerInputCallbacks) {
    try { cb(sideId); } catch (e) { console.error(e); }
  }
}

function _fireLetterBoundary() {
  if (!_inputCaptureMode) return;
  for (const cb of _letterBoundaryCallbacks) {
    try { cb(); } catch (e) { console.error(e); }
  }
}

// Wrap enter() to track which paddle (sideId) is active.
// Original enter() body is called unchanged.
const _originalEnter = enter;
enter = function(element) {
  if (element && (element.id == "1" || element.id == "3")) {
    _currentSideId = Number(element.id);
  }
  return _originalEnter(element);
};

// Wrap keyRelease() to fire the keyer-input callback after each element
// and start the letter-boundary timer.
const _originalKeyRelease = keyRelease;
keyRelease = function() {
  _originalKeyRelease();
  if (_inputCaptureMode && _currentSideId !== null) {
    _fireKeyerInput(_currentSideId);
  }
  if (_inputCaptureMode) {
    if (_letterBoundaryTimer) clearTimeout(_letterBoundaryTimer);
    _letterBoundaryTimer = setTimeout(function() {
      _letterBoundaryTimer = null;
      _fireLetterBoundary();
    }, 3 * UNIT_MS);
  }
};

// Wrap keyPress() to cancel any pending letter-boundary timer.
const _originalKeyPress = keyPress;
keyPress = function() {
  if (_letterBoundaryTimer) {
    clearTimeout(_letterBoundaryTimer);
    _letterBoundaryTimer = null;
  }
  return _originalKeyPress();
};
