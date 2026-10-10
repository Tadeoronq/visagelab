// main.js - Controlador de Dispositivo, Permisos HTTPS y Semáforo Clínico (Puntos 1, 2, 3 y 4 Integrados)

let currentStream = null;
const videoElement = document.getElementById('webcam');
const canvasElement = document.getElementById('output_canvas');
const canvasCtx = canvasElement.getContext('2d', { willReadFrequently: true });
const cameraSelect = document.getElementById('cameraSelect');

// Configuración MediaPipe
const faceMesh = new FaceMesh({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
});

faceMesh.setOptions({
  maxNumFaces: 1,
  refineLandmarks: true,
  minDetectionConfidence: 0.6,
  minTrackingConfidence: 0.6
});

// Pedir Permisos en GitHub Pages
async function initCamera() {
  try {
    const constraints = {
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: 'user'
      }
    };

    currentStream = await navigator.mediaDevices.getUserMedia(constraints);
    videoElement.srcObject = currentStream;

    await new Promise((resolve) => {
      videoElement.onloadedmetadata = () => {
        videoElement.play();
        resolve();
      };
    });

    canvasElement.width = videoElement.videoWidth || 1280;
    canvasElement.height = videoElement.videoHeight || 720;

    await populateCameraList();
    processVideoFrame();

  } catch (err) {
    console.error("Error al acceder a la cámara:", err);
    alert("⚠️ Activa el permiso de cámara en el candado 🔒 de la barra de direcciones.");
  }
}

async function populateCameraList() {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter(device => device.kind === 'videoinput');

    if (!cameraSelect) return;
    cameraSelect.innerHTML = '';

    videoDevices.forEach((device, index) => {
      const option = document.createElement('option');
      option.value = device.deviceId;
      option.text = device.label || `Cámara ${index + 1}`;
      cameraSelect.appendChild(option);
    });
  } catch (err) {
    console.warn("Error al listar dispositivos:", err);
  }
}

async function switchCamera(deviceId) {
  if (currentStream) {
    currentStream.getTracks().forEach(track => track.stop());
  }

  const constraints = {
    video: {
      deviceId: { exact: deviceId },
      width: { ideal: 1280 },
      height: { ideal: 720 }
    }
  };

  try {
    currentStream = await navigator.mediaDevices.getUserMedia(constraints);
    videoElement.srcObject = currentStream;
    await videoElement.play();

    canvasElement.width = videoElement.videoWidth;
    canvasElement.height = videoElement.videoHeight;
  } catch (e) {
    console.error("Error al cambiar de cámara:", e);
  }
}

if (cameraSelect) {
  cameraSelect.addEventListener('change', (e) => {
    if (e.target.value) switchCamera(e.target.value);
  });
}

async function processVideoFrame() {
  if (videoElement.paused || videoElement.ended) return;

  if (canvasElement.width !== videoElement.videoWidth && videoElement.videoWidth > 0) {
    canvasElement.width = videoElement.videoWidth;
    canvasElement.height = videoElement.videoHeight;
  }

  await faceMesh.send({ image: videoElement });
  requestAnimationFrame(processVideoFrame);
}

// Bucle Detección con Sincronización Dinámica del DOM (Punto 3)
faceMesh.onResults((results) => {
  canvasCtx.save();
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
  canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

  if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
    const landmarks = results.multiFaceLandmarks[0];
    
    // Lectura dinámica desde los inputs del HTML (Género y Edad)
    const selectedGender = document.querySelector('input[name="genderSelect"]:checked')?.value || 'male';
    const inputAge = parseInt(document.getElementById('ageInput')?.value) || 25;

    if (typeof BiometricsModule !== 'undefined') BiometricsModule.init(results, canvasCtx);
    if (typeof ColorimetryModule !== 'undefined') ColorimetryModule.analyze(canvasElement, landmarks);
    
    if (typeof FacialTraitsModule !== 'undefined') {
      FacialTraitsModule.analyze(landmarks, canvasElement.width, canvasElement.height, selectedGender, inputAge);
    }

    evaluateQualitySemaforo(canvasElement, canvasCtx, landmarks);
  }
  canvasCtx.restore();
});

