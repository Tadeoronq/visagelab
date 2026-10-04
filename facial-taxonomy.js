// facial-traits.js - Módulo de Evaluación Biométrica y Morfopsicológica Mapeado con Taxonomía

const FacialTraitsModule = {
  traitsData: null,

  analyze(landmarks, canvasWidth, canvasHeight, gender = 'male') {
    if (!landmarks || landmarks.length < 468) return;
    if (typeof FacialTaxonomy === 'undefined') {
      console.error("Error: FacialTaxonomy no está cargado.");
      return;
    }

    // Convertidor de coordenadas 3D
    const getPt = (idx) => ({
      x: landmarks[idx].x * canvasWidth,
      y: landmarks[idx].y * canvasHeight,
      z: (landmarks[idx].z || 0) * canvasWidth
    });

    const dist2D = (p1, p2) => Math.hypot(p1.x - p2.x, p1.y - p2.y);
    const angle3D = (p1, p2, p3) => {
      const a = dist2D(p2, p3), b = dist2D(p1, p3), c = dist2D(p1, p2);
      if (a === 0 || c === 0) return 0;
      const cosVal = Math.max(-1, Math.min(1, (a * a + c * c - b * b) / (2 * a * c)));
      return Math.acos(cosVal) * (180 / Math.PI);
    };

    // PUNTOS Y LANDMARKS FACIALES CLAVE (MediaPipe Mesh)
    const topHead = getPt(10);
    const glabella = getPt(9);
    const chin = getPt(152);
    const leftCheek = getPt(234);
    const rightCheek = getPt(454);
    const leftJaw = getPt(58);
    const rightJaw = getPt(288);
    const noseBridge = getPt(168);
    const noseTip = getPt(1);
    const subnasale = getPt(2);
    const upperLipTop = getPt(0);
    const lowerLipBottom = getPt(17);
    const mouthLeft = getPt(61);
    const mouthRight = getPt(291);

    const eyeLeftOuter = getPt(33);
    const eyeLeftInner = getPt(133);
    const eyeRightInner = getPt(362);
    const eyeRightOuter = getPt(263);

    const eyebrowLeftInner = getPt(107);
    const eyebrowRightInner = getPt(336);

    const earLeft = getPt(234);
    const earRight = getPt(454);

    // MEDIDAS BASE
    const faceLength = dist2D(topHead, chin);
    const faceWidth = dist2D(leftCheek, rightCheek);
    const jawWidth = dist2D(leftJaw, rightJaw);
    const interocularDist = dist2D(eyeLeftInner, eyeRightInner);
    const eyeWidthAvg = (dist2D(eyeLeftOuter, eyeLeftInner) + dist2D(eyeRightOuter, eyeRightInner)) / 2;

    const evaluatedTraits = [];

    // 1. FORMA DEL ROSTRO
    const ratioLW = faceLength / (faceWidth || 1);
    let faceShapeVal = "";
    if (gender === 'female') {
      if (ratioLW > 1.45) faceShapeVal = FacialTaxonomy.faceShapeFemale[4]; // Rectangular / Alargada
      else if (ratioLW < 1.25) faceShapeVal = jawWidth > faceWidth * 0.85 ? FacialTaxonomy.faceShapeFemale[5] : FacialTaxonomy.faceShapeFemale[3]; // Cuadrada Femenina / Redonda
      else if (jawWidth > faceWidth * 0.82) faceShapeVal = FacialTaxonomy.faceShapeFemale[5];
      else if (faceWidth > jawWidth * 1.28) faceShapeVal = FacialTaxonomy.faceShapeFemale[1]; // Corazón
      else faceShapeVal = FacialTaxonomy.faceShapeFemale[0]; // Ovalada
    } else {
      if (ratioLW > 1.45) faceShapeVal = FacialTaxonomy.faceShapeMale[3]; // Rectangular
      else if (ratioLW < 1.22) faceShapeVal = jawWidth > faceWidth * 0.85 ? FacialTaxonomy.faceShapeMale[2] : FacialTaxonomy.faceShapeMale[6]; // Cuadrada / Redonda
      else if (faceWidth > jawWidth * 1.3) faceShapeVal = FacialTaxonomy.faceShapeMale[0]; // Diamante
      else faceShapeVal = FacialTaxonomy.faceShapeMale[1]; // Ovalada
    }
    evaluatedTraits.push({ category: "Forma del Rostro", value: faceShapeVal });

    // 2. INCLINACIÓN DE LA FRENTE
    const frontoSlopeDeg = angle3D(topHead, glabella, noseBridge);
    let foreheadVal = "";
    if (gender === 'female') {
      if (frontoSlopeDeg > 88) foreheadVal = FacialTaxonomy.foreheadSlopeFemale[0]; // Verticalidad Redondeada
      else if (frontoSlopeDeg > 84) foreheadVal = FacialTaxonomy.foreheadSlopeFemale[1]; // Prominencia Neoténica
      else if (frontoSlopeDeg > 80) foreheadVal = FacialTaxonomy.foreheadSlopeFemale[3]; // Inclinación Suave
      else foreheadVal = FacialTaxonomy.foreheadSlopeFemale[4]; // Masculinizada
    } else {
      if (frontoSlopeDeg >= 85) foreheadVal = FacialTaxonomy.foreheadSlopeMale[0]; // Verticalidad Apex
      else if (frontoSlopeDeg >= 80) foreheadVal = FacialTaxonomy.foreheadSlopeMale[1]; // Inclinación Masculina Definida
      else if (frontoSlopeDeg >= 70) foreheadVal = FacialTaxonomy.foreheadSlopeMale[2]; // Pendiente Primitiva
      else foreheadVal = FacialTaxonomy.foreheadSlopeMale[3]; // Prominencia Convexa
    }
    evaluatedTraits.push({ category: "Inclinación de la Frente", value: foreheadVal });

    // 3. ARCO SUPERCILIAR
    const browZDiff = glabella.z - getPt(105).z;
    let browRidgeVal = "";
    if (gender === 'female') {
      if (browZDiff < 2) browRidgeVal = FacialTaxonomy.browRidgeFemale[0]; // Convexidad Lisa
      else if (browZDiff < 5) browRidgeVal = FacialTaxonomy.browRidgeFemale[1]; // Transición Suave Femenina
      else browRidgeVal = FacialTaxonomy.browRidgeFemale[4]; // Relieve Óseo Masculinizado
    } else {
      if (browZDiff > 8) browRidgeVal = FacialTaxonomy.browRidgeMale[0]; // Prominencia Masculina Dominante
      else if (browZDiff > 5) browRidgeVal = FacialTaxonomy.browRidgeMale[1]; // Proyección Definida
      else if (browZDiff > 2) browRidgeVal = FacialTaxonomy.browRidgeMale[2]; // Estructura Armónica
      else browRidgeVal = FacialTaxonomy.browRidgeMale[5]; // Deficiencia
    }
    evaluatedTraits.push({ category: "Arco Superciliar", value: browRidgeVal });

    // 4. FORMA E INCLINACIÓN DE OJOS
    const eyeTiltDeg = ((eyeLeftInner.y - eyeLeftOuter.y) / (eyeWidthAvg || 1)) * 10;
    let eyeTiltVal = "";
    if (eyeTiltDeg > 5) eyeTiltVal = FacialTaxonomy.eyeTilt[0]; // Positive Marcada
    else if (eyeTiltDeg >= 2) eyeTiltVal = FacialTaxonomy.eyeTilt[1]; // Positive Sutil
    else if (eyeTiltDeg >= -1) eyeTiltVal = FacialTaxonomy.eyeTilt[2]; // Neutral
    else if (eyeTiltDeg >= -3) eyeTiltVal = FacialTaxonomy.eyeTilt[3]; // Negativa Leve
    else eyeTiltVal = FacialTaxonomy.eyeTilt[4]; // Negativa Moderada
    evaluatedTraits.push({ category: "Inclinación de los Ojos", value: eyeTiltVal });

    // 5. PROFUNDIDAD DEL OJO
    const eyeDepthZ = (eyeLeftInner.z + eyeRightInner.z) / 2 - noseBridge.z;
    let eyeDepthVal = "";
    if (eyeDepthZ < -12) eyeDepthVal = FacialTaxonomy.eyeDepth[0]; // Profundidad Extrema
    else if (eyeDepthZ < -8) eyeDepthVal = FacialTaxonomy.eyeDepth[1]; // Profundidad Marcada
    else if (eyeDepthZ < -3) eyeDepthVal = FacialTaxonomy.eyeDepth[2]; // Profundidad Estándar
    else if (eyeDepthZ <= 2) eyeDepthVal = FacialTaxonomy.eyeDepth[3]; // Nivel Neutro
    else eyeDepthVal = FacialTaxonomy.eyeDepth[5]; // Proyección Ocular
    evaluatedTraits.push({ category: "Profundidad del Ojo", value: eyeDepthVal });

    // 6. ANCHO Y ÁNGULO NASOLABIAL
    const noseWidth = dist2D(getPt(129), getPt(358));
    let nasolabialVal = "";
    const nasoAngle = angle3D(noseBridge, subnasale, upperLipTop);
    if (nasoAngle >= 96) nasolabialVal = FacialTaxonomy.nasolabialAngle[1]; // Respingada Estética
    else if (nasoAngle >= 90) nasolabialVal = FacialTaxonomy.nasolabialAngle[0]; // Ángulo Marcial Apex
    else if (nasoAngle >= 80) nasolabialVal = FacialTaxonomy.nasolabialAngle[2]; // Caído Aquilino
    else nasolabialVal = FacialTaxonomy.nasolabialAngle[4]; // Colapso Nasolabial
    evaluatedTraits.push({ category: "Ángulo Nasolabial", value: nasolabialVal });

    // 7. GROSOR DE LABIOS
    const lipHeight = dist2D(upperLipTop, lowerLipBottom);
    const lipRatio = lipHeight / (dist2D(mouthLeft, mouthRight) || 1);
    let lipThicknessVal = "";
    if (lipRatio > 0.45) lipThicknessVal = FacialTaxonomy.lipThickness[3]; // Gruesos Dominantes
    else if (lipRatio > 0.35) lipThicknessVal = FacialTaxonomy.lipThickness[1]; // Llenos Simétricos
    else if (lipRatio > 0.25) lipThicknessVal = FacialTaxonomy.lipThickness[0]; // Proporcionado
    else lipThicknessVal = FacialTaxonomy.lipThickness[5]; // Muy Finos
    evaluatedTraits.push({ category: "Grosor de los Labios", value: lipThicknessVal });

    // 8. FORMA DE MANDÍBULA
    let jawShapeVal = "";
    if (gender === 'female') {
      if (jawWidth < faceWidth * 0.72) jawShapeVal = FacialTaxonomy.jawShapeFemale[0]; // V-Line de Élite
      else if (jawWidth < faceWidth * 0.78) jawShapeVal = FacialTaxonomy.jawShapeFemale[2]; // Ovalada Clásica
      else if (jawWidth < faceWidth * 0.84) jawShapeVal = FacialTaxonomy.jawShapeFemale[3]; // Estructurada Femenina
      else jawShapeVal = FacialTaxonomy.jawShapeFemale[5]; // Cuadrada Femenina
    } else {
      if (jawWidth > faceWidth * 0.85) jawShapeVal = FacialTaxonomy.jawShapeMale[0]; // Cuadrada y Angulada
      else if (jawWidth > faceWidth * 0.78) jawShapeVal = FacialTaxonomy.jawShapeMale[3]; // Estructurada
      else jawShapeVal = FacialTaxonomy.jawShapeMale[1]; // Mandíbula de V Marcada
    }
    evaluatedTraits.push({ category: "Forma de la Mandíbula", value: jawShapeVal });

    // 9. PROMINENCIA Y POSICIÓN DE PÓMULOS
    const cheekRatio = faceWidth / (jawWidth || 1);
    let cheekboneVal = "";
    if (cheekRatio > 1.32) cheekboneVal = FacialTaxonomy.cheekboneProminence[0]; // Pómulos Altos y Prominentes
    else if (cheekRatio > 1.25) cheekboneVal = FacialTaxonomy.cheekboneProminence[1]; // Anchos Proyectados
    else if (cheekRatio > 1.18) cheekboneVal = FacialTaxonomy.cheekboneProminence[2]; // Soporte Suave
    else cheekboneVal = FacialTaxonomy.cheekboneProminence[3]; // Aplanamiento Cigomático
    evaluatedTraits.push({ category: "Pómulos (Cigomático)", value: cheekboneVal });

    // 10. REGLA DE LOS QUINTOS (ANCHO FACIAL)
    const fifthRatio = faceWidth / (eyeWidthAvg * 5 || 1);
    let fifthsVal = "";
    if (fifthRatio >= 0.95 && fifthRatio <= 1.05) fifthsVal = FacialTaxonomy.fifthProportion[0]; // Regla de los Quintos Exacta
    else if (fifthRatio < 0.95) fifthsVal = FacialTaxonomy.fifthProportion[1]; // Quintos Compactos
    else fifthsVal = FacialTaxonomy.fifthProportion[2]; // Quintos Expandidos
    evaluatedTraits.push({ category: "Proporción de Quintos", value: fifthsVal });

    // 11. SIMETRÍA BILATERAL
    const distL = dist2D(leftCheek, noseTip);
    const distR = dist2D(rightCheek, noseTip);
    const symmDiff = Math.abs(distL - distR) / (faceWidth || 1);
    let symmetryVal = "";
    if (symmDiff < 0.02) symmetryVal = FacialTaxonomy.facialSymmetry[0]; // Simetría Craneofacial Áurea
    else if (symmDiff < 0.05) symmetryVal = FacialTaxonomy.facialSymmetry[1]; // Asimetría Funcional
    else symmetryVal = FacialTaxonomy.facialSymmetry[2]; // Asimetría Estructural
    evaluatedTraits.push({ category: "Simetría Facial", value: symmetryVal });

    // 12. ARQUETIPO Y REGLA DE LOS TERCIOS
    const upperT = dist2D(topHead, eyebrowLeftInner);
    const middleT = dist2D(eyebrowLeftInner, subnasale);
    const lowerT = dist2D(subnasale, chin);
    const totalT = upperT + middleT + lowerT || 1;
    const uPct = Math.round((upperT / totalT) * 100);
    const mPct = Math.round((middleT / totalT) * 100);
    const lPct = Math.round((lowerT / totalT) * 100);
    evaluatedTraits.push({ category: "Tercios Faciales", value: `${uPct}% - ${mPct}% - ${lPct}%` });

    this.traitsData = evaluatedTraits;
    this.updateUI();
  },

  // Renderizado en el panel de interfaz
  updateUI() {
    const container = document.getElementById('traits-list');
    if (!container || !this.traitsData) return;

    container.innerHTML = this.traitsData.map((item, idx) => `
      <div class="flex justify-between items-center py-1.5 border-b border-gray-800 text-xs">
        <span class="text-gray-400 font-medium">${idx + 1}. ${item.category}:</span>
        <span class="text-amber-300 font-semibold text-right pl-2">${item.value}</span>
      </div>
    `).join('');
  }
};