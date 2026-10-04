// main.js - Coordinador Principal, Selector Multicámara y Semáforo de Calidad

let currentStream = null;
const videoElement = document.getElementById('webcam');
const canvasElement = document.getElementById('output_canvas');
const canvasCtx = canvasElement.getContext('2d', { willReadFrequently: true });
const cameraSelect = document.getElementById('cameraSelect');

// Configuración MediaPipe FaceMesh
const faceMesh = new FaceMesh({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
});

faceMesh.setOptions({
  maxNumFaces: 1,
  refineLandmarks: true,
  minDetectionConfidence: 0.6,
  minTrackingConfidence: 0.6
});

// 1. DETECCIÓN MULTICÁMARA (Frontal, Trasera, USB)
async function getConnectedCameras() {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter(device => device.kind === 'videoinput');

    cameraSelect.innerHTML = '';
    videoDevices.forEach((device, index) => {
      const option = document.createElement('option');
      option.value = device.deviceId;
      option.text = device.label || `Cámara ${index + 1} (${device.deviceId.slice(0, 5)}...)`;
      cameraSelect.appendChild(option);
    });

    if (videoDevices.length > 0) {
      startCameraStream(videoDevices[0].deviceId);
    }
  } catch (err) {
    console.error("Error enumerando cámaras:", err);
  }
}

// 2. INICIAR STREAM DE CÁMARA SELECCIONADA
async function startCameraStream(deviceId) {
  if (currentStream) {
    currentStream.getTracks().forEach(track => track.stop());
  }

  const constraints = {
    video: deviceId ? { deviceId: { exact: deviceId }, width: 1280, height: 720 } : { facingMode: 'user' }
  };

  try {
    currentStream = await navigator.mediaDevices.getUserMedia(constraints);
    videoElement.srcObject = currentStream;
    videoElement.onloadedmetadata = () => {
      videoElement.play();
      processVideoFrame();
    };
  } catch (e) {
    console.error("Error al iniciar cámara:", e);
  }
}

cameraSelect.addEventListener('change', (e) => {
  if (e.target.value) startCameraStream(e.target.value);
});

// 3. PROCESAMIENTO FRAME A FRAME
async function processVideoFrame() {
  if (videoElement.paused || videoElement.ended) return;

  canvasElement.width = videoElement.videoWidth || 640;
  canvasElement.height = videoElement.videoHeight || 480;

  await faceMesh.send({ image: videoElement });
  requestAnimationFrame(processVideoFrame);
}

// 4. MESH Y EVALUACIÓN DEL SEMÁFORO DE CALIDAD EN TIEMPO REAL
faceMesh.onResults((results) => {
  canvasCtx.save();
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
  canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

  if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
    const landmarks = results.multiFaceLandmarks[0];

    // Ejecutar Módulos
    if (typeof BiometricsModule !== 'undefined') BiometricsModule.init(results, canvasCtx);
    if (typeof ColorimetryModule !== 'undefined') ColorimetryModule.analyze(canvasElement, landmarks);
    if (typeof FacialTraitsModule !== 'undefined') FacialTraitsModule.analyze(landmarks, canvasElement.width, canvasElement.height);

    // Evaluar Semáforo de Calidad
    evaluateQualitySemaforo(canvasElement, canvasCtx, landmarks);
  }
  canvasCtx.restore();
});

// 5. EVALUACIÓN DEL SEMÁFORO (Luz, Contraste, Inclinación)
function evaluateQualitySemaforo(canvas, ctx, landmarks) {
  // A. Inclinación de Cabeza
  const eyeL = landmarks[33];
  const eyeR = landmarks[263];
  const tiltAngle = Math.abs((eyeL.y - eyeR.y) * 100);
  const isPoseOk = tiltAngle < 2.5;
  updateStatusDot('dot-pose', isPoseOk);

  // B. Muestreo de Iluminación y Nitidez
  try {
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let totalBrightness = 0;
    const step = 20; // Muestreo rápido

    for (let i = 0; i < imgData.length; i += 4 * step) {
      totalBrightness += (imgData[i] + imgData[i + 1] + imgData[i + 2]) / 3;
    }

    const avgBrightness = totalBrightness / (imgData.length / (4 * step));
    const isLightOk = avgBrightness > 65 && avgBrightness < 210;
    const isContrastOk = avgBrightness > 40;
    const isQualityOk = isPoseOk && isLightOk;

    updateStatusDot('dot-light', isLightOk);
    updateStatusDot('dot-contrast', isContrastOk);
    updateStatusDot('dot-quality', isQualityOk);

  } catch (e) {
    // Manejo de restricciones de CORS si aplican
  }
}

function updateStatusDot(elementId, isOk) {
  const dot = document.getElementById(elementId);
  if (!dot) return;

  if (isOk) {
    dot.className = "w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]";
  } else {
    dot.className = "w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]";
  }
}

// Inicializar al cargar la página
document.addEventListener('DOMContentLoaded', () => {
  getConnectedCameras();
});
