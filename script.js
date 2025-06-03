let port;
let reader;

// Atur batas minimal suhu dan kelembapan
const MIN_TEMP = 20;  // derajat Celcius
const MIN_HUM = 30;   // persen

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
  // Contoh data:
  // Temp: 27.3 C, Hum: 60 %, Dist: 123 cm, LDR: 300, Button: ON

  const tempMatch = line.match(/Temp:\s*([\d.]+)/);
  const humMatch = line.match(/Hum:\s*([\d.]+)/);
  const distMatch = line.match(/Dist:\s*([\d.]+)/);
  const ldrMatch = line.match(/LDR:\s*(\d+)/);
  const btnMatch = line.match(/Button:\s*(ON|OFF)/);

  let tempValue = null;
  let humValue = null;

  // Suhu
  if (tempMatch) {
    tempValue = parseFloat(tempMatch[1]);
    document.getElementById("temp").textContent = "Suhu: " + tempValue + " °C";

    const tempWarning = document.getElementById("tempWarning");
    if (tempValue < MIN_TEMP) {
      tempWarning.textContent = "⚠️ Peringatan: Suhu di bawah batas minimum!";
      tempWarning.style.color = "red";
    } else {
      tempWarning.textContent = "✅ Suhu dalam batas normal.";
      tempWarning.style.color = "green";
    }
  }

  // Kelembapan
  if (humMatch) {
    humValue = parseFloat(humMatch[1]);
    document.getElementById("hum").textContent = "Kelembapan: " + humValue + " %";

    const humWarning = document.getElementById("humWarning");
    if (humValue < MIN_HUM) {
      humWarning.textContent = "⚠️ Peringatan: Kelembapan di bawah batas minimum!";
      humWarning.style.color = "red";
    } else {
      humWarning.textContent = "✅ Kelembapan dalam batas normal.";
      humWarning.style.color = "green";
    }
  }

  // Jarak
  if (distMatch) {
    const distValue = parseFloat(distMatch[1]);
    document.getElementById("dist").textContent = "Jarak: " + distValue + " cm";

    const distWarning = document.getElementById("distWarning");
    if (distValue < 30) {
      distWarning.textContent = "⚠️ Peringatan: Ada orang masuk!";
      distWarning.style.color = "red";
    } else {
      distWarning.textContent = "✅ Aman, tidak ada orang.";
      distWarning.style.color = "green";
    }
  }

  // Cahaya
  if (ldrMatch) {
    const ldrValue = parseInt(ldrMatch[1]);
    document.getElementById("ldr").textContent = "Cahaya: " + ldrValue;

    const ldrWarning = document.getElementById("ldrWarning");
    if (ldrValue < 500) {
      ldrWarning.textContent = "⚠️ Peringatan: Cahaya ruangan terlalu redup!";
      ldrWarning.style.color = "red";
    } else {
      ldrWarning.textContent = "✅ Cahaya ruangan cukup.";
      ldrWarning.style.color = "green";
    }
  }

  // Tombol manual
  if (btnMatch) {
    document.getElementById("btn").textContent = "Tombol: " + btnMatch[1];
  }
}

// Fungsi kirim perintah ke board
async function sendCommand(command) {
  if (!port || !port.writable) {
    console.error("Port belum terbuka atau tidak tersedia.");
    return;
  }

  const writer = port.writable.getWriter();
  const data = new TextEncoder().encode(command + "\n");
  await writer.write(data);
  writer.releaseLock();
}