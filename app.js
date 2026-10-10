// app.js - Gestión de Interfaz, Capturas Multiángulo Nativas y Bloqueo de PDF

window.capturedPhotos = [];

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

function toggleCaptureButton(isQualityOk) {
  const btnCapture = document.getElementById('btnCapture');
  if (!btnCapture) return;

  if (isQualityOk) {
    btnCapture.disabled = false;
    btnCapture.classList.remove('opacity-40', 'cursor-not-allowed', 'bg-slate-700');
    btnCapture.classList.add('bg-emerald-600', 'hover:bg-emerald-500', 'shadow-emerald-900/30');
  } else {
    btnCapture.disabled = true;
    btnCapture.classList.add('opacity-40', 'cursor-not-allowed', 'bg-slate-700');
    btnCapture.classList.remove('bg-emerald-600', 'hover:bg-emerald-500', 'shadow-emerald-900/30');
  }
}

function getSelectedMode() {
  return document.querySelector('input[name="analysisMode"]:checked')?.value || 'express';
}

function updateCaptureUI() {
  const mode = getSelectedMode();
  const steps = CAPTURE_MODES[mode];
  const btnExport = document.getElementById('btnExportPDF');
  const stepText = document.getElementById('captureStepText');

  const totalRequired = steps.length;
  const currentCount = window.capturedPhotos.length;

  if (currentCount < totalRequired) {
    if (stepText) stepText.innerText = steps[currentCount].name;
    if (btnExport) {
      btnExport.disabled = true;
      btnExport.classList.add('opacity-50', 'cursor-not-allowed');
    }
  } else {
    if (stepText) stepText.innerText = "¡Capturas Completadas!";
    if (btnExport) {
      btnExport.disabled = false;
      btnExport.classList.remove('opacity-50', 'cursor-not-allowed');
    }
  }
}

document.querySelectorAll('input[name="analysisMode"]').forEach(radio => {
  radio.addEventListener('change', () => {
    window.capturedPhotos = [];
    updateCaptureUI();
  });
});

// CAPTURA FOTOGRÁFICA EN RESOLUCIÓN NATIVA PURA (Evita deformaciones por CSS / Letterboxing)
const btnCapture = document.getElementById('btnCapture');
if (btnCapture) {
  btnCapture.addEventListener('click', () => {
    const videoElement = document.getElementById('webcam');
    const mode = getSelectedMode();
    const steps = CAPTURE_MODES[mode];

    if (videoElement && window.capturedPhotos.length < steps.length) {
      // Crear canvas temporal con las dimensiones físicas reales del sensor de la cámara
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = videoElement.videoWidth || 1280;
      tempCanvas.height = videoElement.videoHeight || 720;
      
      const tempCtx = tempCanvas.getContext('2d');
      tempCtx.drawImage(videoElement, 0, 0, tempCanvas.width, tempCanvas.height);
      
      // Extraer datos limpios con calidad clínica (0.95)
      const cleanPhotoData = tempCanvas.toDataURL('image/jpeg', 0.95);
      const angleInfo = steps[window.capturedPhotos.length];

      window.capturedPhotos.push({
        label: angleInfo.name,
        id: angleInfo.id,
        image: cleanPhotoData
      });

      updateCaptureUI();
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  updateCaptureUI();
});