// SEMÁFORO DE CALIDAD (PUNTOS 1, 2, 3 Y 4 INTEGRADOS)
function evaluateQualitySemaforo(canvas, ctx, landmarks) {
  // Puntos 33 y 263 (Cantos externos de los ojos)
  const eyeL = landmarks[33];
  const eyeR = landmarks[263];

  // Cálculo trigonométrico exacto en grados sexagesimales (Punto 1)
  const dx = (eyeR.x - eyeL.x) * canvas.width;
  const dy = (eyeR.y - eyeL.y) * canvas.height;
  const tiltAngleDeg = Math.abs(Math.atan2(dy, dx) * (180 / Math.PI));
  
  const isPoseOk = tiltAngleDeg <= 2.0; 
  updateStatusDot('dot-pose', isPoseOk);

  try {
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

    // Evaluación de luz con muestreo proporcional a la distancia intercantal (Punto 4)
    const isLightOk = checkFacialLightingAndShadows(ctx, landmarks, canvas.width, canvas.height);
    updateStatusDot('dot-light', isLightOk);

    // Muestreo de fondo reajustado al 12% y 88% para evitar bandas negras (Punto 2)
    const isBackgroundNeutral = checkBackgroundNeutrality(imgData, canvas.width, canvas.height);
    updateStatusDot('dot-contrast', isBackgroundNeutral);

    const isQualityOk = isPoseOk && isLightOk && isBackgroundNeutral;
    updateStatusDot('dot-quality', isQualityOk);

    if (typeof toggleCaptureButton === 'function') {
      toggleCaptureButton(isQualityOk);
    }
  } catch (e) {}
}

// ILUMINACIÓN CON MUESTREO ESCALADO PROPORCIONALMENTE (Punto 4)
function checkFacialLightingAndShadows(ctx, landmarks, width, height) {
  // Calcular la unidad intercantal en píxeles (Puntos 133 y 362)
  const pLeft = { x: landmarks[133].x * width, y: landmarks[133].y * height };
  const pRight = { x: landmarks[362].x * width, y: landmarks[362].y * height };
  const intercanthalUnit = Math.hypot(pLeft.x - pRight.x, pLeft.y - pRight.y);

  if (intercanthalUnit < 5) return false;

  // El tamaño de la muestra escala proporcionalmente (aprox. 8% de la distancia entre ojos)
  const sampleRadius = Math.max(2, Math.floor(intercanthalUnit * 0.08));
  const sampleSize = sampleRadius * 2 + 1;

  const points = [10, 117, 346, 152];
  const brightnessValues = [];

  points.forEach(idx => {
    const pt = landmarks[idx];
    if (pt) {
      const x = Math.floor(pt.x * width);
      const y = Math.floor(pt.y * height);
      
      const sampleX = Math.max(0, x - sampleRadius);
      const sampleY = Math.max(0, y - sampleRadius);
      const sampleWidth = Math.min(width - sampleX, sampleSize);
      const sampleHeight = Math.min(height - sampleY, sampleSize);

      if (sampleWidth > 0 && sampleHeight > 0) {
        const sample = ctx.getImageData(sampleX, sampleY, sampleWidth, sampleHeight).data;
        
        let sum = 0;
        for (let i = 0; i < sample.length; i += 4) {
          sum += (sample[i] * 0.299 + sample[i + 1] * 0.587 + sample[i + 2] * 0.114);
        }
        brightnessValues.push(sum / (sample.length / 4));
      }
    }
  });

  if (brightnessValues.length < 4) return false;

  const avgBrightness = brightnessValues.reduce((a, b) => a + b, 0) / brightnessValues.length;
  if (avgBrightness < 75 || avgBrightness > 210) return false;

  const maxB = Math.max(...brightnessValues);
  const minB = Math.min(...brightnessValues);
  return (maxB - minB) <= 38;
}

// ALGORITMO DE FONDO NEUTRO CORREGIDO (Evita Letterboxing al 12% - 88%)
function checkBackgroundNeutrality(imgData, width, height) {
  const sampleRegions = [
    { x: Math.floor(width * 0.12), y: Math.floor(height * 0.12) }, // Superior Izq
    { x: Math.floor(width * 0.88), y: Math.floor(height * 0.12) }, // Superior Der
    { x: Math.floor(width * 0.12), y: Math.floor(height * 0.88) }, // Inferior Izq
    { x: Math.floor(width * 0.88), y: Math.floor(height * 0.88) }  // Inferior Der
  ];

  let totalSaturations = [];

  sampleRegions.forEach(pos => {
    const idx = (pos.y * width + pos.x) * 4;
    const r = imgData[idx];
    const g = imgData[idx + 1];
    const b = imgData[idx + 2];

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;
    const saturation = max === 0 ? 0 : (delta / max);

    totalSaturations.push(saturation);
  });

  const avgSaturation = totalSaturations.reduce((a, b) => a + b, 0) / totalSaturations.length;
  return avgSaturation <= 0.25;
}

function updateStatusDot(elementId, isOk) {
  const dot = document.getElementById(elementId);
  if (!dot) return;
  dot.className = isOk 
    ? "w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"
    : "w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]";
}

document.addEventListener('DOMContentLoaded', () => {
  initCamera();
});
