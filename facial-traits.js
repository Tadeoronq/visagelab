// facial-traits.js - Módulo de Evaluación Biométrica y Morfopsicológica con Gradación Fina

const FacialTraitsModule = {
  traitsData: null,
  currentAge: 25,
  currentGender: 'male',

  analyze(landmarks, canvasWidth, canvasHeight, gender = 'male', age = 25) {
    if (!landmarks || landmarks.length < 468) return;
    
    this.currentGender = gender;
    this.currentAge = age;

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

    // Unidad de Normalización (Distancia Intercantal)
    const eyeLeftInner = getPt(133);
    const eyeRightInner = getPt(362);
    const intercanthalUnit = dist2D(eyeLeftInner, eyeRightInner);
    if (intercanthalUnit < 5) return;

    const normDist = (p1, p2) => dist2D(p1, p2) / intercanthalUnit;

    // Landmarks Anatómicos
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

    // Ratios Cefalométricos
    const normFaceLength = normDist(topHead, chin);
    const normFaceWidth = normDist(leftCheek, rightCheek);
    const normJawWidth = normDist(leftJaw, rightJaw);
    const normMouthWidth = normDist(mouthLeft, mouthRight);
    const normEyeWidthAvg = (normDist(eyeLeftOuter, eyeLeftInner) + normDist(eyeRightOuter, eyeRightInner)) / 2;

    const ratioLW = normFaceLength / (normFaceWidth || 1);
    const cheekRatio = normFaceWidth / (normJawWidth || 1);
    const fifthRatio = normFaceWidth / (normEyeWidthAvg * 5 || 1);

    const evaluatedTraits = [];

    // 1. FORMA DEL ROSTRO (Gradación Extendida)
    let faceShapeVal = "";
    if (ratioLW > 1.48) {
      faceShapeVal = "Oblongo / Leptoprosopo Alargado";
    } else if (ratioLW > 1.38) {
      faceShapeVal = "Ovalado Balanceado Clásico";
    } else if (ratioLW > 1.25) {
      faceShapeVal = normJawWidth > normFaceWidth * 0.82 ? "Rectangular / Cuadrado Suave" : "Ovalado Ancho";
    } else if (ratioLW > 1.12) {
      faceShapeVal = normFaceWidth > normJawWidth * 1.25 ? "Diamante / Cigomático Dominante" : "Redondo Equilibrado";
    } else {
      faceShapeVal = "Euriprosopo / Corto y Ancho (Braquicéfalo)";
    }
    evaluatedTraits.push({ category: "Forma del Rostro", value: faceShapeVal });

    // 2. INCLINACIÓN DE LA FRENTE
    const frontoSlopeDeg = angle3D(topHead, glabella, noseBridge);
    let foreheadVal = "";
    if (frontoSlopeDeg > 89) {
      foreheadVal = "Ortometópica / Vertical Recta";
    } else if (frontoSlopeDeg > 85) {
      foreheadVal = "Levemente Inclinada / Natural";
    } else if (frontoSlopeDeg > 80) {
      foreheadVal = "Inclinación Moderada (Fugaz Sutil)";
    } else {
      foreheadVal = "Pronunciadamente Inclinada / Fugaz";
    }
    evaluatedTraits.push({ category: "Inclinación de la Frente", value: foreheadVal });

    // 3. ARCO SUPERCILIAR
    const normBrowZDiff = (glabella.z - getPt(105).z) / intercanthalUnit;
    let browRidgeVal = "";
    if (normBrowZDiff > 0.18) {
      browRidgeVal = "Toro Supraorbitario Muy Pronunciado";
    } else if (normBrowZDiff > 0.10) {
      browRidgeVal = "Prominencia Supraorbitaria Moderada";
    } else if (normBrowZDiff > 0.04) {
      browRidgeVal = "Arco Superciliar Definido Sutil";
    } else {
      browRidgeVal = "Plano / Suave sin Prominencia Ósea";
    }
    evaluatedTraits.push({ category: "Arco Superciliar", value: browRidgeVal });

    // 4. INCLINACIÓN DE LOS OJOS (Gradación de 5 niveles)
    const eyeTiltDeg = ((eyeLeftInner.y - eyeLeftOuter.y) / (normEyeWidthAvg * intercanthalUnit || 1)) * 10;
    let eyeTiltVal = "";
    if (eyeTiltDeg > 4.5) {
      eyeTiltVal = "Ascendente Pronunciada (Antimongoloide Marcada)";
    } else if (eyeTiltDeg > 1.5) {
      eyeTiltVal = "Ascendente Moderada / Almendrada Sutil";
    } else if (eyeTiltDeg >= -1.5) {
      eyeTiltVal = "Horizontal / Neutra Simétrica";
    } else if (eyeTiltDeg >= -4.5) {
      eyeTiltVal = "Descendente Leve";
    } else {
      eyeTiltVal = "Descendente Pronunciada (Mongoloide)";
    }
    evaluatedTraits.push({ category: "Inclinación de los Ojos", value: eyeTiltVal });

    // 5. PROFUNDIDAD DEL OJO
    const normEyeDepthZ = (((eyeLeftInner.z + eyeRightInner.z) / 2) - noseBridge.z) / intercanthalUnit;
    let eyeDepthVal = "";
    if (normEyeDepthZ < -0.25) {
      eyeDepthVal = "Hundidos / Profundos en órbita";
    } else if (normEyeDepthZ < -0.10) {
      eyeDepthVal = "Semihundidos de Profundidad Media";
    } else if (normEyeDepthZ <= 0.05) {
      eyeDepthVal = "Normo-posicionados / Neutros";
    } else {
      eyeDepthVal = "Exoftálmicos / Protruyentes";
    }
    evaluatedTraits.push({ category: "Profundidad del Ojo", value: eyeDepthVal });

    // 6. ÁNGULO NASOLABIAL (Gradación de 5 niveles)
    const nasoAngle = angle3D(noseBridge, subnasale, upperLipTop);
    let nasolabialVal = "";
    if (nasoAngle >= 105) {
      nasolabialVal = "Hiperextendido / Proclive (Muy abierto)";
    } else if (nasoAngle >= 96) {
      nasolabialVal = "Levemente Abierto / Perfil Dinámico";
    } else if (nasoAngle >= 90) {
      nasolabialVal = "Normo-posicionado (Recto / Neutro)";
    } else if (nasoAngle >= 82) {
      nasolabialVal = "Levemente Cerrado / Retrusivo";
    } else {
      nasolabialVal = "Cerrado / Agudo (Soporte columelar marcado)";
    }
    evaluatedTraits.push({ category: "Ángulo Nasolabial", value: nasolabialVal });

    // 7. GROSOR DE LABIOS
    const normLipHeight = normDist(upperLipTop, lowerLipBottom);
    const lipRatio = normLipHeight / (normMouthWidth || 1);
    let lipThicknessVal = "";
    if (lipRatio > 0.42) {
      lipThicknessVal = "Gruesos / Hipertróficos prominentes";
    } else if (lipRatio > 0.32) {
      lipThicknessVal = "Medios / Carnosos balanceados";
    } else if (lipRatio > 0.22) {
      lipThicknessVal = "Delgados / Ffinos definidos";
    } else {
      lipThicknessVal = "Muy delgados / Lineales";
    }
    evaluatedTraits.push({ category: "Grosor de los Labios", value: lipThicknessVal });

    // 8. FORMA DE MANDÍBULA
    let jawShapeVal = "";
    if (normJawWidth > normFaceWidth * 0.84) {
      jawShapeVal = "Gonion Ancho / Mandíbula Cuadrada Dominante";
    } else if (normJawWidth > normFaceWidth * 0.75) {
      jawShapeVal = "Mandíbula Angular Equilibrada";
    } else {
      jawShapeVal = "Mandíbula Estrecha / Perfil Afilado";
    }
    evaluatedTraits.push({ category: "Forma de la Mandíbula", value: jawShapeVal });

    // 9. PROMINENCIA DE PÓMULOS
    let cheekboneVal = "";
    if (cheekRatio > 1.30) {
      cheekboneVal = "Cigomáticos Muy Prominentes / Exaltados";
    } else if (cheekRatio > 1.18) {
      cheekboneVal = "Pómulos Definidos de Rango Medio";
    } else {
      cheekboneVal = "Cigomáticos Planos / Lineales";
    }
    evaluatedTraits.push({ category: "Pómulos (Cigomático)", value: cheekboneVal });

    // 10. REGLA DE LOS QUINTOS
    let fifthsVal = "";
    if (fifthRatio >= 0.94 && fifthRatio <= 1.06) {
      fifthsVal = "Proporción Pentapartita Armónica Ideal";
    } else if (fifthRatio < 0.94) {
      fifthsVal = "Distancia Interocular Estrecha / Concentrada";
    } else {
      fifthsVal = "Distancia Interocular Amplia / Hipertelorismo leve";
    }
    evaluatedTraits.push({ category: "Proporción de Quintos", value: fifthsVal });

    // 11. SIMETRÍA BILATERAL
    const distL = normDist(leftCheek, noseTip);
    const distR = normDist(rightCheek, noseTip);
    const symmDiff = Math.abs(distL - distR) / (normFaceWidth || 1);
    let symmetryVal = "";
    if (symmDiff < 0.015) {
      symmetryVal = "Simetría Bilateral de Alta Precisión (< 1.5%)";
    } else if (symmDiff < 0.04) {
      symmetryVal = "Simetría Anatómica Normal / Balanceada";
    } else {
      symmetryVal = "Asimetría Facial Leve Observable";
    }
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
