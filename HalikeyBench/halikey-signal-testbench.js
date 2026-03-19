let serialPort = null;
let monitoring = false;
let previousSignals = null;

const POLL_MS = 10;

const SIGNAL_LABELS = {
  dataCarrierDetect: "DCD (Data Carrier Detect)",
  clearToSend: "CTS (Clear To Send)",
  ringIndicator: "RI (Ring Indicator)",
  dataSetReady: "DSR (Data Set Ready)"
};

window.addEventListener("DOMContentLoaded", () => {
  document.getElementById("connectBtn").addEventListener("click", toggleHalikey);
  document.getElementById("disconnectBtn").addEventListener("click", disconnectSerialPort);
  document.getElementById("clearBtn").addEventListener("click", clearLog);

  if (!("serial" in navigator)) {
    setStatus("Status: Web Serial API is not supported.");
    logMessage("Web Serial API is not supported in this browser.");
  }
});

async function toggleHalikey() {
  if (!("serial" in navigator)) {
    alert("Web Serial API is not supported in this browser.");
    return;
  }

  if (serialPort) {
    logMessage("Already connected.");
    return;
  }

  await connectToSerialPort();
}

async function connectToSerialPort() {
  try {
    serialPort = await navigator.serial.requestPort();
    await serialPort.open({ baudRate: 9600 });

    setStatus("Status: Connected");
    logMessage("Serial port connected.");

    previousSignals = await serialPort.getSignals();
    logAllSignals("Initial signal state", previousSignals);

    monitoring = true;
    listenToSerialPort();

  } catch (error) {
    logMessage(`Connection failed: ${error.message || error}`);
    serialPort = null;
    previousSignals = null;
    setStatus("Status: Disconnected");
  }
}

async function listenToSerialPort() {
  if (!serialPort) return;

  while (monitoring && serialPort.readable) {
    try {
      const currentSignals = await serialPort.getSignals();

      if (previousSignals) {
        reportSignalChanges(previousSignals, currentSignals);
      }

      previousSignals = currentSignals;

      await sleep(POLL_MS);

    } catch (error) {
      logMessage(`Read error: ${error.message || error}`);
      break;
    }
  }

  // clean exit
  await disconnectSerialPort();
}

function reportSignalChanges(prev, curr) {
  for (const key of Object.keys(SIGNAL_LABELS)) {
    if (prev[key] !== curr[key]) {
      const state = curr[key] ? "ASSERTED / TRUE / HIGH" : "DEASSERTED / FALSE / LOW";
      logMessage(`${SIGNAL_LABELS[key]} changed → ${state}`);
    }
  }
}

function logAllSignals(prefix, signals) {
  logMessage(
    `${prefix}: ` +
    `CTS=${bool(signals.clearToSend)}, ` +
    `DSR=${bool(signals.dataSetReady)}, ` +
    `DCD=${bool(signals.dataCarrierDetect)}, ` +
    `RI=${bool(signals.ringIndicator)}`
  );
}

function bool(v) {
  return v ? "1" : "0";
}

async function disconnectSerialPort() {
  monitoring = false;

  if (serialPort) {
    try {
      await serialPort.close();
      logMessage("Serial port disconnected.");
    } catch (error) {
      logMessage(`Error closing port: ${error.message || error}`);
    }
  }

  serialPort = null;
  previousSignals = null;
  setStatus("Status: Disconnected");
}

function clearLog() {
  document.getElementById("logArea").value = "";
}

function logMessage(msg) {
  const logArea = document.getElementById("logArea");
  const ts = new Date().toISOString();
  logArea.value += `[${ts}] ${msg}\n`;
  logArea.scrollTop = logArea.scrollHeight;
}

function setStatus(text) {
  document.getElementById("statusText").textContent = text;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}