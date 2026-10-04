// main.js - Coordinación de Capturas Multiángulo, Bloqueo de PDF y Gestión de Cámaras

let currentStream = null;
const videoElement = document.getElementById('webcam');
const canvasElement = document.getElementById('output_canvas');
const canvasCtx = canvasElement.getContext('2d', { willReadFrequently: true });
const cameraSelect = document.getElementById('cameraSelect');

// Estado Global de Capturas
window.capturedPhotos = []; 
let currentPhotoIndex = 0;

// Configuración de ángulos según el modo de análisis
const CAPTURE_MODES = {
  express: [
    { id: 'frontal', name: 'Foto 1: Frontal' },
    { id: 'perfil', name: 'Foto 2: Perfil' }
  ],
  full: [
    { id: 'frontal', name: 'Foto 1: Frontal' },
    { id: '34_derecho', name: 'Foto 2: 3/4 Derecho' },
    { id: 'perfil_derecho', name: 'Foto 3: Perfil Derecho' },
    { id: '34_izquierdo', name: 'Foto 4: 3/4 Izquierdo' },
    { id: 'perfil_izquierdo', name: 'Foto 5: Perfil Izquierdo' },
    { id: 'picado', name: 'Foto 6: Ángulo Dinámico / Zenith' }
  ]
};

// 1. CONFIGURACIÓN DE MEDIAPIPE FACE MESH
const faceMesh = new FaceMesh({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
});

faceMesh.setOptions({
  maxNumFaces: 1,
  refineLandmarks: true,
  minDetectionConfidence: 0.6,
  minTrackingConfidence: 0.6
});

// 2. DETECCIÓN Y SELECCIÓN DE CÁMARAS
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
    console.error("Error al enumerar cámaras:", err);
  }
}

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

// 3. PROCESAMIENTO CONTINUO DE VIDEO
async function processVideoFrame() {
  if (videoElement.paused || videoElement.ended) return;

  canvasElement.width = videoElement.videoWidth || 640;
  canvasElement.height = videoElement.videoHeight || 480;

  await faceMesh.send({ image: videoElement });
  requestAnimationFrame(processVideoFrame);
}

// 4. BUCLE DE DIAGNÓSTICO Y RASTREO FACIAL
faceMesh.onResults((results) => {
  canvasCtx.save();
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
  canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

  if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
    const landmarks = results.multiFaceLandmarks[0];
    const selectedGender = document.querySelector('input[name="genderSelect"]:checked')?.value || 'male';

    if (typeof BiometricsModule !== 'undefined') BiometricsModule.init(results, canvasCtx);
    if (typeof ColorimetryModule !== 'undefined') ColorimetryModule.analyze(canvasElement, landmarks);
    if (typeof FacialTraitsModule !== 'undefined') {
      FacialTraitsModule.analyze(landmarks, canvasElement.width, canvasElement.height, selectedGender);
    }

    evaluateQualitySemaforo(canvasElement, canvasCtx, landmarks);
  }
  canvasCtx.restore();
});

// 5. EVALUACIÓN DEL SEMÁFORO DE CALIDAD
function evaluateQualitySemaforo(canvas, ctx, landmarks) {
  const eyeL = landmarks[33];
  const eyeR = landmarks[263];
  const tiltAngle = Math.abs((eyeL.y - eyeR.y) * 100);
  const isPoseOk = tiltAngle < 2.5;
  updateStatusDot('dot-pose', isPoseOk);

  try {
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let totalBrightness = 0;
    const step = 20;

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
  } catch (e) {}
}

function updateStatusDot(elementId, isOk) {
  const dot = document.getElementById(elementId);
  if (!dot) return;
  dot.className = isOk 
    ? "w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"
    : "w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]";
}

// 6. GESTIÓN DE CAPTURAS Y CONTROL DE EXPORTACIÓN
function getSelectedMode() {
  return document.querySelector('input[name="analysisMode"]:checked')?.value || 'express';
}

function updateCaptureUI() {
  const mode = getSelectedMode();
  const steps = CAPTURE_MODES[mode];
  const btnCapture = document.getElementById('btnCapture');
  const btnExport = document.getElementById('btnExportPDF');
  const stepText = document.getElementById('captureStepText');

  const totalRequired = steps.length;
  const currentCount = window.capturedPhotos.length;

  if (currentCount < totalRequired) {
    if (stepText) stepText.innerText = steps[currentCount].name;
    if (btnExport) {
      btnExport.disabled = true;
      btnExport.classList.add('opacity-50', 'cursor-not-allowed');
      btnExport.title = `Captura las ${totalRequired} fotos requeridas para habilitar la exportación (${currentCount}/${totalRequired}).`;
    }
    if (btnCapture) btnCapture.classList.remove('hidden');
  } else {
    if (stepText) stepText.innerText = "¡Capturas Completadas!";
    if (btnExport) {
      btnExport.disabled = false;
      btnExport.classList.remove('opacity-50', 'cursor-not-allowed');
      btnExport.title = "Exportar Expediente PDF Completo";
    }
  }
}

// Reiniciar fotos al cambiar de modo
document.querySelectorAll('input[name="analysisMode"]').forEach(radio => {
  radio.addEventListener('change', () => {
    window.capturedPhotos = [];
    currentPhotoIndex = 0;
    updateCaptureUI();
  });
});

// Evento del botón de captura
const btnCapture = document.getElementById('btnCapture');
if (btnCapture) {
  btnCapture.addEventListener('click', () => {
    const mode = getSelectedMode();
    const steps = CAPTURE_MODES[mode];

    if (window.capturedPhotos.length < steps.length) {
      const photoData = canvasElement.toDataURL('image/jpeg', 0.9);
      const angleInfo = steps[window.capturedPhotos.length];

      window.capturedPhotos.push({
        label: angleInfo.name,
        id: angleInfo.id,
        image: photoData
      });

      updateCaptureUI();
    }
  });
}

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
  getConnectedCameras();
  updateCaptureUI();
});
