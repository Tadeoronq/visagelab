// js/biometrics.js - Módulo de Malla Facial y 25 Puntos Biométricos Morfológicos

const BiometricsModule = {
  landmarks: null,
  metrics: {},

  init(results, canvasCtx) {
    if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) return;
    
    this.landmarks = results.multiFaceLandmarks[0];
    this.drawMesh(canvasCtx);
    this.calculate25Points();
    this.updateUI();
  },

  // 1. DIBUJO DE LA MALLA EN VIVO SOBRE EL CANVAS
  drawMesh(ctx) {
    if (!this.landmarks) return;

    // Teseledo general de la cara (red secundaria)
    if (typeof drawConnectors !== 'undefined' && typeof FACEMESH_TESSELATION !== 'undefined') {
      drawConnectors(ctx, this.landmarks, FACEMESH_TESSELATION, { color: 'rgba(255, 255, 255, 0.15)', lineWidth: 0.8 });
    }

    // Contorno facial
    if (typeof FACEMESH_FACE_OVAL !== 'undefined') {
      drawConnectors(ctx, this.landmarks, FACEMESH_FACE_OVAL, { color: '#818CF8', lineWidth: 1.5 });
    }

    // Ojos y Cejas
    if (typeof FACEMESH_RIGHT_EYE !== 'undefined') {
      drawConnectors(ctx, this.landmarks, FACEMESH_RIGHT_EYE, { color: '#38BDF8', lineWidth: 1.5 });
      drawConnectors(ctx, this.landmarks, FACEMESH_LEFT_EYE, { color: '#38BDF8', lineWidth: 1.5 });
      drawConnectors(ctx, this.landmarks, FACEMESH_RIGHT_EYEBROW, { color: '#C084FC', lineWidth: 1.5 });
      drawConnectors(ctx, this.landmarks, FACEMESH_LEFT_EYEBROW, { color: '#C084FC', lineWidth: 1.5 });
    }

    // Labios y Nariz
    if (typeof FACEMESH_LIPS !== 'undefined') {
      drawConnectors(ctx, this.landmarks, FACEMESH_LIPS, { color: '#FB7185', lineWidth: 1.5 });
    }

    // Resaltar los 25 Puntos Clave
    this.drawKeyPoints(ctx);
  },

  // 2. DIBUJO DE LOS 25 PUNTOS ANATÓMICOS CLAVE
  drawKeyPoints(ctx) {
    const keyIndices = [
      10,  // 1. Trichion (Frente superior)
      151, // 2. Glabela
      1,   // 3. Pronasal (Punta de la nariz)
      2,   // 4. Subnasal
      13,  // 5. Labial superior
      14,  // 6. Labial inferior
      152, // 7. Mentón / Gnathion
      234, // 8. Cigomático derecho
      454, // 9. Cigomático izquierdo
      172, // 10. Gonión / Mandíbula derecha
      397, // 11. Gonión / Mandíbula izquierda
      33,  // 12. Canto externo ojo derecho
      133, // 13. Canto interno ojo derecho
      362, // 14. Canto interno ojo izquierdo
      263, // 15. Canto externo ojo izquierdo
      70,  // 16. Arco ceja derecha
      300, // 17. Arco ceja izquierda
      61,  // 18. Comisura labial derecha
      291, // 19. Comisura labial izquierda
      129, // 20. Ala nasal derecha
      358, // 21. Ala nasal izquierda
      168, // 22. Puente nasal alto
      197, // 23. Puente nasal medio
      58,  // 24. Pómulo interno derecho
      288  // 25. Pómulo interno izquierdo
    ];

    keyIndices.forEach((index) => {
      const pt = this.landmarks[index];
      if (pt) {
        ctx.beginPath();
        ctx.arc(pt.x * ctx.canvas.width, pt.y * ctx.canvas.height, 3, 0, 2 * Math.PI);
        ctx.fillStyle = '#FACC15'; // Puntos amarillos de alta visibilidad
        ctx.fill();
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
    });
  },

  // 3. CÁLCULO DE DISTANCIAS Y PROPORCIONES MORFOLÓGICAS
  calculate25Points() {
    const lm = this.landmarks;
    if (!lm) return;

    // Helper para distancia euclidiana entre 2 puntos
    const dist = (p1, p2) => Math.hypot(p1.x - p2.x, p1.y - p2.y, p1.z - p2.z);

    // Puntos principales
    const trichion = lm[10];
    const glabella = lm[151];
    const subnasale = lm[2];
    const menton = lm[152];

    // Tercios Faciales (Verticales)
    const upperThird = dist(trichion, glabella);
    const middleThird = dist(glabella, subnasale);
    const lowerThird = dist(subnasale, menton);
    const totalHeight = upperThird + middleThird + lowerThird;

    // Quintos Faciales (Horizontales)
    const faceWidth = dist(lm[234], lm[454]);
    const rightEyeWidth = dist(lm[33], lm[133]);
    const leftEyeWidth = dist(lm[362], lm[263]);
    const intercanthalWidth = dist(lm[133], lm[362]);

    // Ancho Nasal y Bucal
    const noseWidth = dist(lm[129], lm[358]);
    const mouthWidth = dist(lm[61], lm[291]);

    // Guardar métricas normalizadas
    this.metrics = {
      tercioSuperior: ((upperThird / totalHeight) * 100).toFixed(1),
      tercioMedio: ((middleThird / totalHeight) * 100).toFixed(1),
      tercioInferior: ((lowerThird / totalHeight) * 100).toFixed(1),
      relacionAnchoAlto: (faceWidth / totalHeight).toFixed(2),
      anchoNasalVsOcular: (noseWidth / intercanthalWidth).toFixed(2),
      anchoBocaVsOjos: (mouthWidth / faceWidth).toFixed(2),
      puntosDetectados: 25
    };
  },

  // 4. ACTUALIZACIÓN DE LA INTERFAZ DE USUARIO
  updateUI() {
    const panel = document.getElementById('biometrics-data');
    if (!panel || !this.metrics.tercioSuperior) return;

    panel.innerHTML = `
      <div class="flex justify-between items-center border-b border-gray-800 pb-2">
        <span>Estado Malla:</span>
        <span class="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-medium border border-emerald-500/20">En Vivo</span>
      </div>
      <div class="flex justify-between items-center">
        <span>Puntos Rastreados:</span>
        <strong class="text-yellow-400">${this.metrics.puntosDetectados} / 25</strong>
      </div>
      <div class="pt-2 border-t border-gray-800">
        <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Tercios Faciales</p>
        <div class="space-y-1 text-xs">
          <div class="flex justify-between"><span>Superior (Frente):</span> <strong>${this.metrics.tercioSuperior}%</strong></div>
          <div class="flex justify-between"><span>Medio (Nariz):</span> <strong>${this.metrics.tercioMedio}%</strong></div>
          <div class="flex justify-between"><span>Inferior (Mentón):</span> <strong>${this.metrics.tercioInferior}%</strong></div>
        </div>
      </div>
      <div class="pt-2 border-t border-gray-800 text-xs space-y-1">
        <div class="flex justify-between"><span>Proporción Rostro (Ancho/Alto):</span> <strong>${this.metrics.relacionAnchoAlto}</strong></div>
        <div class="flex justify-between"><span>Simetría Naso-Intercantal:</span> <strong>${this.metrics.anchoNasalVsOcular}</strong></div>
      </div>
    `;
  }
};