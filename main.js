// main.js - Semáforo con Filtro Estricto de Sombras, Fondo Neutro y Bloqueo de Captura

// 1. EVALUACIÓN DE CALIDAD CON UMBRALES CLÍNICOS
function evaluateQualitySemaforo(canvas, ctx, landmarks) {
  // A. Inclinación de Cabeza / Pose (Máximo 2° de desviación)
  const eyeL = landmarks[33];
  const eyeR = landmarks[263];
  const tiltAngle = Math.abs((eyeL.y - eyeR.y) * 100);
  const isPoseOk = tiltAngle < 2.0;
  updateStatusDot('dot-pose', isPoseOk);

  try {
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

    // B. Evaluación de Luz Facial y Sombras Cruzadas
    const isLightOk = checkFacialLightingAndShadows(ctx, landmarks, canvas.width, canvas.height);
    updateStatusDot('dot-light', isLightOk);

    // C. Evaluación de Neutralidad de Fondo (Filtro de Muros Coloreados / Saturados)
    const isBackgroundNeutral = checkBackgroundNeutrality(imgData, canvas.width, canvas.height);
    updateStatusDot('dot-contrast', isBackgroundNeutral);

    // D. Calidad Global (Todas las pruebas deben ser positivas)
    const isQualityOk = isPoseOk && isLightOk && isBackgroundNeutral;
    updateStatusDot('dot-quality', isQualityOk);

    // E. Habilitación / Bloqueo dinámico del botón de captura
    toggleCaptureButton(isQualityOk);

  } catch (e) {
    // Si hay restricciones de seguridad en canvas local
  }
}

// 2. ALGORITMO: ANÁLISIS DE SOMBRAS Y SIMETRÍA DE LUZ EN EL ROSTRO
function checkFacialLightingAndShadows(ctx, landmarks, width, height) {
  // Puntos clave: 10 (Frente), 117 (Mejilla Izq), 346 (Mejilla Der), 152 (Mentón)
  const points = [10, 117, 346, 152];
  const brightnessValues = [];

  points.forEach(idx => {
    const pt = landmarks[idx];
    if (pt) {
      const x = Math.floor(pt.x * width);
      const y = Math.floor(pt.y * height);
      const sample = ctx.getImageData(Math.max(0, x - 3), Math.max(0, y - 3), 7, 7).data;
      
      let sum = 0;
      for (let i = 0; i < sample.length; i += 4) {
        sum += (sample[i] * 0.299 + sample[i + 1] * 0.587 + sample[i + 2] * 0.114);
      }
      brightnessValues.push(sum / (sample.length / 4));
    }
  });

  if (brightnessValues.length < 4) return false;

  // Brillo promedio aceptable (entre 80 y 200 en escala 0-255)
  const avgBrightness = brightnessValues.reduce((a, b) => a + b, 0) / brightnessValues.length;
  if (avgBrightness < 80 || avgBrightness > 205) return false;

  // Umbral de Sombras: La diferencia máxima entre cualquier zona de la cara no debe superar los 35 puntos
  const maxB = Math.max(...brightnessValues);
  const minB = Math.min(...brightnessValues);
  const shadowDelta = maxB - minB;

  return shadowDelta <= 35; // Si la diferencia es mayor a 35, hay sombras marcadas
}

// 3. ALGORITMO: ANÁLISIS DE SATURACIÓN DE FONDO (RECHAZO DE MURALES COLORIDOS)
function checkBackgroundNeutrality(imgData, width, height) {
  // Muestreo en las 4 esquinas exteriores del lienzo (área de fondo fuera de la cara)
  const sampleRegions = [
    { x: Math.floor(width * 0.05), y: Math.floor(height * 0.05) }, // Superior Izq
    { x: Math.floor(width * 0.95), y: Math.floor(height * 0.05) }, // Superior Der
    { x: Math.floor(width * 0.05), y: Math.floor(height * 0.95) }, // Inferior Izq
    { x: Math.floor(width * 0.95), y: Math.floor(height * 0.95) }  // Inferior Der
  ];

  let totalSaturations = [];

  sampleRegions.forEach(pos => {
    const idx = (pos.y * width + pos.x) * 4;
    const r = imgData[idx];
    const g = imgData[idx + 1];
    const b = imgData[idx + 2];

    // Convertir RGB a Saturación HSV
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;
    const saturation = max === 0 ? 0 : (delta / max);

    totalSaturations.push(saturation);
  });

  const avgSaturation = totalSaturations.reduce((a, b) => a + b, 0) / totalSaturations.length;

  // Umbral estricto: Si la saturación promedio del fondo supera el 22% (0.22), es un fondo colorido y se rechaza.
  return avgSaturation <= 0.22;
}

// 4. ACTUALIZACIÓN VISUAL Y BLOQUEO DEL BOTÓN DE CAPTURA
function updateStatusDot(elementId, isOk) {
  const dot = document.getElementById(elementId);
  if (!dot) return;
  
  if (isOk) {
    dot.className = "w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]";
  } else {
    dot.className = "w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]";
  }
}

function toggleCaptureButton(isQualityOk) {
  const btnCapture = document.getElementById('btnCapture');
  if (!btnCapture) return;

  if (isQualityOk) {
    btnCapture.disabled = false;
    btnCapture.classList.remove('opacity-40', 'cursor-not-allowed', 'bg-slate-700');
    btnCapture.classList.add('bg-emerald-600', 'hover:bg-emerald-500', 'shadow-emerald-900/30');
    btnCapture.title = "Condiciones óptimas. Haz clic para capturar.";
  } else {
    btnCapture.disabled = true;
    btnCapture.classList.add('opacity-40', 'cursor-not-allowed', 'bg-slate-700');
    btnCapture.classList.remove('bg-emerald-600', 'hover:bg-emerald-500', 'shadow-emerald-900/30');
    btnCapture.title = "Ajusta la iluminación (sin sombras en rostro) y ponte frente a un fondo neutro.";
  }
}
