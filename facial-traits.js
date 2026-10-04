// facial-traits.js - Módulo de Evaluación Biométrica y Morfopsicológica (Escala Normalizada Invariante)

const FacialTraitsModule = {
  traitsData: null,

  analyze(landmarks, canvasWidth, canvasHeight, gender = 'male') {
    if (!landmarks || landmarks.length < 468) return;
    
    // Verificar que el módulo taxonómico esté cargado
    if (typeof FacialTaxonomy === 'undefined') {
      console.error("Error: FacialTaxonomy no está cargado. Asegúrate de incluir facialtaxonomy.js en index.html.");
      return;
    }

    // Helper para convertir coordenadas 3D normalizadas de MediaPipe a píxeles de la cámara
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

    // =========================================================================
    // 1. CONSTANTE DE NORMALIZACIÓN (UNIDAD RELATIVA INVARIANTE AL ZOOM)
    // =========================================================================
    const eyeLeftInner = getPt(133);
    const eyeRightInner = getPt(362);
    
    // Distancia Intercantal Interna (Unidad Base = 1.0)
    const intercanthalUnit = dist2D(eyeLeftInner, eyeRightInner);
    if (intercanthalUnit < 5) return; // Prevenir errores si el rostro está muy lejano

    // Normaliza cualquier distancia respecto a la unidad intercantal
    const normDist = (p1, p2) => dist2D(p1, p2) / intercanthalUnit;

    // =========================================================================
    // 2. LANDMARKS ANATÓMICOS CLAVE
    // =========================================================================
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
    const eyeRightOuter = getPt(263);
    const eyebrowLeftInner = getPt(107);

    // =========================================================================
    // 3. MEDIDAS ADIMENSIONALES Y RATIOS
    // =========================================================================
    const normFaceLength = normDist(topHead, chin);
    const normFaceWidth = normDist(leftCheek, rightCheek);
    const normJawWidth = normDist(leftJaw, rightJaw);
    const normMouthWidth = normDist(mouthLeft, mouthRight);
    const normEyeWidthAvg = (normDist(eyeLeftOuter, eyeLeftInner) + normDist(eyeRightOuter, eyeRightInner)) / 2;

    const ratioLW = normFaceLength / (normFaceWidth || 1);
    const cheekRatio = normFaceWidth / (normJawWidth || 1);
    const fifthRatio = normFaceWidth / (normEyeWidthAvg * 5 || 1);

    const evaluatedTraits = [];

    // 1. FORMA DEL ROSTRO
    let faceShapeVal = "";
    if (gender === 'female') {
      if (ratioLW > 1.45) faceShapeVal = FacialTaxonomy.faceShapeFemale[4]; // Rectangular / Alargada
      else if (ratioLW < 1.25) faceShapeVal = normJawWidth > normFaceWidth * 0.85 ? FacialTaxonomy.faceShapeFemale[5] : FacialTaxonomy.faceShapeFemale[3];
      else if (normJawWidth > normFaceWidth * 0.82) faceShapeVal = FacialTaxonomy.faceShapeFemale[5];
      else if (normFaceWidth > normJawWidth * 1.28) faceShapeVal = FacialTaxonomy.faceShapeFemale[1]; // Corazón
      else faceShapeVal = FacialTaxonomy.faceShapeFemale[0]; // Ovalada
    } else {
      if (ratioLW > 1.45) faceShapeVal = FacialTaxonomy.faceShapeMale[3]; // Rectangular
      else if (ratioLW < 1.22) faceShapeVal = normJawWidth > normFaceWidth * 0.85 ? FacialTaxonomy.faceShapeMale[2] : FacialTaxonomy.faceShapeMale[6];
      else if (normFaceWidth > normJawWidth * 1.3) faceShapeVal = FacialTaxonomy.faceShapeMale[0]; // Diamante
      else faceShapeVal = FacialTaxonomy.faceShapeMale[1]; // Ovalada
    }
    evaluatedTraits.push({ category: "Forma del Rostro", value: faceShapeVal });

    // 2. INCLINACIÓN DE LA FRENTE
    const frontoSlopeDeg = angle3D(topHead, glabella, noseBridge);
    let foreheadVal = "";
    if (gender === 'female') {
      if (frontoSlopeDeg > 88) foreheadVal = FacialTaxonomy.foreheadSlopeFemale[0];
      else if (frontoSlopeDeg > 84) foreheadVal = FacialTaxonomy.foreheadSlopeFemale[1];
      else if (frontoSlopeDeg > 80) foreheadVal = FacialTaxonomy.foreheadSlopeFemale[3];
      else foreheadVal = FacialTaxonomy.foreheadSlopeFemale[4];
    } else {
      if (frontoSlopeDeg >= 85) foreheadVal = FacialTaxonomy.foreheadSlopeMale[0];
      else if (frontoSlopeDeg >= 80) foreheadVal = FacialTaxonomy.foreheadSlopeMale[1];
      else if (frontoSlopeDeg >= 70) foreheadVal = FacialTaxonomy.foreheadSlopeMale[2];
      else foreheadVal = FacialTaxonomy.foreheadSlopeMale[3];
    }
    evaluatedTraits.push({ category: "Inclinación de la Frente", value: foreheadVal });

    // 3. ARCO SUPERCILIAR
    const normBrowZDiff = (glabella.z - getPt(105).z) / intercanthalUnit;
    let browRidgeVal = "";
    if (gender === 'female') {
      if (normBrowZDiff < 0.05) browRidgeVal = FacialTaxonomy.browRidgeFemale[0];
      else if (normBrowZDiff < 0.12) browRidgeVal = FacialTaxonomy.browRidgeFemale[1];
      else browRidgeVal = FacialTaxonomy.browRidgeFemale[4];
    } else {
      if (normBrowZDiff > 0.20) browRidgeVal = FacialTaxonomy.browRidgeMale[0];
      else if (normBrowZDiff > 0.12) browRidgeVal = FacialTaxonomy.browRidgeMale[1];
      else if (normBrowZDiff > 0.05) browRidgeVal = FacialTaxonomy.browRidgeMale[2];
      else browRidgeVal = FacialTaxonomy.browRidgeMale[5];
    }
    evaluatedTraits.push({ category: "Arco Superciliar", value: browRidgeVal });

    // 4. INCLINACIÓN DE LOS OJOS
    const eyeTiltDeg = ((eyeLeftInner.y - eyeLeftOuter.y) / (normEyeWidthAvg * intercanthalUnit || 1)) * 10;
    let eyeTiltVal = "";
    if (eyeTiltDeg > 5) eyeTiltVal = FacialTaxonomy.eyeTilt[0];
    else if (eyeTiltDeg >= 2) eyeTiltVal = FacialTaxonomy.eyeTilt[1];
    else if (eyeTiltDeg >= -1) eyeTiltVal = FacialTaxonomy.eyeTilt[2];
    else if (eyeTiltDeg >= -3) eyeTiltVal = FacialTaxonomy.eyeTilt[3];
    else eyeTiltVal = FacialTaxonomy.eyeTilt[4];
    evaluatedTraits.push({ category: "Inclinación de los Ojos", value: eyeTiltVal });

    // 5. PROFUNDIDAD DEL OJO
    const normEyeDepthZ = (((eyeLeftInner.z + eyeRightInner.z) / 2) - noseBridge.z) / intercanthalUnit;
    let eyeDepthVal = "";
    if (normEyeDepthZ < -0.30) eyeDepthVal = FacialTaxonomy.eyeDepth[0];
    else if (normEyeDepthZ < -0.20) eyeDepthVal = FacialTaxonomy.eyeDepth[1];
    else if (normEyeDepthZ < -0.08) eyeDepthVal = FacialTaxonomy.eyeDepth[2];
    else if (normEyeDepthZ <= 0.05) eyeDepthVal = FacialTaxonomy.eyeDepth[3];
    else eyeDepthVal = FacialTaxonomy.eyeDepth[5];
    evaluatedTraits.push({ category: "Profundidad del Ojo", value: eyeDepthVal });

    // 6. ÁNGULO NASOLABIAL
    const nasoAngle = angle3D(noseBridge, subnasale, upperLipTop);
    let nasolabialVal = "";
    if (nasoAngle >= 96) nasolabialVal = FacialTaxonomy.nasolabialAngle[1];
    else if (nasoAngle >= 90) nasolabialVal = FacialTaxonomy.nasolabialAngle[0];
    else if (nasoAngle >= 80) nasolabialVal = FacialTaxonomy.nasolabialAngle[2];
    else nasolabialVal = FacialTaxonomy.nasolabialAngle[4];
    evaluatedTraits.push({ category: "Ángulo Nasolabial", value: nasolabialVal });

    // 7. GROSOR DE LABIOS
    const normLipHeight = normDist(upperLipTop, lowerLipBottom);
    const lipRatio = normLipHeight / (normMouthWidth || 1);
    let lipThicknessVal = "";
    if (lipRatio > 0.45) lipThicknessVal = FacialTaxonomy.lipThickness[3];
    else if (lipRatio > 0.35) lipThicknessVal = FacialTaxonomy.lipThickness[1];
    else if (lipRatio > 0.25) lipThicknessVal = FacialTaxonomy.lipThickness[0];
    else lipThicknessVal = FacialTaxonomy.lipThickness[5];
    evaluatedTraits.push({ category: "Grosor de los Labios", value: lipThicknessVal });

    // 8. FORMA DE MANDÍBULA
    let jawShapeVal = "";
    if (gender === 'female') {
      if (normJawWidth < normFaceWidth * 0.72) jawShapeVal = FacialTaxonomy.jawShapeFemale[0];
      else if (normJawWidth < normFaceWidth * 0.78) jawShapeVal = FacialTaxonomy.jawShapeFemale[2];
      else if (normJawWidth < normFaceWidth * 0.84) jawShapeVal = FacialTaxonomy.jawShapeFemale[3];
      else jawShapeVal = FacialTaxonomy.jawShapeFemale[5];
    } else {
      if (normJawWidth > normFaceWidth * 0.85) jawShapeVal = FacialTaxonomy.jawShapeMale[0];
      else if (normJawWidth > normFaceWidth * 0.78) jawShapeVal = FacialTaxonomy.jawShapeMale[3];
      else jawShapeVal = FacialTaxonomy.jawShapeMale[1];
    }
    evaluatedTraits.push({ category: "Forma de la Mandíbula", value: jawShapeVal });

    // 9. PROMINENCIA DE PÓMULOS
    let cheekboneVal = "";
    if (cheekRatio > 1.32) cheekboneVal = FacialTaxonomy.cheekboneProminence[0];
    else if (cheekRatio > 1.25) cheekboneVal = FacialTaxonomy.cheekboneProminence[1];
    else if (cheekRatio > 1.18) cheekboneVal = FacialTaxonomy.cheekboneProminence[2];
    else cheekboneVal = FacialTaxonomy.cheekboneProminence[3];
    evaluatedTraits.push({ category: "Pómulos (Cigomático)", value: cheekboneVal });

    // 10. REGLA DE LOS QUINTOS
    let fifthsVal = "";
    if (fifthRatio >= 0.95 && fifthRatio <= 1.05) fifthsVal = FacialTaxonomy.fifthProportion[0];
    else if (fifthRatio < 0.95) fifthsVal = FacialTaxonomy.fifthProportion[1];
    else fifthsVal = FacialTaxonomy.fifthProportion[2];
    evaluatedTraits.push({ category: "Proporción de Quintos", value: fifthsVal });

    // 11. SIMETRÍA BILATERAL
    const distL = normDist(leftCheek, noseTip);
    const distR = normDist(rightCheek, noseTip);
    const symmDiff = Math.abs(distL - distR) / (normFaceWidth || 1);
    let symmetryVal = "";
    if (symmDiff < 0.02) symmetryVal = FacialTaxonomy.facialSymmetry[0];
    else if (symmDiff < 0.05) symmetryVal = FacialTaxonomy.facialSymmetry[1];
    else symmetryVal = FacialTaxonomy.facialSymmetry[2];
    evaluatedTraits.push({ category: "Simetría Facial", value: symmetryVal });

    // 12. TERCIOS FACIALES
    const normUpperT = normDist(topHead, eyebrowLeftInner);
    const normMiddleT = normDist(eyebrowLeftInner, subnasale);
    const normLowerT = normDist(subnasale, chin);
    const normTotalT = normUpperT + normMiddleT + normLowerT || 1;

    const uPct = Math.round((normUpperT / normTotalT) * 100);
    const mPct = Math.round((normMiddleT / normTotalT) * 100);
    const lPct = Math.round((normLowerT / normTotalT) * 100);
    evaluatedTraits.push({ category: "Tercios Faciales", value: `${uPct}% - ${mPct}% - ${lPct}%` });

    this.traitsData = evaluatedTraits;
    this.updateUI();
  },

  updateUI() {
    const container = document.getElementById('traits-list');
    if (!container || !this.traitsData) return;

    container.innerHTML = this.traitsData.map((item, idx) => `
      <div class="flex justify-between items-center py-1.5 border-b border-slate-800 text-xs">
        <span class="text-slate-400 font-medium">${idx + 1}. ${item.category}:</span>
        <span class="text-amber-300 font-semibold text-right pl-2">${item.value}</span>
      </div>
    `).join('');
  }
};
