let port;
let reader;

// Batas minimum
const MIN_TEMP = 20;
const MIN_HUM = 30;

async function connectSerial() {
  try {
    port = await navigator.serial.requestPort();
    await port.open({ baudRate: 115200 });

    const decoder = new TextDecoderStream();
    port.readable.pipeTo(decoder.writable);
    reader = decoder.readable.getReader();

    readLoop();
  } catch (error) {
    console.error("Gagal membuka port serial:", error);
  }
}

async function readLoop() {
  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      reader.releaseLock();
      break;
    }
    if (value) {
      value.split("\n").forEach(line => {
        if (line.trim()) updateUI(line.trim());
      });
    }
  }
}

function updateUI(line) {
  const tempMatch = line.match(/Temp:\s*([\d.]+)/);
  const humMatch = line.match(/Hum:\s*([\d.]+)/);
  const distMatch = line.match(/Dist:\s*([\d.]+)/);
  const ldrMatch = line.match(/LDR:\s*(\d+)/);
  const btnMatch = line.match(/Button:\s*(ON|OFF)/);

  let tempValue = null;
  let humValue = null;

  if (tempMatch) {
    tempValue = parseFloat(tempMatch[1]);
    document.getElementById("temp").textContent = "Suhu: " + tempValue + " °C";

    const tempWarning = document.getElementById("tempWarning");
    tempWarning.textContent = tempValue < MIN_TEMP
      ? "⚠️ Peringatan: Suhu di bawah batas minimum!"
      : "✅ Suhu dalam batas normal.";
    tempWarning.style.color = tempValue < MIN_TEMP ? "red" : "green";
  }

  if (humMatch) {
    humValue = parseFloat(humMatch[1]);
    document.getElementById("hum").textContent = "Kelembapan: " + humValue + " %";

    const humWarning = document.getElementById("humWarning");
    humWarning.textContent = humValue < MIN_HUM
      ? "⚠️ Peringatan: Kelembapan di bawah batas minimum!"
      : "✅ Kelembapan dalam batas normal.";
    humWarning.style.color = humValue < MIN_HUM ? "red" : "green";
  }

  if (distMatch) {
    const distValue = parseFloat(distMatch[1]);
    document.getElementById("dist").textContent = "Jarak: " + distValue + " cm";

    const distWarning = document.getElementById("distWarning");
    distWarning.textContent = distValue < 30
      ? "⚠️ Peringatan: Ada orang masuk!"
      : "✅ Aman, tidak ada orang.";
    distWarning.style.color = distValue < 30 ? "red" : "green";
  }

  if (ldrMatch) {
    const ldrValue = parseInt(ldrMatch[1]);
    document.getElementById("ldr").textContent = "Cahaya: " + ldrValue;

    const ldrWarning = document.getElementById("ldrWarning");
    ldrWarning.textContent = ldrValue < 500
      ? "⚠️ Peringatan: Cahaya ruangan terlalu redup!"
      : "✅ Cahaya ruangan cukup.";
    ldrWarning.style.color = ldrValue < 500 ? "red" : "green";
  }

  if (btnMatch) {
    document.getElementById("btn").textContent = "Tombol: " + btnMatch[1];
  }
}

// Kirim perintah ke board
async function sendCommand(command) {
  if (!port || !port.writable) {
    console.error("Port belum terbuka.");
    return;
  }

  const writer = port.writable.getWriter();
  const data = new TextEncoder().encode(command + "\n");
  await writer.write(data);
  writer.releaseLock();
}

// 🔁 Listen data dari Firebase
window.addEventListener("DOMContentLoaded", () => {
  const db = firebase.database();
  const sensorRef = db.ref("sensor");

  sensorRef.on("value", (snapshot) => {
    const data = snapshot.val();
    if (!data) return;

    const line = `Temp: ${data.temperature} C, Hum: ${data.humidity} %, Dist: ${data.distance} cm, LDR: ${data.ldr}, Button: ${data.button ? 'ON' : 'OFF'}`;
    updateUI(line);
  });
});